import { resolveSandboxPath } from './utils.js';

function createPatchFile(sandbox) {
  return async function patchFile(args) {
    if (!args.filepath || typeof args.filepath !== 'string') {
      return { success: false, responseStr: JSON.stringify({ success: false, error: "Missing filepath" }) };
    }
    
    if (typeof args.start_line !== 'number' || typeof args.end_line !== 'number' || args.start_line > args.end_line || args.start_line < 1) {
      return { success: false, responseStr: JSON.stringify({ success: false, error: "Invalid line range" }) };
    }
    
    if (typeof args.replacement !== 'string') {
       return { success: false, responseStr: JSON.stringify({ success: false, error: "Missing replacement text" }) };
    }

    let resolvedPath;
    try {
      resolvedPath = resolveSandboxPath(args.filepath);
    } catch (err) {
      return { success: false, responseStr: JSON.stringify({ success: false, error: err.message }) };
    }

    const checkCmd = `if [ ! -f ${resolvedPath} ]; then echo "FILE_NOT_FOUND" >&2; exit 1; fi`;
    const checkResult = await sandbox.execute(checkCmd, 2000);
    if (checkResult.exit_code !== 0) {
      return { success: false, responseStr: JSON.stringify({ success: false, error: "FILE_NOT_FOUND" }) };
    }

    await sandbox.execute(`cp ${resolvedPath} ${resolvedPath}.bak`, 2000);

    const permsResult = await sandbox.execute(`stat -c %a ${resolvedPath}`, 2000);
    const perms = permsResult.stdout.trim() || '644';

    const patchCmd = `awk -v start=${args.start_line} -v end=${args.end_line} -v repl=${JSON.stringify(args.replacement)} 'NR < start {print} NR == start {print repl} NR > end {print}' ${resolvedPath} > ${resolvedPath}.tmp && mv ${resolvedPath}.tmp ${resolvedPath} && chmod ${perms} ${resolvedPath}`;
    
    const result = await sandbox.execute(patchCmd, 5000);
    
    if (result.exit_code === 0) {
      return {
        success: true,
        responseStr: JSON.stringify({ success: true, filepath: args.filepath, changed: true, message: "File patched successfully. Backup saved as .bak." }),
        raw: result
      };
    } else {
      return {
        success: false,
        responseStr: JSON.stringify({ success: false, error: result.stderr.trim() || result.stdout.trim() || "Failed to patch file." }),
        raw: result
      };
    }
  };
}

export { createPatchFile };
