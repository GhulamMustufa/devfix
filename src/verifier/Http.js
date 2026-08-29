export async function verifyHttp({ sandbox, startCommand, url, expectedStatus = 200, timeoutMs = 10000, pollIntervalMs = 500 }) {
  if (!sandbox || !url) {
    return {
      success: false,
      status: 'INVALID_CONFIGURATION',
      exitCode: null,
      stdout: '',
      stderr: 'Missing sandbox or url',
      durationMs: 0
    };
  }

  // Detect capability
  const detectCmd = `if command -v curl >/dev/null 2>&1; then echo "curl"; elif command -v wget >/dev/null 2>&1; then echo "wget"; elif command -v node >/dev/null 2>&1; then echo "node"; else echo "none"; fi`;
  const detectRes = await sandbox.execute(detectCmd, 2000);
  const client = detectRes.stdout.trim();

  if (client === 'none' || detectRes.exit_code !== 0) {
    return {
      success: false,
      status: 'HTTP_CLIENT_UNAVAILABLE',
      exitCode: null,
      stdout: '',
      stderr: 'No suitable HTTP client found in sandbox (checked curl, wget, node)',
      durationMs: 0
    };
  }

  let probeCmd = '';
  if (client === 'curl') {
    probeCmd = `curl -s -o /dev/null -w "%{http_code}" ${url}`;
  } else if (client === 'wget') {
    probeCmd = `wget -S -q -O /dev/null ${url} 2>&1 | grep -E '^  HTTP' | sed -E 's/.*HTTP\\/[0-9\\.]+ ([0-9]+).*/\\1/' | tail -n 1`;
  } else if (client === 'node') {
    // Node.js fallback for probing HTTP status code
    probeCmd = `URL="${url}" node -e "const u = process.env.URL; const r = require(u.startsWith('https') ? 'https' : 'http').get(u, res => { console.log(res.statusCode); process.exit(0); }); r.on('error', () => { console.log('0'); process.exit(1); }); r.setTimeout(1000, () => { console.log('0'); process.exit(1); })"`;
  }

  const startTime = Date.now();
  let serverPid = null;

  try {
    // Start server if provided
    if (startCommand) {
      // Execute in background and capture exit code to detect crashes
      const scriptContent = `(${startCommand}); echo $? > /tmp/server_exit_code`;
      const base64Content = Buffer.from(scriptContent).toString('base64');
      
      await sandbox.execute(`rm -f /tmp/server_exit_code`, 2000);
      
      const runRes = await sandbox.execute(`echo ${base64Content} | base64 -d > /tmp/run.sh && nohup sh /tmp/run.sh >/dev/null 2>&1 & echo $!`, 2000);
      serverPid = runRes.stdout.trim();
    }

    let status = 'TIMEOUT';
    let success = false;
    let lastStdout = '';
    let lastStderr = '';

    while (Date.now() - startTime < timeoutMs) {
      // Check if server process crashed
      if (serverPid) {
        const checkExit = await sandbox.execute(`cat /tmp/server_exit_code 2>/dev/null`, 2000);
        if (checkExit.stdout.trim() !== '') {
          status = 'EXECUTION_ERROR';
          lastStderr = 'Server process crashed or exited prematurely with code ' + checkExit.stdout.trim();
          break;
        }
      }

      const probeRes = await sandbox.execute(probeCmd, 2000);
      lastStdout = probeRes.stdout.trim();
      lastStderr = probeRes.stderr.trim();
      
      if (probeRes.exit_code === 0 && lastStdout === String(expectedStatus)) {
        status = 'SUCCESS';
        success = true;
        break;
      } else if (probeRes.exit_code === 0 && lastStdout !== String(expectedStatus) && lastStdout !== '' && lastStdout !== '0') {
        // Connected but wrong status
        status = 'HTTP_UNHEALTHY';
      } else if (status !== 'HTTP_UNHEALTHY') {
        // It hasn't connected or is returning 0/failing. Default to TIMEOUT eventually.
        status = 'TIMEOUT';
      }

      await new Promise(r => setTimeout(r, pollIntervalMs));
    }

    return {
      success,
      status: success ? 'SUCCESS' : status,
      exitCode: null,
      stdout: lastStdout,
      stderr: lastStderr,
      durationMs: Date.now() - startTime
    };
  } finally {
    // Ensure cleanup happens even if verification throws
    if (serverPid) {
      await sandbox.execute(`pkill -9 -P ${serverPid} 2>/dev/null || true`, 2000);
      await sandbox.execute(`kill -9 ${serverPid} 2>/dev/null || true`, 2000);
      // Clean up child processes of the shell too if possible, but kill -9 on the shell pid is often enough
      // in alpine, background jobs of the shell are in the same process group, but sh doesn't forward signals.
      // Since it's a sandbox, tearing down the container cleans up everything anyway, but we do best effort here.
      await sandbox.execute(`rm -f /tmp/server_exit_code /tmp/run.sh`, 2000);
    }
  }
}
