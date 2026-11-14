function createExecuteCommand(sandbox) {
  return async function executeCommand(args) {
    if (!args || !args.command || typeof args.command !== 'string') {
      return { success: false, error: 'Invalid command argument.' };
    }

    const cmd = args.command.trim();
    if (!cmd) {
      return { success: false, error: 'Empty command argument.' };
    }

    // Heuristic safety checks inside the container
    const dangerousPatterns = [
      /(?:^|[;&|\s])rm\s+[^\n;|&]*\s+\/(?:app\/?(?:\*)?|\*)?(?:\s|$|[;|&*])/,
      /rm\s+-[a-zA-Z]*[rR][a-zA-Z]*f?\s+\/(?:app\/?(?:\*)?|\*|\s|$)/,
      /:\s*\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, // fork bomb
      />\s*\/dev\/(sda|hda|nvme)/,
      /\bmkfs\b/,
      /\/var\/run\/docker\.sock/,
      /\/etc\/shadow/,
      /\/proc\/[^\s/]+\/environ/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(cmd)) {
        return {
          success: false,
          error: 'SAFETY_BLOCKED: Command contains prohibited or destructive patterns.',
        };
      }
    }

    const result = await sandbox.execute(cmd);
    const timeoutSec = Math.ceil((sandbox.defaultTimeout || 10000) / 1000);

    let responseStr = '';
    if (result.timeout) {
      responseStr = `COMMAND_TIMEOUT\ntimeout_seconds: ${timeoutSec}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
    } else if (result.exit_code === 0) {
      responseStr = `COMMAND_SUCCEEDED\nexit_code: 0\nstdout:\n${result.stdout}`;
    } else {
      responseStr = `COMMAND_FAILED\nexit_code: ${result.exit_code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
    }

    return {
      success: result.exit_code === 0,
      exit_code: result.exit_code,
      responseStr,
      raw: result,
    };
  };
}

export { createExecuteCommand };
