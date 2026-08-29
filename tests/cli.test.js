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
