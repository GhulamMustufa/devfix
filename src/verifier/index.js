import { verifyProcess } from './Process.js';
import { verifyHttp } from './Http.js';

async function verifySingle(sandbox, config) {
  if (!sandbox || !config || !config.type) {
    return {
      success: false,
      status: 'INVALID_CONFIGURATION',
      exitCode: null,
      stdout: '',
      stderr: 'Missing sandbox or verifier type in configuration',
      durationMs: 0,
    };
  }

  if (config.type === 'process') {
    return verifyProcess({
      sandbox,
      command: config.command,
      expectedExitCode: config.expectedExitCode,
      timeoutMs: config.timeoutMs,
    });
  } else if (config.type === 'http') {
    return verifyHttp({
      sandbox,
      startCommand: config.startCommand || config.command,
      url: config.url,
      expectedStatus: config.expectedStatus,
      timeoutMs: config.timeoutMs,
      pollIntervalMs: config.pollIntervalMs,
    });
  } else {
    return {
      success: false,
      status: 'INVALID_CONFIGURATION',
      exitCode: null,
      stdout: '',
      stderr: `Unknown verifier type: ${config.type}`,
      durationMs: 0,
    };
  }
}

async function verifyMulti(sandbox, checks, options = {}) {
  const stopOnFirstFailure = options.stopOnFirstFailure !== false;
  const results = [];
  let overallSuccess = true;
  let firstFailure = null;
  const totalDurationStart = Date.now();

  for (let idx = 0; idx < checks.length; idx++) {
    const checkConfig = checks[idx];
    const checkName = checkConfig.name || checkConfig.command || checkConfig.url || `check_${idx + 1}`;
    const checkResult = await verifySingle(sandbox, checkConfig);

    results.push({
      name: checkName,
      ...checkResult,
    });

    if (!checkResult.success) {
      overallSuccess = false;
      if (!firstFailure) {
        firstFailure = { name: checkName, ...checkResult };
      }
      if (stopOnFirstFailure) {
        break;
      }
    }
  }

  const passedCount = results.filter((r) => r.success).length;
  const totalCount = checks.length;
  const totalDurationMs = Date.now() - totalDurationStart;

  if (overallSuccess) {
    return {
      success: true,
      status: 'SUCCESS',
      passedCount,
      totalCount,
      summary: `All ${totalCount} verification check(s) passed`,
      results,
      durationMs: totalDurationMs,
    };
  }

  return {
    success: false,
    status: firstFailure ? firstFailure.status : 'VERIFICATION_FAILED',
    failedCheck: firstFailure ? firstFailure.name : 'unknown',
    passedCount,
    totalCount,
    summary: `Verification failed at step: ${firstFailure ? firstFailure.name : 'unknown'} (${passedCount}/${totalCount} passed)`,
    stdout: firstFailure ? firstFailure.stdout : '',
    stderr: firstFailure ? firstFailure.stderr : '',
    results,
    durationMs: totalDurationMs,
  };
}

export async function verify(sandbox, config) {
  if (!sandbox || !config) {
    return {
      success: false,
      status: 'INVALID_CONFIGURATION',
      exitCode: null,
      stdout: '',
      stderr: 'Missing sandbox or verifier configuration',
      durationMs: 0,
    };
  }

  // Multi-check array or config with checks
  if (Array.isArray(config)) {
    return verifyMulti(sandbox, config);
  }
  if (config.type === 'multi' || config.type === 'suite' || Array.isArray(config.checks)) {
    const checks = Array.isArray(config.checks) ? config.checks : [];
    return verifyMulti(sandbox, checks, config);
  }

  // Single-check configuration (process or http)
  return verifySingle(sandbox, config);
}
