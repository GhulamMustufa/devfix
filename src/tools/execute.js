function createExecuteCommand(sandbox) {
  return async function executeCommand(args) {
    if (!args.command || typeof args.command !== 'string') {
      return { success: false, error: "Invalid command argument." };
    }

    const cmd = args.command.trim();

    // Basic heuristic safety checks (Docker container protects the host, 
    // but we prevent obvious container self-destruction to save agent loops).
    const dangerousPatterns = [
      /rm\s+-r.*?\//,
      /: *\(\) *{ *:|:& *}; *:/, // fork bomb
      />\s*\/dev\/(sda|hda)/,
      /mkfs/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(cmd)) {
        return { success: false, error: "SAFETY_BLOCKED: Command contains obviously destructive patterns." };
      }
    }

    // Execute via sandbox. The sandbox handles timeout and capturing.
    const result = await sandbox.execute(cmd);
    
    // Format the response string for the LLM
    let responseStr = "";
    if (result.timeout) {
      responseStr = `COMMAND_TIMEOUT\ntimeout_seconds: 10\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
    } else if (result.exit_code === 0) {
      responseStr = `COMMAND_SUCCEEDED\nexit_code: 0\nstdout:\n${result.stdout}`;
    } else {
      responseStr = `COMMAND_FAILED\nexit_code: ${result.exit_code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
    }

    return {
      success: result.exit_code === 0,
      exit_code: result.exit_code,
      responseStr,
      raw: result
    };
  };
}

export { createExecuteCommand };
