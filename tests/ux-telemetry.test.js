import test from 'node:test';
import assert from 'node:assert';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { TelemetryLogger } from '../src/telemetry/Logger.js';
import { StagingWorkspace } from '../src/workspace/Staging.js';

const execFileAsync = promisify(execFile);
const devfixBin = path.resolve('bin/devfix');

test('Phase 4 — Developer UX, Telemetry & Release Readiness Suite', async (t) => {
  let tmpProject;
  let tmpRollbacks;

  t.beforeEach(async () => {
    tmpProject = await fs.mkdtemp(path.join(os.tmpdir(), 'devfix-ux-proj-'));
    tmpRollbacks = await fs.mkdtemp(path.join(os.tmpdir(), 'devfix-ux-rollbacks-'));
  });

  t.afterEach(async () => {
    await fs.rm(tmpProject, { recursive: true, force: true }).catch(() => {});
    await fs.rm(tmpRollbacks, { recursive: true, force: true }).catch(() => {});
  });

  await t.test('CLI --help lists all 8 top-level commands', async () => {
    const { stdout } = await execFileAsync('node', [devfixBin, '--help']);
    assert(stdout.includes('fix [options] <project>'));
    assert(stdout.includes('rollback [options] [rollbackId]'));
    assert(stdout.includes('history [options] [project]'));
    assert(stdout.includes('diff [options] [project]'));
    assert(stdout.includes('inspect [options] [dir]'));
    assert(stdout.includes('demo [options] <case>'));
    assert(stdout.includes('benchmark [options]'));
    assert(stdout.includes('doctor [options]'));
  });

  await t.test('doctor --json returns machine-readable JSON report with checks schema', async () => {
    try {
      await execFileAsync('node', [devfixBin, 'doctor', '--json']);
      // If all checks pass (e.g. Docker daemon active), code is 0
    } catch (e) {
      // If docker daemon is stopped, exits code 3, but stdout must still be valid JSON
      assert.strictEqual(e.code, 3);
      const parsed = JSON.parse(e.stdout);
      assert.strictEqual(typeof parsed.ok, 'boolean');
      assert.ok(parsed.checks);
      assert.strictEqual(parsed.checks.node.status, 'ok');
      assert.ok(parsed.checks.dockerCli);
      assert.ok(parsed.checks.dockerDaemon);
      assert.ok(parsed.checks.git);
      assert.ok(parsed.checks.llm);
      assert.ok(parsed.checks.storage);
      assert.ok(parsed.checks.telemetry);
    }
  });

  await t.test('inspect --json outputs valid JSON representation of project context', async () => {
    await fs.writeFile(path.join(tmpProject, 'package.json'), JSON.stringify({
      name: 'ux-test',
      scripts: { test: 'vitest' }
    }));
    await fs.writeFile(path.join(tmpProject, 'tsconfig.json'), '{}');
    await fs.writeFile(path.join(tmpProject, 'pnpm-lock.yaml'), '');

    const { stdout } = await execFileAsync('node', [devfixBin, 'inspect', tmpProject, '--json']);
    const parsed = JSON.parse(stdout);

    assert.strictEqual(parsed.language, 'TypeScript');
    assert.strictEqual(parsed.runtime, 'Node.js');
    assert.strictEqual(parsed.packageManager, 'pnpm');
    assert.strictEqual(parsed.lockfile, 'pnpm-lock.yaml');
    assert.strictEqual(parsed.commands.test, 'pnpm test');
  });

  await t.test('history --json returns empty array when no snapshots exist', async () => {
    const { stdout } = await execFileAsync('node', [devfixBin, 'history', '--json'], {
      env: { ...process.env, DEVFIX_ROLLBACK_DIR: tmpRollbacks }
    });
    const parsed = JSON.parse(stdout);
    assert(Array.isArray(parsed));
    assert.strictEqual(parsed.length, 0);
  });

  await t.test('history lists applied repairs with status and diffSummary', async () => {
    // Create a mock rollback snapshot in tmpRollbacks
    const rollbackId = 'test-rb-101';
    const snapshotDir = path.join(tmpRollbacks, rollbackId);
    await fs.mkdir(snapshotDir, { recursive: true });
    await fs.writeFile(path.join(snapshotDir, 'manifest.json'), JSON.stringify({
      rollbackId,
      timestamp: new Date().toISOString(),
      projectPath: tmpProject,
      status: 'APPLIED',
      added: ['added.js'],
      modified: ['index.js'],
      deleted: [],
      diffSummary: { added: 1, modified: 1, deleted: 0 }
    }));

    const { stdout } = await execFileAsync('node', [devfixBin, 'history', '--json'], {
      env: { ...process.env, DEVFIX_ROLLBACK_DIR: tmpRollbacks }
    });
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].rollbackId, rollbackId);
    assert.strictEqual(parsed[0].status, 'APPLIED');
    assert.strictEqual(parsed[0].canRollback, true);
    assert.strictEqual(parsed[0].diffSummary.added, 1);
  });

  await t.test('rollback rejects invalid or traversal rollbackId', async () => {
    try {
      await StagingWorkspace.rollback('../../etc/passwd', { rollbackRootDir: tmpRollbacks });
      assert.fail('Should have rejected traversal rollback ID');
    } catch (e) {
      assert(e.message.includes('Invalid rollback ID'));
    }
  });

  await t.test('rollback detects post-repair user modifications and requires --force', async () => {
    // 1. Setup project with file
    const fileA = path.join(tmpProject, 'config.js');
    await fs.writeFile(fileA, 'original content', 'utf8');

    // 2. Stage workspace and apply change
    const staging = new StagingWorkspace({
      projectPath: tmpProject,
      rollbackRootDir: tmpRollbacks,
    });
    await staging.init();
    await fs.writeFile(path.join(staging.stagingPath, 'config.js'), 'devfix repaired content', 'utf8');
    const applied = await staging.applyChanges({ approved: true });

    // Verify repair was applied
    assert.strictEqual(await fs.readFile(fileA, 'utf8'), 'devfix repaired content');

    // 3. User modifies the file AFTER repair
    await fs.writeFile(fileA, 'user post-repair edit', 'utf8');

    // 4. Attempt rollback without force: must reject!
    try {
      await StagingWorkspace.rollback(applied.rollbackId, {
        rollbackRootDir: tmpRollbacks,
        force: false,
      });
      assert.fail('Should have blocked rollback on post-repair modified file');
    } catch (e) {
      assert(e.message.includes('has been modified since the repair was applied'));
    }

    // 5. Attempt rollback WITH force: must succeed and restore original content!
    await StagingWorkspace.rollback(applied.rollbackId, {
      rollbackRootDir: tmpRollbacks,
      force: true,
    });
    assert.strictEqual(await fs.readFile(fileA, 'utf8'), 'original content');

    // Verify status is updated to ROLLED_BACK
    const history = await StagingWorkspace.getHistory({ rollbackRootDir: tmpRollbacks });
    assert.strictEqual(history[0].status, 'ROLLED_BACK');
    assert.strictEqual(history[0].canRollback, false);
  });

  await t.test('TelemetryLogger respects opt-out via DEVFIX_TELEMETRY=0 and DO_NOT_TRACK=1', async () => {
    // Test DEVFIX_TELEMETRY=0
    process.env.DEVFIX_TELEMETRY = '0';
    const logger1 = new TelemetryLogger({ outDir: path.join(tmpRollbacks, 'runs') });
    assert.strictEqual(logger1.enabled, false);
    const res1 = await logger1.save({ status: 'SUCCESS' });
    assert.strictEqual(res1.disabled, true);
    delete process.env.DEVFIX_TELEMETRY;

    // Test DO_NOT_TRACK=1
    process.env.DO_NOT_TRACK = '1';
    const logger2 = new TelemetryLogger({ outDir: path.join(tmpRollbacks, 'runs') });
    assert.strictEqual(logger2.enabled, false);
    const res2 = await logger2.save({ status: 'SUCCESS' });
    assert.strictEqual(res2.disabled, true);
    delete process.env.DO_NOT_TRACK;

    // Test explicit options.enabled = false
    const logger3 = new TelemetryLogger({ enabled: false, outDir: path.join(tmpRollbacks, 'runs') });
    assert.strictEqual(logger3.enabled, false);
    const res3 = await logger3.save({ status: 'SUCCESS' });
    assert.strictEqual(res3.disabled, true);
  });

  await t.test('TelemetryLogger failure does not throw or crash repair', async () => {
    // Point logger to an invalid file path as directory
    const invalidDir = path.join(tmpProject, 'not-a-dir');
    await fs.writeFile(invalidDir, 'blocking file');

    const logger = new TelemetryLogger({ outDir: path.join(invalidDir, 'sub') });
    const result = await logger.save({ status: 'SUCCESS' });

    assert.ok(result.error);
    assert.strictEqual(result.json, null);
  });

  await t.test('TelemetryLogger scrubs sensitive keys and values before writing', async () => {
    const runsDir = path.join(tmpRollbacks, 'runs');
    const logger = new TelemetryLogger({ outDir: runsDir });
    const fakeData = {
      project: 'test',
      apiKey: 'sk-proj-supersecretkey1234567890abcdef',
      token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.b',
      output: 'Database error on postgresql://postgres:mypassword@localhost:5432/mydb'
    };

    const saved = await logger.save(fakeData);
    assert.ok(saved.json);

    const content = await fs.readFile(saved.json, 'utf8');
    assert(!content.includes('mypassword'));
    assert(!content.includes('supersecretkey'));
    assert(content.includes('[REDACTED]'));
  });

  await t.test('npm package contains only sanctioned distribution files', async () => {
    const pkg = JSON.parse(await fs.readFile(path.resolve('package.json'), 'utf8'));
    assert.ok(pkg.files.includes('bin'));
    assert.ok(pkg.files.includes('src'));
    assert.ok(pkg.files.includes('README.md'));
    assert.ok(pkg.files.includes('LICENSE'));
    assert.ok(pkg.files.includes('CHANGELOG.md'));

    // Verify .env or tests are NOT in package files whitelist
    assert(!pkg.files.includes('.env'));
    assert(!pkg.files.includes('tests'));
    assert(!pkg.files.includes('artifacts'));
  });
});
