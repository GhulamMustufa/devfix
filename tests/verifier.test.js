import test from 'node:test';
import assert from 'node:assert';
import { DockerSandbox } from '../src/sandbox/Docker.js';
import { verify } from '../src/verifier/index.js';

test('Deterministic Verifier Layer', async (t) => {
  const sandbox = new DockerSandbox({ name: 'verifier-test-sandbox', defaultTimeout: 10000 });
  await sandbox.start();

  await t.test('Dispatcher: invalid/unknown configs', async () => {
    const res1 = await verify(sandbox, null);
    assert.strictEqual(res1.status, 'INVALID_CONFIGURATION');

    const res2 = await verify(sandbox, { type: 'unknown_type' });
    assert.strictEqual(res2.status, 'INVALID_CONFIGURATION');
  });

  await t.test('Process: Healthy command -> PASS', async () => {
    const res = await verify(sandbox, { type: 'process', command: 'echo hello' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'SUCCESS');
    assert.strictEqual(res.exitCode, 0);
  });

  await t.test('Process: Non-zero command -> FAIL', async () => {
    const res = await verify(sandbox, { type: 'process', command: 'exit 1' });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'NON_ZERO_EXIT');
    assert.strictEqual(res.exitCode, 1);
  });

  await t.test('Process: Expected non-zero exit code -> PASS', async () => {
    const res = await verify(sandbox, { type: 'process', command: 'exit 42', expectedExitCode: 42 });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'SUCCESS');
    assert.strictEqual(res.exitCode, 42);
  });

  await t.test('Process: Timeout -> FAIL', async () => {
    const res = await verify(sandbox, { type: 'process', command: 'sleep 3', timeoutMs: 1000 });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'TIMEOUT');
  });

  await t.test('HTTP: Healthy long-running server (Regression test) -> PASS', async () => {
    // Start a simple HTTP server in node returning 200
    const startCmd = `node -e "require('http').createServer((req, res) => { res.writeHead(200); res.end('ok'); }).listen(8080)"`;
    const res = await verify(sandbox, {
      type: 'http',
      startCommand: startCmd,
      url: 'http://127.0.0.1:8080/',
      expectedStatus: 200,
      timeoutMs: 5000,
      pollIntervalMs: 200
    });
    
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'SUCCESS');
    
    // Check if process was cleaned up
    // Wait a little for cleanup
    await new Promise(r => setTimeout(r, 500));
    const checkPs = await sandbox.executeHostCommand('ps | grep "node -e" | grep -v grep || true');
    assert.strictEqual(checkPs.stdout.trim(), '');
  });

  await t.test('HTTP: Wrong HTTP status -> FAIL', async () => {
    const startCmd = `node -e "require('http').createServer((req, res) => { res.writeHead(500); res.end('error'); }).listen(8081)"`;
    const res = await verify(sandbox, {
      type: 'http',
      startCommand: startCmd,
      url: 'http://127.0.0.1:8081/',
      expectedStatus: 200,
      timeoutMs: 2000,
      pollIntervalMs: 200
    });
    
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'HTTP_UNHEALTHY');
  });

  await t.test('HTTP: Connection refused -> FAIL', async () => {
    const res = await verify(sandbox, {
      type: 'http',
      url: 'http://127.0.0.1:8082/', // Nothing listening here
      expectedStatus: 200,
      timeoutMs: 1500,
      pollIntervalMs: 200
    });
    
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'TIMEOUT');
  });

  await t.test('HTTP: Server crash -> FAIL', async () => {
    // A server that exits immediately
    const startCmd = `node -e "process.exit(1)"`;
    const res = await verify(sandbox, {
      type: 'http',
      startCommand: startCmd,
      url: 'http://127.0.0.1:8083/',
      expectedStatus: 200,
      timeoutMs: 2000,
      pollIntervalMs: 200
    });
    
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'EXECUTION_ERROR');
  });

  await t.test('HTTP: Capability failure reported', async () => {
    // Mess up the commands so capability check fails
    await sandbox.executeHostCommand(`mv /usr/bin/wget /usr/bin/wget_bak && mv /usr/local/bin/node /usr/local/bin/node_bak`);
    
    const res = await verify(sandbox, {
      type: 'http',
      url: 'http://127.0.0.1:8084/',
      timeoutMs: 1000
    });
    
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'HTTP_CLIENT_UNAVAILABLE');
    
    // Restore
    await sandbox.executeHostCommand(`mv /usr/bin/wget_bak /usr/bin/wget && mv /usr/local/bin/node_bak /usr/local/bin/node`);
  });

  await sandbox.stop();
});
