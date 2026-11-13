import test from 'node:test';
import assert from 'node:assert';
import { verify } from '../src/verifier/index.js';

test('Phase 2 — Multi-Check Deterministic Verification Suite', async (t) => {
  await t.test('single process check backward compatibility', async () => {
    const mockSandbox = {
      execute: async (cmd) => {
        if (cmd === 'npm test') return { exit_code: 0, stdout: 'pass', stderr: '' };
        return { exit_code: 1, stdout: '', stderr: 'fail' };
      },
    };

    const passRes = await verify(mockSandbox, {
      type: 'process',
      command: 'npm test',
      expectedExitCode: 0,
    });
    assert.strictEqual(passRes.success, true);
    assert.strictEqual(passRes.status, 'SUCCESS');

    const failRes = await verify(mockSandbox, {
      type: 'process',
      command: 'npm run lint',
      expectedExitCode: 0,
    });
    assert.strictEqual(failRes.success, false);
    assert.strictEqual(failRes.status, 'NON_ZERO_EXIT');
  });

  await t.test('http check accepts startCommand or command (DEV-03 compatibility)', async () => {
    let capturedArgs = [];
    const mockSandbox = {
      executeArgs: async (script, args) => {
        capturedArgs.push({ script, args });
        if (script.includes('command -v')) {
          return { exit_code: 0, stdout: 'curl', stderr: '' };
        }
        if (script.includes('CMD_B64')) {
          // start server script
          return { exit_code: 0, stdout: '12345', stderr: '' };
        }
        if (script.includes('CHECK_EXIT_SCRIPT')) {
          return { exit_code: 0, stdout: '', stderr: '' };
        }
        if (script.includes('curl -s')) {
          return { exit_code: 0, stdout: '200', stderr: '' };
        }
        return { exit_code: 0, stdout: '', stderr: '' };
      },
    };

    // 1. Using config.startCommand
    const res1 = await verify(mockSandbox, {
      type: 'http',
      startCommand: 'node index.js',
      url: 'http://localhost:8080',
      expectedStatus: 200,
      timeoutMs: 1000,
    });
    assert.strictEqual(res1.success, true);

    // 2. Using config.command (as DEV-03 originally specified)
    capturedArgs = [];
    const res2 = await verify(mockSandbox, {
      type: 'http',
      command: 'node index.js',
      url: 'http://localhost:8080',
      expectedStatus: 200,
      timeoutMs: 1000,
    });
    assert.strictEqual(res2.success, true);
  });

  await t.test('runs multiple checks sequentially and succeeds when all checks pass', async () => {
    const executed = [];
    const mockSandbox = {
      execute: async (cmd) => {
        executed.push(cmd);
        return { exit_code: 0, stdout: `output of ${cmd}`, stderr: '' };
      },
    };

    const multiConfig = {
      type: 'multi',
      checks: [
        { type: 'process', command: 'npm run build', name: 'build_step' },
        { type: 'process', command: 'npm test', name: 'test_step' },
        { type: 'process', command: 'npm run lint', name: 'lint_step' },
      ],
    };

    const result = await verify(mockSandbox, multiConfig);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.strictEqual(result.passedCount, 3);
    assert.strictEqual(result.totalCount, 3);
    assert.strictEqual(executed.length, 3);
    assert.deepStrictEqual(executed, ['npm run build', 'npm test', 'npm run lint']);
    assert(result.summary.includes('All 3 verification check(s) passed'));
  });

  await t.test('stops on first failure in multi-check verification by default', async () => {
    const executed = [];
    const mockSandbox = {
      execute: async (cmd) => {
        executed.push(cmd);
        if (cmd === 'npm run build') return { exit_code: 0, stdout: 'build ok', stderr: '' };
        if (cmd === 'npm test') return { exit_code: 1, stdout: '', stderr: '2 tests failed' };
        return { exit_code: 0, stdout: 'lint ok', stderr: '' };
      },
    };

    const multiConfig = [
      { type: 'process', command: 'npm run build', name: 'build' },
      { type: 'process', command: 'npm test', name: 'unit_tests' },
      { type: 'process', command: 'npm run lint', name: 'linter' },
    ];

    const result = await verify(mockSandbox, multiConfig);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'NON_ZERO_EXIT');
    assert.strictEqual(result.failedCheck, 'unit_tests');
    assert.strictEqual(result.passedCount, 1);
    assert.strictEqual(result.totalCount, 3);
    assert.strictEqual(executed.length, 2); // stopped before lint
    assert.match(result.summary, /Verification failed at step: unit_tests/);
  });

  await t.test('handles invalid multi-check configurations safely', async () => {
    const mockSandbox = { execute: async () => ({ exit_code: 0 }) };

    const emptyRes = await verify(mockSandbox, { type: 'multi', checks: [] });
    assert.strictEqual(emptyRes.success, true);
    assert.strictEqual(emptyRes.totalCount, 0);

    const nullRes = await verify(null, { type: 'process', command: 'ls' });
    assert.strictEqual(nullRes.success, false);
    assert.strictEqual(nullRes.status, 'INVALID_CONFIGURATION');
  });
});

