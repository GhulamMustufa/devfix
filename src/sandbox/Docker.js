import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

const activeSandboxes = new Set();

// Cleanup handler for SIGINT/SIGTERM
function cleanupAll() {
  for (const name of activeSandboxes) {
    try {
      // Synchronous cleanup for signal handlers
      require('child_process').execSync(`docker rm -f ${name} 2>/dev/null`);
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
    this.name = options.name || `devfix-sandbox-${crypto.randomBytes(4).toString('hex')}`;
    this.image = options.image || 'node:20-alpine';
    this.memory = options.memory || '512m';
    this.cpus = options.cpus || '1.0';
    this.pidsLimit = options.pidsLimit || 100;
    this.workdir = options.workdir || '/app';
    this.defaultTimeout = options.defaultTimeout || 10000;
  }

  async start() {
    activeSandboxes.add(this.name);
    try {
      await execAsync(`docker rm -f ${this.name} 2>/dev/null`);
    } catch (e) {
      // ignore
    }
    const cmd = `docker run -d --name ${this.name} --memory="${this.memory}" --cpus="${this.cpus}" --pids-limit=${this.pidsLimit} --security-opt="no-new-privileges=true" -w ${this.workdir} ${this.image} sleep 360000`;
    await execAsync(cmd);
  }

  async stop() {
    activeSandboxes.delete(this.name);
    try {
      await execAsync(`docker rm -f ${this.name}`);
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
      const execCmd = `docker exec ${this.name} timeout ${timeoutSec} sh -c ${JSON.stringify(command)}`;
      
      // Node fallback timeout slightly larger than container timeout
      const { stdout, stderr } = await execAsync(execCmd, { timeout: timeoutMs + 2000, maxBuffer: 5 * 1024 * 1024 });
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
     return execAsync(`docker exec ${this.name} sh -c ${JSON.stringify(command)}`);
  }
}

export { DockerSandbox };
