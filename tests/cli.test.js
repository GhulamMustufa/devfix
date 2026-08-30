import test from 'node:test';
import assert from 'node:assert';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { TelemetryLogger } from '../src/telemetry/Logger.js';

const execFileAsync = promisify(execFile);
const devfixBin = path.resolve('bin/devfix');

test('CLI Interface', async (t) => {

  await t.test('--help returns usage', async () => {
    const { stdout } = await execFileAsync('node', [devfixBin, '--help']);
    assert(stdout.includes('Usage: devfix'));
    assert(stdout.includes('fix [options] <project>'));
    assert(stdout.includes('demo <case>'));
    assert(stdout.includes('doctor'));
  });

  await t.test('--version returns version', async () => {
    const { stdout } = await execFileAsync('node', [devfixBin, '--version']);
    assert(stdout.includes('1.0.0'));
  });

  await t.test('fix command requires --verify', async () => {
    try {
      await execFileAsync('node', [devfixBin, 'fix', '.']);
      assert.fail('Should have thrown error for missing --verify');
    } catch (e) {
      assert.strictEqual(e.code, 1);
      assert(e.stderr.includes("error: required option '--verify <command>' not specified"));
    }
  });

  await t.test('fix command with invalid path returns code 2', async () => {
    try {
      await execFileAsync('node', [devfixBin, 'fix', './does-not-exist', '--verify', 'npm test']);
      assert.fail('Should have failed');
    } catch (e) {
      assert.strictEqual(e.code, 2);
      assert(e.stderr.includes('Path does not exist'));
    }
  });

  await t.test('fix command with file path returns code 2', async () => {
    try {
      await execFileAsync('node', [devfixBin, 'fix', 'package.json', '--verify', 'npm test']);
      assert.fail('Should have failed');
    } catch (e) {
      assert.strictEqual(e.code, 2);
      assert(e.stderr.includes('Path is not a directory'));
    }
  });

  await t.test('demo command with unknown case returns code 2', async () => {
    try {
      await execFileAsync('node', [devfixBin, 'demo', 'DEV-999']);
      assert.fail('Should have failed');
    } catch (e) {
      assert.strictEqual(e.code, 2);
      assert(e.stderr.includes('Unknown demo case DEV-999'));
    }
  });

});

test('Telemetry Logger', async (t) => {
  const logger = new TelemetryLogger();

  await t.test('scrubs Bearer tokens', () => {
    const input = { header: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.b' };
    const scrubbed = logger.scrub(input);
    assert.strictEqual(scrubbed.header, 'Bearer [REDACTED]');
  });

  await t.test('scrubs OpenAI API keys', () => {
    const input = { message: 'Failed with key sk-proj-1234567890abcdef1234567890abcdef' };
    const scrubbed = logger.scrub(input);
    assert.strictEqual(scrubbed.message, 'Failed with key sk-[REDACTED]');
  });

  await t.test('scrubs sensitive object keys entirely', () => {
    const input = {
      safe_data: 'hello',
      API_KEY: 'super-secret',
      db_password: 'admin',
      oauth_token: '1234'
    };
    const scrubbed = logger.scrub(input);
    assert.strictEqual(scrubbed.safe_data, 'hello');
    assert.strictEqual(scrubbed.API_KEY, '[REDACTED]');
    assert.strictEqual(scrubbed.db_password, '[REDACTED]');
    assert.strictEqual(scrubbed.oauth_token, '[REDACTED]');
  });
});

import TrajectoryGenerator from '../src/telemetry/Trajectory.js';

test('Trajectory Generator', async (t) => {
  await t.test('successful trajectory', () => {
    const md = TrajectoryGenerator.generateMarkdown({
      project: 'DEV-TEST',
      provider: 'TestProvider',
      model: 'TestModel',
      finalStatus: 'SUCCESS',
      durationMs: 1500,
      iterations: 1,
      toolCalls: 1,
      conversation: [
        { role: 'system', content: 'system' },
        { role: 'user', content: 'Context: ...\nInitial Failure:\nnpm start failed' },
        { role: 'assistant', content: 'OBSERVE this', tool_calls: [{ function: { name: 'execute_command', arguments: '{"command": "ls"}' } }] },
        { role: 'tool', content: 'file.js' }
      ]
    });
    assert(md.includes('Case: DEV-TEST'));
    assert(md.includes('Model: TestProvider TestModel'));
    assert(md.includes('Result: SUCCESS'));
    assert(md.includes('Duration: 1.5s'));
    assert(md.includes('Iterations: 1'));
    assert(md.includes('Tool Calls: 1'));
    assert(md.includes('npm start failed'));
    assert(md.includes('OBSERVE this'));
    assert(md.includes('execute_command'));
    assert(md.includes('file.js'));
    assert(md.includes('VERIFIED REPAIR'));
  });

  await t.test('failed trajectory', () => {
    const md = TrajectoryGenerator.generateMarkdown({
      finalStatus: 'MAX_ITERATIONS',
      conversation: []
    });
    assert(md.includes('Result: MAX_ITERATIONS'));
    assert(md.includes('REPAIR UNSUCCESSFUL'));
    assert(md.includes('Reason: MAX_ITERATIONS'));
  });

  await t.test('malformed tool call (ERROR)', () => {
    const md = TrajectoryGenerator.generateMarkdown({
      conversation: [
        { role: 'assistant', content: 'bad tool', tool_calls: [{ function: { name: 'bad_tool', arguments: 'invalid json' } }] },
        { role: 'tool', content: 'Malformed tool call arguments: Unexpected token' }
      ]
    });
    assert(md.includes('invalid json'));
    assert(md.includes('Malformed tool call arguments: Unexpected token'));
  });

  await t.test('verifier failure', () => {
    const md = TrajectoryGenerator.generateMarkdown({
      conversation: [
        { role: 'assistant', content: 'Done' },
        { role: 'user', content: 'Verification Failed:\n{\n  "success": false\n}\n\nThe environment is not fully repaired. Keep investigating.' }
      ]
    });
    assert(md.includes('## Iteration 1 — VERIFY'));
    assert(md.includes('Result:\nFAIL'));
    assert(md.includes('"success": false'));
  });

  await t.test('secret redaction (proves it uses sanitized input)', () => {
    // Note: TrajectoryGenerator doesn't scrub, it relies on Logger.scrub. 
    // This test ensures it renders whatever is passed to it correctly.
    const logger = new TelemetryLogger();
    const raw = { conversation: [{ role: 'tool', content: 'Bearer secret_token' }] };
    const scrubbed = logger.scrub(raw);
    const md = TrajectoryGenerator.generateMarkdown(scrubbed);
    assert(md.includes('Bearer [REDACTED]'));
    assert(!md.includes('secret_token'));
  });

  await t.test('truncated output', () => {
    let largeOutput = '';
    for (let i = 0; i < 60; i++) largeOutput += `line ${i}\n`; // > 50 lines
    const md = TrajectoryGenerator.generateMarkdown({
      conversation: [{ role: 'tool', content: largeOutput }]
    });
    assert(md.includes('... [truncated]'));
    assert(!md.includes('line 59'));
  });

  await t.test('missing optional telemetry fields', () => {
    const md = TrajectoryGenerator.generateMarkdown({});
    assert(md.includes('Case: Unknown'));
    assert(md.includes('Model: Unknown'));
    assert(md.includes('Result: UNKNOWN'));
  });
});
