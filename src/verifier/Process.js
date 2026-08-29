export async function verifyProcess({ sandbox, command, expectedExitCode = 0, timeoutMs = 5000 }) {
  if (!sandbox || !command) {
    return {
      success: false,
      status: 'INVALID_CONFIGURATION',
      exitCode: null,
      stdout: '',
      stderr: 'Missing sandbox or command',
      durationMs: 0
    };
  }

  const result = await sandbox.execute(command, timeoutMs);

  let status;
  let success = false;

  if (result.timeout) {
    status = 'TIMEOUT';
  } else if (result.exit_code === expectedExitCode) {
    status = 'SUCCESS';
    success = true;
  } else {
    status = 'NON_ZERO_EXIT';
  }

  return {
    success,
    status,
    exitCode: result.exit_code,
    stdout: result.stdout,
    stderr: result.stderr,
    durationMs: result.duration_ms
  };
}
