import { verifyProcess } from './Process.js';
import { verifyHttp } from './Http.js';

export async function verify(sandbox, config) {
  if (!sandbox || !config || !config.type) {
    return {
      success: false,
      status: 'INVALID_CONFIGURATION',
      exitCode: null,
      stdout: '',
      stderr: 'Missing sandbox or verifier type in configuration',
      durationMs: 0
    };
  }

  if (config.type === 'process') {
    return verifyProcess({
      sandbox,
      command: config.command,
      expectedExitCode: config.expectedExitCode,
      timeoutMs: config.timeoutMs
    });
  } else if (config.type === 'http') {
    return verifyHttp({
      sandbox,
      startCommand: config.startCommand,
      url: config.url,
      expectedStatus: config.expectedStatus,
      timeoutMs: config.timeoutMs,
      pollIntervalMs: config.pollIntervalMs
    });
  } else {
    return {
      success: false,
      status: 'INVALID_CONFIGURATION',
      exitCode: null,
      stdout: '',
      stderr: `Unknown verifier type: ${config.type}`,
      durationMs: 0
    };
  }
}
