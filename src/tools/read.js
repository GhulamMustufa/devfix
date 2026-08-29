import { resolveSandboxPath } from './utils.js';

function createReadFile(sandbox) {
  return async function readFile(args) {
    if (!args.filepath || typeof args.filepath !== 'string') {
      return { success: false, responseStr: JSON.stringify({ success: false, error: "Missing filepath" }) };
    }

    let resolvedPath;
    try {
      resolvedPath = resolveSandboxPath(args.filepath);
    } catch (err) {
      return { success: false, responseStr: JSON.stringify({ success: false, error: err.message }) };
    }

    // Read up to 1MB to prevent memory explosion.
    const cmd = `if [ ! -f ${resolvedPath} ]; then echo "FILE_NOT_FOUND" >&2; exit 1; fi; head -c 1000000 ${resolvedPath}`;
    
    const result = await sandbox.execute(cmd, 5000);
    
    if (result.exit_code === 0) {
      return {
        success: true,
        responseStr: JSON.stringify({ success: true, filepath: args.filepath, content: result.stdout }),
        raw: result
      };
    } else {
      return {
        success: false,
        responseStr: JSON.stringify({ success: false, error: result.stderr.trim() || result.stdout.trim() }),
        raw: result
      };
    }
  };
}

export { createReadFile };
