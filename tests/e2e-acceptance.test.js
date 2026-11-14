import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { StagingWorkspace } from '../src/workspace/Staging.js';
import { ProjectDetector } from '../src/project/Detector.js';
import { verifyProcess } from '../src/verifier/Process.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devfixBin = path.resolve(__dirname, '../bin/devfix');

function createLocalSandbox(cwd) {
  return {
    async execute(command, timeoutMs = 5000) {
      const start = Date.now();
      try {
        const { stdout, stderr } = await execFileAsync('sh', ['-c', command], { cwd, timeout: timeoutMs });
        return { exit_code: 0, stdout, stderr, timeout: false, duration_ms: Date.now() - start };
      } catch (err) {
        return {
          exit_code: typeof err.code === 'number' ? err.code : 1,
          stdout: err.stdout || '',
          stderr: err.stderr || err.message,
          timeout: Boolean(err.killed),
          duration_ms: Date.now() - start
        };
      }
    }
  };
}

test('Phase 5 — End-to-End Acceptance Testing Suite', async (t) => {
  let tmpRoot;

  t.beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'devfix-e2e-'));
  });

  t.afterEach(async () => {
    if (tmpRoot) {
      await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
    }
  });

  await t.test('Scenario 1: Node.js project with dependency problem — complete user journey', async () => {
    // 1. Setup sample Node.js project with broken start script / missing dependency
    const projectDir = path.join(tmpRoot, 'node-broken-app');
    const rollbacksDir = path.join(tmpRoot, 'rollbacks');
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify({
      name: 'node-broken-app',
      version: '1.0.0',
      type: 'module',
      scripts: {
        start: 'node index.js',
        test: 'node --test'
      },
      dependencies: {
        'missing-pkg': '^99.0.0'
      }
    }, null, 2));

    await fs.writeFile(path.join(projectDir, 'index.js'), `
// Broken: requires missing module and has syntax flaw
import { missing } from 'missing-pkg';
console.log('App starting with', missing);
process.exit(1);
    `.trim());

    // Journey Step 1: User runs `devfix inspect --json`
    const { stdout: inspectOut } = await execFileAsync('node', [devfixBin, 'inspect', projectDir, '--json']);
    const inspection = JSON.parse(inspectOut);
    assert.strictEqual(inspection.language, 'JavaScript');
    assert.strictEqual(inspection.runtime, 'Node.js');
    assert.strictEqual(inspection.packageManager, 'npm');
    assert.ok(inspection.files.includes('package.json'));

    // Journey Step 2: User runs `devfix doctor --json`
    let doctorParsed;
    try {
      const { stdout: docOut } = await execFileAsync('node', [devfixBin, 'doctor', '--json']);
      doctorParsed = JSON.parse(docOut);
    } catch (e) {
      assert.strictEqual(e.code, 3); // Code 3 when Docker daemon is not active
      doctorParsed = JSON.parse(e.stdout);
    }
    assert.strictEqual(typeof doctorParsed.ok, 'boolean');
    assert.strictEqual(doctorParsed.checks.node.status, 'ok');

    // Journey Step 3: Verifier confirms initial state is broken
    const initialVerify = await verifyProcess({
      sandbox: createLocalSandbox(projectDir),
      command: `node -e "import('./index.js').catch(() => process.exit(1))"`,
      timeoutMs: 3000
    });
    assert.strictEqual(initialVerify.success, false);
    assert.strictEqual(initialVerify.status, 'NON_ZERO_EXIT');

    // Journey Step 4: DevFix initializes staging workspace (Never mounts original as writable)
    const staging = new StagingWorkspace({
      projectPath: projectDir,
      rollbackRootDir: rollbacksDir
    });
    await staging.init();
    assert.ok(staging.stagingPath);
    assert.notStrictEqual(staging.stagingPath, projectDir);

    // Journey Step 5: Repair performed in staging
    const repairedIndex = `
// Repaired: safe fallback without broken dependency
console.log('App successfully recovered and running cleanly');
process.exit(0);
    `.trim();
    await fs.writeFile(path.join(staging.stagingPath, 'index.js'), repairedIndex);

    // Journey Step 6: Unified diff generated and reviewed before write-back
    const diff = await staging.computeDiff();
    assert.strictEqual(diff.hasChanges, true);
    assert.deepStrictEqual(diff.modified, ['index.js']);
    const formattedDiff = StagingWorkspace.formatDiff(diff);
    assert.ok(formattedDiff.includes('Modified:'));
    assert.ok(formattedDiff.includes('index.js'));

    // Journey Step 7: Approval and atomic write-back with snapshot
    const applyResult = await staging.applyChanges({ approved: true });
    assert.strictEqual(applyResult.applied, true);
    assert.ok(applyResult.rollbackId);

    // Journey Step 8: Deterministic verifier confirms repair is working
    const postVerify = await verifyProcess({
      sandbox: createLocalSandbox(projectDir),
      command: 'node index.js',
      timeoutMs: 3000
    });
    assert.strictEqual(postVerify.success, true);
    assert.strictEqual(postVerify.status, 'SUCCESS');
    assert.strictEqual(postVerify.exitCode, 0);

    // Journey Step 9: History confirms repair was applied
    const history = await StagingWorkspace.getHistory({ rollbackRootDir: rollbacksDir });
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].status, 'APPLIED');
    assert.strictEqual(history[0].canRollback, true);
  });

  await t.test('Scenario 2: Python project with dependency problem — complete user journey', async () => {
    // 1. Setup sample Python project with broken dependency declaration
    const projectDir = path.join(tmpRoot, 'python-broken-app');
    const rollbacksDir = path.join(tmpRoot, 'rollbacks');
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(path.join(projectDir, 'pyproject.toml'), `
[project]
name = "broken-service"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
    "nonexistent-library==99.9.9",
]
    `.trim());

    await fs.writeFile(path.join(projectDir, 'main.py'), `
import sys
# Broken import
try:
    import nonexistent_library
except ImportError:
    print("FATAL: missing dependency")
    sys.exit(1)
    `.trim());

    // Step 1: Inspect project
    const { stdout: inspectOut } = await execFileAsync('node', [devfixBin, 'inspect', projectDir, '--json']);
    const inspection = JSON.parse(inspectOut);
    assert.strictEqual(inspection.language, 'Python');
    assert.strictEqual(inspection.runtime, 'Python');
    assert.ok(inspection.files.includes('pyproject.toml'));

    // Step 2: Stage and diagnose
    const staging = new StagingWorkspace({
      projectPath: projectDir,
      rollbackRootDir: rollbacksDir
    });
    await staging.init();

    // Step 3: Repair in staging — patch pyproject.toml and main.py
    await fs.writeFile(path.join(staging.stagingPath, 'main.py'), `
import sys
print("Service recovered successfully")
sys.exit(0)
    `.trim());

    // Step 4: Compute diff
    const diff = await staging.computeDiff();
    assert.strictEqual(diff.hasChanges, true);
    assert.deepStrictEqual(diff.modified, ['main.py']);

    // Step 5: Approve changes
    const applyResult = await staging.applyChanges({ approved: true });
    assert.strictEqual(applyResult.applied, true);

    // Step 6: Verify repaired Python script
    const verifyRes = await verifyProcess({
      sandbox: createLocalSandbox(projectDir),
      command: 'python3 main.py',
      timeoutMs: 3000
    });
    assert.strictEqual(verifyRes.success, true);
    assert.strictEqual(verifyRes.status, 'SUCCESS');
  });

  await t.test('Scenario 3: Unrepairable project — refuses to claim success and keeps project untouched', async () => {
    const projectDir = path.join(tmpRoot, 'unrepairable-app');
    const rollbacksDir = path.join(tmpRoot, 'rollbacks');
    await fs.mkdir(projectDir, { recursive: true });

    const originalContent = 'console.log("Original untouched code");\n';
    await fs.writeFile(path.join(projectDir, 'app.js'), originalContent);

    // User specifies an impossible verification requirement (e.g. exit 42)
    const impossibleVerify = {
      command: 'node -e "process.exit(1)"',
      expectedExitCode: 42
    };

    // Staging workspace
    const staging = new StagingWorkspace({
      projectPath: projectDir,
      rollbackRootDir: rollbacksDir
    });
    await staging.init();
    await fs.writeFile(path.join(staging.stagingPath, 'app.js'), 'console.log("Attempted patch");');

    // Run verifier
    const verifyRes = await verifyProcess({
      sandbox: createLocalSandbox(staging.stagingPath),
      command: impossibleVerify.command,
      expectedExitCode: impossibleVerify.expectedExitCode,
      timeoutMs: 2000
    });

    // DevFix MUST NOT apply changes when verifier fails!
    assert.strictEqual(verifyRes.success, false);

    // Apply changes with approved=false because verification failed
    const applyRes = await staging.applyChanges({ approved: false });
    assert.strictEqual(applyRes.applied, false);

    // Verify original project is 100% untouched
    const currentContent = await fs.readFile(path.join(projectDir, 'app.js'), 'utf8');
    assert.strictEqual(currentContent, originalContent);

    // Verify zero rollbacks recorded
    const history = await StagingWorkspace.getHistory({ rollbackRootDir: rollbacksDir });
    assert.strictEqual(history.length, 0);
  });

  await t.test('Scenario 4: Rollback journey — post-repair modification conflict detection and restoration', async () => {
    const projectDir = path.join(tmpRoot, 'rollback-app');
    const rollbacksDir = path.join(tmpRoot, 'rollbacks');
    await fs.mkdir(projectDir, { recursive: true });

    const fileA = path.join(projectDir, 'server.js');
    await fs.writeFile(fileA, '// Initial server code v1.0\n');

    // 1. Stage and apply repair
    const staging = new StagingWorkspace({
      projectPath: projectDir,
      rollbackRootDir: rollbacksDir
    });
    await staging.init();
    await fs.writeFile(path.join(staging.stagingPath, 'server.js'), '// Repaired server code v1.1\n');
    const applied = await staging.applyChanges({ approved: true });
    assert.strictEqual(applied.applied, true);

    // Verify repair was applied
    assert.strictEqual(await fs.readFile(fileA, 'utf8'), '// Repaired server code v1.1\n');

    // 2. Developer modifies server.js AFTER repair was applied
    await fs.writeFile(fileA, '// Developer custom edit post-repair\n');

    // 3. Rollback without force must be blocked to protect developer's manual edits
    try {
      await StagingWorkspace.rollback(applied.rollbackId, {
        rollbackRootDir: rollbacksDir,
        force: false
      });
      assert.fail('Should have blocked rollback due to post-repair conflict');
    } catch (err) {
      assert(err.message.includes('has been modified since the repair was applied'));
    }

    // 4. Rollback WITH force restores original pre-repair code
    const rollbackRes = await StagingWorkspace.rollback(applied.rollbackId, {
      rollbackRootDir: rollbacksDir,
      force: true
    });
    assert.strictEqual(rollbackRes.status, 'ROLLED_BACK');
    assert.strictEqual(await fs.readFile(fileA, 'utf8'), '// Initial server code v1.0\n');

    // 5. History confirms status transition to ROLLED_BACK
    const history = await StagingWorkspace.getHistory({ rollbackRootDir: rollbacksDir });
    assert.strictEqual(history[0].status, 'ROLLED_BACK');
    assert.strictEqual(history[0].canRollback, false);
  });

  await t.test('Scenario 5: Dry-run mode — computes diff and diagnosis without writing to project', async () => {
    const projectDir = path.join(tmpRoot, 'dryrun-app');
    const rollbacksDir = path.join(tmpRoot, 'rollbacks');
    await fs.mkdir(projectDir, { recursive: true });

    const originalConfig = JSON.stringify({ port: 3000, env: 'development' }, null, 2);
    await fs.writeFile(path.join(projectDir, 'config.json'), originalConfig);

    // Staging initialized
    const staging = new StagingWorkspace({
      projectPath: projectDir,
      rollbackRootDir: rollbacksDir
    });
    await staging.init();

    // Staging file modified
    await fs.writeFile(path.join(staging.stagingPath, 'config.json'), JSON.stringify({ port: 8080, env: 'production' }, null, 2));

    // Compute diff
    const diff = await staging.computeDiff();
    assert.strictEqual(diff.hasChanges, true);
    assert.strictEqual(diff.modified.length, 1);
    assert.deepStrictEqual(diff.modified, ['config.json']);

    // Apply with dryRun = true
    const applyRes = await staging.applyChanges({ approved: true, dryRun: true });
    assert.strictEqual(applyRes.applied, false);
    assert.strictEqual(applyRes.dryRun, true);

    // Verify original project is untouched
    const currentConfig = await fs.readFile(path.join(projectDir, 'config.json'), 'utf8');
    assert.strictEqual(currentConfig, originalConfig);

    // Zero rollback snapshots written
    const history = await StagingWorkspace.getHistory({ rollbackRootDir: rollbacksDir });
    assert.strictEqual(history.length, 0);
  });
});
