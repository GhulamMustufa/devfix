import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

const activeSandboxes = new Set();
const SAFE_CONTAINER_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

function cleanupAll() {
  for (const name of activeSandboxes) {
    if (!SAFE_CONTAINER_NAME.test(name)) continue;
    try {
      execFileSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
    } catch {
      // ignore cleanup errors
    }
  }
}

process.on('exit', cleanupAll);

function resolveDefaultUser() {
  if (process.platform === 'linux' && typeof process.getuid === 'function' && process.getuid() !== 0) {
    return `${process.getuid()}:${process.getgid()}`;
  }
  return '1000:1000';
}

class DockerSandbox {
  constructor(options = {}) {
    const rawName = options.name || `devfix-sandbox-${randomBytes(4).toString('hex')}`;
    if (!SAFE_CONTAINER_NAME.test(rawName)) {
      throw new Error(`Invalid sandbox container name: ${rawName}`);
    }
    this.name = rawName;
    this.image = options.image || 'node:20-alpine';
    this.memory = options.memory || '512m';
    this.memorySwap = options.memorySwap || this.memory;
    this.cpus = options.cpus || '1.0';
    this.pidsLimit = options.pidsLimit || 100;
    this.workdir = options.workdir || '/app';
    this.defaultTimeout = options.defaultTimeout || 10000;
    this.hostMountPath = options.hostMountPath || null;
    this.allowNetwork = Boolean(options.allowNetwork);
    this.user = options.user || resolveDefaultUser();
  }

  async _validateHostMountPath() {
    if (!this.hostMountPath) return null;

    const absPath = path.resolve(this.hostMountPath);
    if (absPath.includes('docker.sock')) {
      throw new Error('Mounting the Docker socket is prohibited.');
    }

    const stat = await fs.promises.stat(absPath);
    if (!stat.isDirectory()) {
      throw new Error(`Host mount path ${absPath} is not a directory.`);
    }

    const realPath = await fs.promises.realpath(absPath);
    if (realPath === '/') {
      throw new Error('Cannot mount root directory /');
    }
    if (realPath === await fs.promises.realpath(os.homedir())) {
      throw new Error('Cannot mount user home directory wholesale');
    }
    if (realPath.includes('docker.sock')) {
      throw new Error('Mounting the Docker socket is prohibited.');
    }
    return realPath;
  }

  buildRunArgs(realMountPath = null) {
    const args = [
      'run', '-d',
      '--name', this.name,
      '--user', this.user,
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges=true',
      `--memory=${this.memory}`,
      `--memory-swap=${this.memorySwap}`,
      `--cpus=${this.cpus}`,
      `--pids-limit=${this.pidsLimit}`,
      '-e', 'HOME=/tmp',
      '-e', 'npm_config_cache=/tmp/.npm',
    ];

    if (!this.allowNetwork) {
      args.push('--network=none');
    }

    if (realMountPath) {
      args.push('-v', `${realMountPath}:${this.workdir}`);
    }

    args.push('-w', this.workdir, this.image, 'sleep', '360000');
    return args;
  }

  async start() {
    activeSandboxes.add(this.name);
    try {
      await execFileAsync('docker', ['rm', '-f', this.name]);
    } catch {
      // ignore if container does not exist
    }

    const realMountPath = await this._validateHostMountPath();
    const args = this.buildRunArgs(realMountPath);
    await execFileAsync('docker', args);

    // Ensure /app and /tmp are writable by non-root user in ephemeral containers
    if (!realMountPath && this.user !== '0' && this.user !== '0:0' && this.user !== 'root') {
      await execFileAsync('docker', [
        'exec', '-u', '0', this.name, 'sh', '-c',
        'mkdir -p /app /tmp && chown "$1" /app && chmod 1777 /tmp',
        '_', this.user
      ]);
    }
  }

  async stop() {
    activeSandboxes.delete(this.name);
    try {
      await execFileAsync('docker', ['rm', '-f', this.name]);
    } catch {
      // ignore cleanup errors
    }
  }

  async execute(command, timeoutMs = this.defaultTimeout) {
    return this._runExec(['sh', '-c', command], timeoutMs);
  }

  async executeArgs(script, scriptArgs = [], timeoutMs = this.defaultTimeout) {
    return this._runExec(['sh', '-c', script, '_', ...scriptArgs], timeoutMs);
  }

  async _runExec(cmdParts, timeoutMs) {
    const start = Date.now();
    try {
      const timeoutSec = Math.max(1, Math.ceil(timeoutMs / 1000));
      const args = [
        'exec', this.name,
        'timeout', '-k', '2', String(timeoutSec),
        ...cmdParts,
      ];

      const { stdout, stderr } = await execFileAsync('docker', args, {
        timeout: timeoutMs + 3000,
        maxBuffer: 5 * 1024 * 1024,
      });
      return {
        exit_code: 0,
        stdout,
        stderr,
        timeout: false,
        duration_ms: Date.now() - start,
      };
    } catch (err) {
      const isTimeout =
        err.code === 124 ||
        err.code === 137 ||
        err.code === 143 ||
        (err.killed && err.signal === 'SIGTERM');
      return {
        exit_code: err.code || (isTimeout ? 124 : 1),
        stdout: err.stdout || '',
        stderr: err.stderr || err.message,
        timeout: isTimeout,
        duration_ms: Date.now() - start,
      };
    }
  }

  // Used to populate initial state (e.g. benchmark/test setup inside container)
  async executeHostCommand(command, options = {}) {
    const args = ['exec'];
    if (options.asRoot) {
      args.push('-u', '0');
    }
    args.push(this.name, 'sh', '-c', command);
    return execFileAsync('docker', args);
  }

  // Execute a command in the background (detached)
  async executeDetached(command) {
    const args = ['exec', '-d', this.name, 'sh', '-c', command];
    return execFileAsync('docker', args);
  }
}

export { DockerSandbox, cleanupAll };
