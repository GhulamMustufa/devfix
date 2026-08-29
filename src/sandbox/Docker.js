import { execFile, execSync } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

const activeSandboxes = new Set();

// Cleanup handler for SIGINT/SIGTERM
function cleanupAll() {
  for (const name of activeSandboxes) {
    try {
      // Synchronous cleanup for signal handlers
      execSync(`docker rm -f ${name} 2>/dev/null`);
    } catch (e) {
      // ignore
    }
  }
}
process.on('SIGINT', () => { cleanupAll(); process.exit(1); });
process.on('SIGTERM', () => { cleanupAll(); process.exit(1); });
process.on('exit', cleanupAll);

class DockerSandbox {
  constructor(options = {}) {
    this.name = options.name || `devfix-sandbox-${randomBytes(4).toString('hex')}`;
    this.image = options.image || 'node:20-alpine';
    this.memory = options.memory || '512m';
    this.cpus = options.cpus || '1.0';
    this.pidsLimit = options.pidsLimit || 100;
    this.workdir = options.workdir || '/app';
    this.defaultTimeout = options.defaultTimeout || 10000;
    this.hostMountPath = options.hostMountPath || null;
  }

  async start() {
    activeSandboxes.add(this.name);
    try {
      await execFileAsync('docker', ['rm', '-f', this.name]);
    } catch (e) {
      // ignore
    }

    let volumeArgs = [];
    if (this.hostMountPath) {
      const absPath = path.resolve(this.hostMountPath);
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

      volumeArgs = ['-v', `${realPath}:${this.workdir}`];
    }

    const args = [
      'run', '-d',
      '--name', this.name,
      `--memory=${this.memory}`,
      `--cpus=${this.cpus}`,
      `--pids-limit=${this.pidsLimit}`,
      '--security-opt=no-new-privileges=true',
      ...volumeArgs,
      '-w', this.workdir,
      this.image,
      'sleep', '360000'
    ];
    await execFileAsync('docker', args);
  }

  async stop() {
    activeSandboxes.delete(this.name);
    try {
      await execFileAsync('docker', ['rm', '-f', this.name]);
    } catch (e) {
      // ignore
    }
  }

  async execute(command, timeoutMs = this.defaultTimeout) {
    const start = Date.now();
    try {
      // Use 'timeout' inside the container to reliably kill the process and return 124.
      // If we only use Node's timeout, docker exec detaches and leaves the process running.
      const timeoutSec = Math.ceil(timeoutMs / 1000);
      const args = ['exec', this.name, 'timeout', String(timeoutSec), 'sh', '-c', command];
      
      // Node fallback timeout slightly larger than container timeout
      const { stdout, stderr } = await execFileAsync('docker', args, { timeout: timeoutMs + 2000, maxBuffer: 5 * 1024 * 1024 });
      return {
        exit_code: 0,
        stdout,
        stderr,
        timeout: false,
        duration_ms: Date.now() - start
      };
    } catch (err) {
      // 124 (timeout command in some distributions), 137 (SIGKILL), 143 (SIGTERM)
      const isTimeout = err.code === 124 || err.code === 137 || err.code === 143 || (err.killed && err.signal === 'SIGTERM');
      return {
        exit_code: err.code || (isTimeout ? 124 : 1),
        stdout: err.stdout || '',
        stderr: err.stderr || err.message,
        timeout: isTimeout,
        duration_ms: Date.now() - start
      };
    }
  }

  // Used to populate initial state (e.g. benchmark setup)
  async executeHostCommand(command) {
     const args = ['exec', this.name, 'sh', '-c', command];
     return execFileAsync('docker', args);
  }

  // Execute a command in the background (detached)
  async executeDetached(command) {
     const args = ['exec', '-d', this.name, 'sh', '-c', command];
     return execFileAsync('docker', args);
  }
}

export { DockerSandbox };
