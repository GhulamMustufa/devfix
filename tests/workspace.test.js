import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { StagingWorkspace } from '../src/workspace/Staging.js';

test('Phase 1 StagingWorkspace — Isolation, Diff, Approval, and Rollback', async (t) => {
  let tmpRoot;
  let projectDir;
  let outsideSecretFile;
  let rollbackDir;

  t.beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'devfix-ws-test-'));
    projectDir = path.join(tmpRoot, 'project');
    outsideSecretFile = path.join(tmpRoot, 'host-secret.txt');
    rollbackDir = path.join(tmpRoot, 'rollbacks');

    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(outsideSecretFile, 'TOP_SECRET_HOST_DATA', 'utf8');

    // Regular project files
    await fs.writeFile(path.join(projectDir, 'index.js'), 'console.log("broken");\n', 'utf8');
    await fs.writeFile(path.join(projectDir, 'run.sh'), '#!/bin/sh\necho hi\n', { mode: 0o755 });
    await fs.writeFile(path.join(projectDir, '.env.example'), 'API_KEY=\n', 'utf8');

    // Sensitive files that must NEVER enter staging
    await fs.writeFile(path.join(projectDir, '.env'), 'API_KEY=real_secret_123\n', 'utf8');
    await fs.mkdir(path.join(projectDir, '.ssh'), { recursive: true });
    await fs.writeFile(path.join(projectDir, '.ssh', 'id_rsa'), 'PRIVATE KEY DATA', 'utf8');
    await fs.mkdir(path.join(projectDir, '.git'), { recursive: true });
    await fs.writeFile(path.join(projectDir, '.git', 'config'), '[remote "origin"]\n', 'utf8');

    // Symlink pointing outside project
    await fs.symlink(outsideSecretFile, path.join(projectDir, 'leak.txt'));
  });

  t.afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  await t.test('excludes sensitive files and external symlinks when staging, while preserving .env.example and permissions', async () => {
    const staging = new StagingWorkspace({ projectPath: projectDir, rollbackRootDir: rollbackDir });
    const info = await staging.init();

    try {
      assert(info.excludedFiles.includes('.env'));
      assert(info.excludedFiles.some((f) => f.startsWith('.ssh')));
      assert(info.excludedFiles.some((f) => f.startsWith('.git')));
      assert(info.blockedSymlinks.includes('leak.txt'));

      // Verify sensitive files do not exist in staging
      await assert.rejects(() => fs.stat(path.join(info.stagingPath, '.env')));
      await assert.rejects(() => fs.stat(path.join(info.stagingPath, 'leak.txt')));

      // Verify .env.example and permissions preserved
      const example = await fs.readFile(path.join(info.stagingPath, '.env.example'), 'utf8');
      assert.strictEqual(example, 'API_KEY=\n');
      const runStat = await fs.stat(path.join(info.stagingPath, 'run.sh'));
      assert.strictEqual(runStat.mode & 0o777, 0o755);
    } finally {
      await staging.cleanup();
    }
  });

  await t.test('keeps original project untouched on unapproved or dry-run apply', async () => {
    const staging = new StagingWorkspace({ projectPath: projectDir, rollbackRootDir: rollbackDir });
    const info = await staging.init();

    try {
      await fs.writeFile(path.join(info.stagingPath, 'index.js'), 'console.log("fixed");\n', 'utf8');
      await fs.writeFile(path.join(info.stagingPath, 'new-config.json'), '{"ok":true}\n', 'utf8');

      const unapproved = await staging.applyChanges({ approved: false });
      assert.strictEqual(unapproved.applied, false);
      assert.strictEqual(unapproved.reason, 'APPROVAL_REQUIRED');
      assert.deepStrictEqual(unapproved.diff.modified, ['index.js']);
      assert.deepStrictEqual(unapproved.diff.added, ['new-config.json']);

      const dryRun = await staging.applyChanges({ approved: true, dryRun: true });
      assert.strictEqual(dryRun.applied, false);
      assert.strictEqual(dryRun.dryRun, true);

      // Original project remains untouched
      assert.strictEqual(
        await fs.readFile(path.join(projectDir, 'index.js'), 'utf8'),
        'console.log("broken");\n'
      );
      await assert.rejects(() => fs.stat(path.join(projectDir, 'new-config.json')));
    } finally {
      await staging.cleanup();
    }
  });

  await t.test('blocks applying changes if staging introduces an escaping symlink', async () => {
    const staging = new StagingWorkspace({ projectPath: projectDir, rollbackRootDir: rollbackDir });
    const info = await staging.init();

    try {
      await fs.symlink(outsideSecretFile, path.join(info.stagingPath, 'evil-link.txt'));
      await assert.rejects(
        () => staging.applyChanges({ approved: true }),
        /unsafe symlinks/i
      );
    } finally {
      await staging.cleanup();
    }
  });

  await t.test('applies approved changes atomically, preserves permissions, and supports full rollback', async () => {
    const staging = new StagingWorkspace({ projectPath: projectDir, rollbackRootDir: rollbackDir });
    const info = await staging.init();

    let rollbackId;
    try {
      await fs.writeFile(path.join(info.stagingPath, 'index.js'), 'console.log("fixed");\n', 'utf8');
      await fs.writeFile(path.join(info.stagingPath, 'run.sh'), '#!/bin/sh\necho fixed\n', { mode: 0o755 });
      await fs.writeFile(path.join(info.stagingPath, 'added.txt'), 'new file\n', 'utf8');

      const applied = await staging.applyChanges({ approved: true });
      assert.strictEqual(applied.applied, true);
      rollbackId = applied.rollbackId;

      assert.strictEqual(
        await fs.readFile(path.join(projectDir, 'index.js'), 'utf8'),
        'console.log("fixed");\n'
      );
      assert.strictEqual(
        await fs.readFile(path.join(projectDir, 'added.txt'), 'utf8'),
        'new file\n'
      );
      const runStatAfter = await fs.stat(path.join(projectDir, 'run.sh'));
      assert.strictEqual(runStatAfter.mode & 0o777, 0o755);

      // Sensitive .env on original project must still be intact!
      assert.strictEqual(
        await fs.readFile(path.join(projectDir, '.env'), 'utf8'),
        'API_KEY=real_secret_123\n'
      );
    } finally {
      await staging.cleanup();
    }

    // Staging directory should be gone
    await assert.rejects(() => fs.stat(info.stagingPath));

    // Rollback restores original content, permissions, and deletes added file
    await StagingWorkspace.rollback(rollbackId, { rollbackRootDir: rollbackDir });

    assert.strictEqual(
      await fs.readFile(path.join(projectDir, 'index.js'), 'utf8'),
      'console.log("broken");\n'
    );
    assert.strictEqual(
      await fs.readFile(path.join(projectDir, 'run.sh'), 'utf8'),
      '#!/bin/sh\necho hi\n'
    );
    const runStatRestored = await fs.stat(path.join(projectDir, 'run.sh'));
    assert.strictEqual(runStatRestored.mode & 0o777, 0o755);
    await assert.rejects(() => fs.stat(path.join(projectDir, 'added.txt')));
  });

  await t.test('ensures rollback snapshot exists on disk before project mutation and handles partial failure / rollback', async () => {
    const staging = new StagingWorkspace({ projectPath: projectDir, rollbackRootDir: rollbackDir });
    const info = await staging.init();

    try {
      // Stage multiple modifications and additions
      await fs.writeFile(path.join(info.stagingPath, 'index.js'), 'console.log("partially modified");\n', 'utf8');
      await fs.writeFile(path.join(info.stagingPath, 'added1.txt'), 'added 1\n', 'utf8');
      await fs.writeFile(path.join(info.stagingPath, 'added2.txt'), 'added 2\n', 'utf8');

      // Make added2 destination unwritable by creating a non-writable directory at its path in the project
      await fs.mkdir(path.join(projectDir, 'added2.txt'), { mode: 0o555 });

      let caughtError = null;
      try {
        await staging.applyChanges({ approved: true });
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'Expected applyChanges to fail due to unwritable target');
      assert.strictEqual(caughtError.rolledBack, true, 'Expected automatic rollback on partial write failure');
      assert(caughtError.rollbackId, 'Expected error to retain rollbackId');

      // Verify the rollback snapshot manifest existed on disk
      const snapshots = await StagingWorkspace.listRollbacks(rollbackDir);
      const snapshot = snapshots.find((s) => s.rollbackId === caughtError.rollbackId);
      assert(snapshot, 'Rollback manifest must exist on disk even after partial failure');
      assert.strictEqual(snapshot.status, 'PARTIAL_FAILURE');

      // Verify automatic rollback left index.js in its original state
      assert.strictEqual(
        await fs.readFile(path.join(projectDir, 'index.js'), 'utf8'),
        'console.log("broken");\n'
      );
      // added1.txt should have been rolled back / cleaned up
      await assert.rejects(() => fs.stat(path.join(projectDir, 'added1.txt')));

      // Clean up the dummy directory so rollback can be called explicitly
      await fs.rm(path.join(projectDir, 'added2.txt'), { recursive: true, force: true });

      // Verify explicit rollback invocation also works cleanly on the snapshot
      const manualRollback = await StagingWorkspace.rollback(caughtError.rollbackId, { rollbackRootDir: rollbackDir });
      assert.strictEqual(manualRollback.rollbackId, caughtError.rollbackId);
      assert.strictEqual(
        await fs.readFile(path.join(projectDir, 'index.js'), 'utf8'),
        'console.log("broken");\n'
      );
    } finally {
      await fs.rm(path.join(projectDir, 'added2.txt'), { recursive: true, force: true }).catch(() => {});
      await staging.cleanup();
    }
  });

  await t.test('blocks symlink traversal and destination symlink escaping during write-back', async () => {
    const staging = new StagingWorkspace({ projectPath: projectDir, rollbackRootDir: rollbackDir });
    await staging.init();

    try {
      // Destination is a symlink escaping original project
      const evilTarget = path.join(tmpRoot, 'outside-dest.txt');
      await fs.writeFile(evilTarget, 'OUTSIDE_ORIGINAL', 'utf8');
      await fs.symlink(evilTarget, path.join(projectDir, 'escape-link.txt'));

      await assert.rejects(
        () => staging._resolveSafeProjectTarget('escape-link.txt'),
        /Destination is a symlink escaping original project/
      );

      // Relative path trying to escape project root
      await assert.rejects(
        () => staging._resolveSafeProjectTarget('../outside.txt'),
        /Invalid relative path/
      );
    } finally {
      await staging.cleanup();
    }
  });

  await t.test('explicit user rejection leaves project untouched and creates zero rollback files', async () => {
    const staging = new StagingWorkspace({ projectPath: projectDir, rollbackRootDir: rollbackDir });
    const info = await staging.init();

    try {
      await fs.writeFile(path.join(info.stagingPath, 'index.js'), 'console.log("unapproved fix");\n', 'utf8');

      const res = await staging.applyChanges({ approved: false });
      assert.strictEqual(res.applied, false);
      assert.strictEqual(res.reason, 'APPROVAL_REQUIRED');

      // Zero rollbacks created
      const snapshots = await StagingWorkspace.listRollbacks(rollbackDir);
      assert.strictEqual(snapshots.length, 0);

      // Project unmodified
      assert.strictEqual(
        await fs.readFile(path.join(projectDir, 'index.js'), 'utf8'),
        'console.log("broken");\n'
      );
    } finally {
      await staging.cleanup();
    }
  });

  await t.test('simulated interrupted operation restores cleanly from pre-existing snapshot', async () => {
    const staging = new StagingWorkspace({ projectPath: projectDir, rollbackRootDir: rollbackDir });
    const info = await staging.init();

    try {
      await fs.writeFile(path.join(info.stagingPath, 'index.js'), 'console.log("interrupted modification");\n', 'utf8');
      await fs.writeFile(path.join(info.stagingPath, 'run.sh'), '#!/bin/sh\necho new_run\n', { mode: 0o755 });

      // Calculate diff and manually verify snapshot creation behavior before write
      const diff = await staging.computeDiff();
      assert.strictEqual(diff.modified.length, 2);

      // We spy on fs.rename to simulate an abrupt crash/interruption after writing the 1st file
      const originalRename = fs.rename;
      let renameCount = 0;
      fs.rename = async (...args) => {
        renameCount++;
        if (renameCount === 2) {
          throw new Error('SIMULATED_PROCESS_INTERRUPTION');
        }
        return originalRename(...args);
      };

      let caughtErr = null;
      try {
        await staging.applyChanges({ approved: true });
      } catch (err) {
        caughtErr = err;
      } finally {
        fs.rename = originalRename;
      }

      assert(caughtErr);
      assert.match(caughtErr.message, /SIMULATED_PROCESS_INTERRUPTION/);
      assert.strictEqual(caughtErr.rolledBack, true);

      // Original index.js and run.sh should be back to pristine broken/hi states with 0755 intact
      assert.strictEqual(
        await fs.readFile(path.join(projectDir, 'index.js'), 'utf8'),
        'console.log("broken");\n'
      );
      assert.strictEqual(
        await fs.readFile(path.join(projectDir, 'run.sh'), 'utf8'),
        '#!/bin/sh\necho hi\n'
      );
      const runStat = await fs.stat(path.join(projectDir, 'run.sh'));
      assert.strictEqual(runStat.mode & 0o777, 0o755);
    } finally {
      await staging.cleanup();
    }
  });
});

