import { resolveSandboxPath, isSensitiveSandboxPath, runSandboxScript } from './utils.js';

const READ_FILE_SCRIPT = `
TARGET="$1"
REAL=$(readlink -f "$TARGET" 2>/dev/null || true)
if [ -z "$REAL" ]; then
  if [ ! -e "$TARGET" ]; then
    echo "FILE_NOT_FOUND" >&2
    exit 1
  fi
  REAL="$TARGET"
fi
case "$REAL" in
  /app/*) ;;
  *)
    echo "SYMLINK_ESCAPE: Path resolves outside /app" >&2
    exit 1
    ;;
esac
if [ ! -f "$REAL" ]; then
  echo "FILE_NOT_FOUND" >&2
  exit 1
fi
head -c 1000000 "$REAL"
`;

function createReadFile(sandbox, options = {}) {
  const allowSensitiveFiles = Boolean(options.allowSensitiveFiles);

  return async function readFile(args) {
    if (!args || !args.filepath || typeof args.filepath !== 'string') {
      return { success: false, responseStr: JSON.stringify({ success: false, error: 'Missing filepath' }) };
    }

    let resolvedPath;
    try {
      resolvedPath = resolveSandboxPath(args.filepath);
    } catch (err) {
      return { success: false, responseStr: JSON.stringify({ success: false, error: err.message }) };
    }

    if (!allowSensitiveFiles && isSensitiveSandboxPath(resolvedPath)) {
      return {
        success: false,
        responseStr: JSON.stringify({
          success: false,
          error: 'ACCESS_DENIED: Reading sensitive credential or environment files is blocked by default.',
        }),
      };
    }

    const result = await runSandboxScript(sandbox, READ_FILE_SCRIPT, [resolvedPath], 5000);

    if (result.exit_code === 0) {
      return {
        success: true,
        responseStr: JSON.stringify({ success: true, filepath: args.filepath, content: result.stdout }),
        raw: result,
      };
    } else {
      return {
        success: false,
        responseStr: JSON.stringify({
          success: false,
          error: (result.stderr || result.stdout || 'Failed to read file').trim(),
        }),
        raw: result,
      };
    }
  };
}

export { createReadFile };
