import { resolveSandboxPath, isSensitiveSandboxPath, runSandboxScript } from './utils.js';

const PATCH_FILE_SCRIPT = `
TARGET="$1"
START_LINE="$2"
END_LINE="$3"
REPL_B64="$4"

REAL=$(readlink -f "$TARGET" 2>/dev/null || true)
if [ -z "$REAL" ]; then
  echo "FILE_NOT_FOUND" >&2
  exit 1
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

TOTAL_LINES=$(awk 'END{print NR}' "$REAL")
if [ "$TOTAL_LINES" -eq 0 ] && [ "$START_LINE" -eq 1 ]; then
  :
elif [ "$START_LINE" -gt "$TOTAL_LINES" ]; then
  echo "LINE_OUT_OF_BOUNDS: start_line ($START_LINE) exceeds file length ($TOTAL_LINES)" >&2
  exit 1
fi

PERMS=$(stat -c %a "$REAL" 2>/dev/null || echo "644")
REPL_FILE=$(mktemp /tmp/devfix_repl_XXXXXX)
OUT_FILE=$(mktemp /tmp/devfix_out_XXXXXX)
cleanup() {
  rm -f "$REPL_FILE" "$OUT_FILE"
}
trap cleanup EXIT

printf '%s' "$REPL_B64" | base64 -d > "$REPL_FILE"

awk -v start="$START_LINE" -v end="$END_LINE" -v rfile="$REPL_FILE" '
BEGIN {
  repl = ""
  first = 1
  while ((getline line < rfile) > 0) {
    if (!first) repl = repl "\\n"
    repl = repl line
    first = 0
  }
  close(rfile)
}
NR < start { print; next }
NR == start { print repl; next }
NR > end { print; next }
END {
  if (NR == 0 && start == 1) {
    print repl
  }
}
' "$REAL" > "$OUT_FILE"

cat "$OUT_FILE" > "$REAL"
chmod "$PERMS" "$REAL"
`;

function createPatchFile(sandbox, options = {}) {
  const allowSensitiveFiles = Boolean(options.allowSensitiveFiles);

  return async function patchFile(args) {
    if (!args || !args.filepath || typeof args.filepath !== 'string') {
      return { success: false, responseStr: JSON.stringify({ success: false, error: 'Missing filepath' }) };
    }

    if (
      !Number.isInteger(args.start_line) ||
      !Number.isInteger(args.end_line) ||
      args.start_line > args.end_line ||
      args.start_line < 1
    ) {
      return { success: false, responseStr: JSON.stringify({ success: false, error: 'Invalid line range' }) };
    }

    if (typeof args.replacement !== 'string') {
      return { success: false, responseStr: JSON.stringify({ success: false, error: 'Missing replacement text' }) };
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
          error: 'ACCESS_DENIED: Modifying sensitive credential or environment files is blocked by default.',
        }),
      };
    }

    const replB64 = Buffer.from(args.replacement, 'utf8').toString('base64');
    const result = await runSandboxScript(
      sandbox,
      PATCH_FILE_SCRIPT,
      [resolvedPath, String(args.start_line), String(args.end_line), replB64],
      5000
    );

    if (result.exit_code === 0) {
      return {
        success: true,
        responseStr: JSON.stringify({
          success: true,
          filepath: args.filepath,
          changed: true,
          message: 'File patched successfully inside sandbox.',
        }),
        raw: result,
      };
    } else {
      return {
        success: false,
        responseStr: JSON.stringify({
          success: false,
          error: (result.stderr || result.stdout || 'Failed to patch file.').trim(),
        }),
        raw: result,
      };
    }
  };
}

export { createPatchFile };
