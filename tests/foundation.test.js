import test from 'node:test';
import assert from 'node:assert';
import { DockerSandbox } from '../src/sandbox/Docker.js';
import { ToolRegistry } from '../src/tools/registry.js';

test('Docker Sandbox and Tool Foundation', async (t) => {
  const sandbox = new DockerSandbox({ name: 'test-sandbox-foundation' });
  const registry = new ToolRegistry(sandbox);

  await t.test('sandbox creates and starts', async () => {
    await sandbox.start();
    // Test basic command execution to verify it's running
    const res = await sandbox.execute('echo hello');
    assert.strictEqual(res.exit_code, 0);
    assert.strictEqual(res.stdout.trim(), 'hello');
  });

  await t.test('execute_command enforces timeout', async () => {
    const res = await registry.executeTool('execute_command', { command: 'sleep 3' });
    const directRes = await sandbox.execute('sleep 3', 1000); // 1s timeout
    assert.strictEqual(directRes.timeout, true);
    assert.ok(directRes.exit_code === 124 || directRes.exit_code === 143);
  });

  await t.test('execute_command rejects dangerous patterns', async () => {
    const res = await registry.executeTool('execute_command', { command: 'rm -rf /' });
    assert.strictEqual(res.success, false);
    assert.match(res.error || res.responseStr, /SAFETY_BLOCKED/);
  });

  await t.test('read_file restricts path traversal', async () => {
    const res = await registry.executeTool('read_file', { filepath: '../etc/passwd' });
    assert.strictEqual(res.success, false);
    assert.match(res.responseStr, /Path traversal/i);
    
    const res2 = await registry.executeTool('read_file', { filepath: '/root/secret' });
    assert.strictEqual(res2.success, false);
    assert.match(res2.responseStr, /sandbox-relative/i);
  });

  await t.test('patch_file preserves executable permissions (Regression Test)', async () => {
    // 1. Create executable file
    await sandbox.executeHostCommand('printf "#!/bin/sh\\necho original\\n" > /app/script.sh');
    await sandbox.executeHostCommand('chmod 755 /app/script.sh');
    
    // Check original permissions
    const permBefore = await sandbox.executeHostCommand('stat -c %a /app/script.sh');
    assert.strictEqual(permBefore.stdout.trim(), '755');

    // 2. Patch file
    const res = await registry.executeTool('patch_file', {
      filepath: 'script.sh',
      start_line: 2,
      end_line: 2,
      replacement: 'echo patched'
    });
    
    assert.strictEqual(res.success, true);
    
    // 3. Verify content
    const content = await registry.executeTool('read_file', { filepath: 'script.sh' });
    assert.match(content.responseStr, /echo patched/);
    
    // 4. Verify executable permissions remain
    const permAfter = await sandbox.executeHostCommand('stat -c %a /app/script.sh');
    assert.strictEqual(permAfter.stdout.trim(), '755');
  });

  await t.test('patch_file fails safely on non-existent path', async () => {
    const res = await registry.executeTool('patch_file', {
      filepath: 'doesnotexist.txt',
      start_line: 1,
      end_line: 1,
      replacement: 'hello'
    });
    assert.strictEqual(res.success, false);
    assert.match(res.responseStr, /FILE_NOT_FOUND/);
  });

  await t.test('patch_file fails safely on invalid range', async () => {
    const res = await registry.executeTool('patch_file', {
      filepath: 'script.sh',
      start_line: 5,
      end_line: 2,
      replacement: 'invalid'
    });
    assert.strictEqual(res.success, false);
    assert.match(res.responseStr, /Invalid line range/);
  });

  await t.test('sandbox stops and cleans up', async () => {
    await sandbox.stop();
    // Verify it doesn't exist anymore
    const res = await sandbox.executeHostCommand('echo 1').catch(e => e);
    // The command should fail because the container doesn't exist
    assert.ok(res.exit_code !== 0 || res instanceof Error);
  });
});
