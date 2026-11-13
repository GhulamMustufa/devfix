import { randomBytes } from 'crypto';
import { runSandboxScript } from '../tools/utils.js';
import { redactString } from '../security/Redactor.js';

function validateHttpUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
  }
  return parsed.toString();
}

const DETECT_CLIENT_SCRIPT = `
if command -v curl >/dev/null 2>&1; then
  echo "curl"
elif command -v wget >/dev/null 2>&1; then
  echo "wget"
elif command -v node >/dev/null 2>&1; then
  echo "node"
else
  echo "none"
fi
`;

const PROBE_SCRIPTS = {
  curl: `curl -s -o /dev/null -w "%{http_code}" "$1"`,
  wget: `wget -S -q -O /dev/null "$1" 2>&1 | grep -E '^  HTTP' | sed -E 's/.*HTTP\\/[0-9\\.]+ ([0-9]+).*/\\1/' | tail -n 1`,
  node: `node -e "const u = process.argv[1]; const r = require(u.startsWith('https') ? 'https' : 'http').get(u, res => { console.log(res.statusCode); process.exit(0); }); r.on('error', () => { console.log('0'); process.exit(1); }); r.setTimeout(1000, () => { console.log('0'); process.exit(1); })" "$1"`,
};

const START_SERVER_SCRIPT = `
RUN_SCRIPT="$1"
EXIT_FILE="$2"
CMD_B64="$3"
rm -f "$EXIT_FILE"
printf '%s' "$CMD_B64" | base64 -d > "$RUN_SCRIPT"
if command -v setsid >/dev/null 2>&1; then
  nohup setsid sh "$RUN_SCRIPT" >/dev/null 2>&1 &
else
  nohup sh "$RUN_SCRIPT" >/dev/null 2>&1 &
fi
echo $!
`;

const CHECK_EXIT_SCRIPT = `cat "$1" 2>/dev/null || true`;

const CLEANUP_SERVER_SCRIPT = `
SERVER_PID="$1"
RUN_SCRIPT="$2"
EXIT_FILE="$3"
if [ -n "$SERVER_PID" ]; then
  kill -9 -"$SERVER_PID" 2>/dev/null || true
  pkill -9 -P "$SERVER_PID" 2>/dev/null || true
  kill -9 "$SERVER_PID" 2>/dev/null || true
fi
rm -f "$RUN_SCRIPT" "$EXIT_FILE"
`;

export async function verifyHttp({
  sandbox,
  startCommand,
  url,
  expectedStatus = 200,
  timeoutMs = 10000,
  pollIntervalMs = 500,
}) {
  if (!sandbox || !url) {
    return {
      success: false,
      status: 'INVALID_CONFIGURATION',
      exitCode: null,
      stdout: '',
      stderr: 'Missing sandbox or url',
      durationMs: 0,
    };
  }

  let validatedUrl;
  try {
    validatedUrl = validateHttpUrl(url);
  } catch (err) {
    return {
      success: false,
      status: 'INVALID_CONFIGURATION',
      exitCode: null,
      stdout: '',
      stderr: err.message,
      durationMs: 0,
    };
  }

  // Detect capability
  const detectRes = await runSandboxScript(sandbox, DETECT_CLIENT_SCRIPT, [], 2000);
  const client = (detectRes.stdout || '').trim();

  if (client === 'none' || !PROBE_SCRIPTS[client] || detectRes.exit_code !== 0) {
    return {
      success: false,
      status: 'HTTP_CLIENT_UNAVAILABLE',
      exitCode: null,
      stdout: '',
      stderr: 'No suitable HTTP client found in sandbox (checked curl, wget, node)',
      durationMs: 0,
    };
  }

  const probeScript = PROBE_SCRIPTS[client];
  const runTag = randomBytes(4).toString('hex');
  const runScriptPath = `/tmp/devfix_run_${runTag}.sh`;
  const exitFilePath = `/tmp/devfix_exit_${runTag}`;

  const startTime = Date.now();
  let serverPid = null;

  try {
    if (startCommand) {
      const wrapped = `(${startCommand}); echo $? > "${exitFilePath}"`;
      const cmdB64 = Buffer.from(wrapped, 'utf8').toString('base64');
      const runRes = await runSandboxScript(
        sandbox,
        START_SERVER_SCRIPT,
        [runScriptPath, exitFilePath, cmdB64],
        2000
      );
      serverPid = (runRes.stdout || '').trim();
    }

    let status = 'TIMEOUT';
    let success = false;
    let lastStdout = '';
    let lastStderr = '';

    while (Date.now() - startTime < timeoutMs) {
      if (serverPid) {
        const checkExit = await runSandboxScript(sandbox, CHECK_EXIT_SCRIPT, [exitFilePath], 2000);
        const exitVal = (checkExit.stdout || '').trim();
        if (exitVal !== '') {
          status = 'EXECUTION_ERROR';
          lastStderr = 'Server process crashed or exited prematurely with code ' + exitVal;
          break;
        }
      }

      const probeRes = await runSandboxScript(sandbox, probeScript, [validatedUrl], 2000);
      lastStdout = (probeRes.stdout || '').trim();
      lastStderr = (probeRes.stderr || '').trim();

      if (probeRes.exit_code === 0 && lastStdout === String(expectedStatus)) {
        status = 'SUCCESS';
        success = true;
        break;
      } else if (
        probeRes.exit_code === 0 &&
        lastStdout !== String(expectedStatus) &&
        lastStdout !== '' &&
        lastStdout !== '0'
      ) {
        status = 'HTTP_UNHEALTHY';
      } else if (status !== 'HTTP_UNHEALTHY') {
        status = 'TIMEOUT';
      }

      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    return {
      success,
      status: success ? 'SUCCESS' : status,
      exitCode: null,
      stdout: redactString(lastStdout),
      stderr: redactString(lastStderr),
      durationMs: Date.now() - startTime,
    };
  } finally {
    if (serverPid) {
      await runSandboxScript(
        sandbox,
        CLEANUP_SERVER_SCRIPT,
        [serverPid, runScriptPath, exitFilePath],
        2000
      );
    }
  }
}
