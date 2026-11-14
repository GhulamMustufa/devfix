import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createHash, randomBytes } from 'crypto';

const DEFAULT_ROLLBACK_ROOT = path.join(os.homedir(), '.devfix', 'rollbacks');
const MAX_TEXT_DIFF_BYTES = 256 * 1024;

const ALLOWED_ENV_TEMPLATES = new Set([
  '.env.example',
  '.env.sample',
  '.env.template',
  '.env.dist',
]);

const SENSITIVE_DIR_NAMES = new Set([
  '.git',
  '.ssh',
  '.aws',
  '.gnupg',
  '.gcp',
  '.docker',
]);

const SENSITIVE_EXACT_NAMES = new Set([
  '.npmrc',
  '.pypirc',
  '.netrc',
  '.dockercfg',
  'id_rsa',
  'id_ed25519',
  'id_dsa',
  'id_ecdsa',
  'credentials.json',
]);

export function isSensitiveWorkspacePath(relPath) {
  const normalized = relPath.split(path.sep).join('/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return false;

  // Block sensitive directories anywhere in path
  for (let i = 0; i < parts.length; i++) {
    if (SENSITIVE_DIR_NAMES.has(parts[i])) {
      return true;
    }
  }

  const base = parts[parts.length - 1];
  const lower = base.toLowerCase();

  if (SENSITIVE_EXACT_NAMES.has(lower)) {
    return true;
  }

  // Block .env and .env.* except explicit template files
  if ((lower === '.env' || lower.startsWith('.env.')) && !ALLOWED_ENV_TEMPLATES.has(lower)) {
    return true;
  }

  // Private keys & certificates with keys
  if (
    lower.endsWith('.pem') ||
    lower.endsWith('.key') ||
    lower.endsWith('.p12') ||
    lower.endsWith('.pfx')
  ) {
    return true;
  }

  // Cloud / service account credentials JSON
  if (
    lower.endsWith('.json') &&
    (lower.includes('service-account') || lower.includes('service_account') || lower.includes('credentials'))
  ) {
    return true;
  }

  return false;
}

function isPathInside(parentRealPath, targetPath) {
  const rel = path.relative(parentRealPath, targetPath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

async function hashFile(filePath) {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

function isLikelyBinary(buf) {
  const len = Math.min(buf.length, 4096);
  for (let i = 0; i < len; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

function buildLineDiff(relPath, beforeText, afterText) {
  const beforeLines = beforeText.split(/\r?\n/);
  const afterLines = afterText.split(/\r?\n/);
  const lines = [`--- a/${relPath}`, `+++ b/${relPath}`];

  const maxLen = Math.max(beforeLines.length, afterLines.length);
  let shown = 0;
  for (let i = 0; i < maxLen; i++) {
    const oldLine = beforeLines[i];
    const newLine = afterLines[i];
    if (oldLine === newLine) continue;
    lines.push(`@@ line ${i + 1} @@`);
    if (oldLine !== undefined) lines.push(`-${oldLine}`);
    if (newLine !== undefined) lines.push(`+${newLine}`);
    shown++;
    if (shown >= 60) {
      lines.push('... (diff truncated)');
      break;
    }
  }
  return lines.join('\n');
}

export class StagingWorkspace {
  constructor(options = {}) {
    this.projectPath = path.resolve(options.projectPath);
    this.realProjectPath = null;
    this.stagingPath = null;
    this.realStagingPath = null;
    this.rollbackRootDir = options.rollbackRootDir || process.env.DEVFIX_ROLLBACK_DIR || DEFAULT_ROLLBACK_ROOT;
    this.includeSensitive = Boolean(options.includeSensitive);
    this.excludedFiles = [];
    this.blockedSymlinks = [];
    this.baselineManifest = new Map();
  }

  async init() {
    const stat = await fs.stat(this.projectPath);
    if (!stat.isDirectory()) {
      throw new Error(`Project path is not a directory: ${this.projectPath}`);
    }

    this.realProjectPath = await fs.realpath(this.projectPath);
    if (this.realProjectPath === '/') {
      throw new Error('Cannot stage root directory /');
    }
    if (this.realProjectPath === await fs.realpath(os.homedir())) {
      throw new Error('Cannot stage user home directory wholesale');
    }

    this.stagingPath = await fs.mkdtemp(path.join(os.tmpdir(), 'devfix-stage-'));
    await fs.chmod(this.stagingPath, 0o755);
    this.realStagingPath = await fs.realpath(this.stagingPath);

    await this._copyDirectorySafe(this.realProjectPath, this.realStagingPath, '');
    await this._recordManifest(this.realStagingPath, '', this.baselineManifest);

    return {
      stagingPath: this.stagingPath,
      excludedFiles: [...this.excludedFiles],
      blockedSymlinks: [...this.blockedSymlinks],
    };
  }

  async _copyDirectorySafe(srcDir, destDir, relPrefix) {
    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = relPrefix ? path.join(relPrefix, entry.name) : entry.name;
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (!this.includeSensitive && isSensitiveWorkspacePath(relPath)) {
        this.excludedFiles.push(relPath.split(path.sep).join('/'));
        continue;
      }

      const lstat = await fs.lstat(srcPath);
      if (lstat.isSymbolicLink()) {
        const linkTarget = await fs.readlink(srcPath);
        const resolvedCandidate = path.resolve(path.dirname(srcPath), linkTarget);
        let targetReal;
        try {
          targetReal = await fs.realpath(resolvedCandidate);
        } catch {
          // Broken symlink: check resolved lexical target stays inside project
          targetReal = resolvedCandidate;
        }
        if (!isPathInside(this.realProjectPath, targetReal)) {
          this.blockedSymlinks.push(relPath.split(path.sep).join('/'));
          continue;
        }
        // Only copy relative symlinks that stay inside project
        const relTarget = path.isAbsolute(linkTarget)
          ? path.relative(path.dirname(srcPath), targetReal)
          : linkTarget;
        await fs.symlink(relTarget, destPath);
      } else if (lstat.isDirectory()) {
        await fs.mkdir(destPath, { mode: lstat.mode & 0o777 });
        await this._copyDirectorySafe(srcPath, destPath, relPath);
        await fs.chmod(destPath, lstat.mode & 0o777);
      } else if (lstat.isFile()) {
        await fs.copyFile(srcPath, destPath);
        await fs.chmod(destPath, lstat.mode & 0o777);
      }
    }
  }

  async _recordManifest(dir, relPrefix, manifest) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = relPrefix ? path.join(relPrefix, entry.name) : entry.name;
      const posixRel = relPath.split(path.sep).join('/');
      const fullPath = path.join(dir, entry.name);
      const lstat = await fs.lstat(fullPath);

      if (lstat.isSymbolicLink()) {
        const target = await fs.readlink(fullPath);
        manifest.set(posixRel, { type: 'symlink', target, mode: lstat.mode & 0o777, size: 0 });
      } else if (lstat.isDirectory()) {
        await this._recordManifest(fullPath, relPath, manifest);
      } else if (lstat.isFile()) {
        const hash = await hashFile(fullPath);
        manifest.set(posixRel, {
          type: 'file',
          hash,
          mode: lstat.mode & 0o777,
          size: lstat.size,
        });
      }
    }
  }

  async computeDiff() {
    if (!this.realStagingPath) {
      throw new Error('Staging workspace has not been initialized.');
    }

    const currentManifest = new Map();
    await this._recordManifest(this.realStagingPath, '', currentManifest);

    const added = [];
    const modified = [];
    const deleted = [];
    const patches = [];
    const unsafeSymlinks = [];
    let dependencyFilesChanged = 0;

    for (const [relPath, cur] of currentManifest.entries()) {
      if (cur.type === 'symlink') {
        const fullLink = path.join(this.realStagingPath, ...relPath.split('/'));
        const resolved = path.resolve(path.dirname(fullLink), cur.target);
        let realResolved = resolved;
        try {
          realResolved = await fs.realpath(resolved);
        } catch {
          // broken symlink
        }
        if (!isPathInside(this.realStagingPath, realResolved)) {
          unsafeSymlinks.push(relPath);
          continue;
        }
      }

      const prev = this.baselineManifest.get(relPath);
      const isNodeModules = relPath === 'node_modules' || relPath.startsWith('node_modules/');

      if (!prev) {
        if (isNodeModules) {
          dependencyFilesChanged++;
        } else {
          added.push(relPath);
          if (cur.type === 'file' && cur.size <= MAX_TEXT_DIFF_BYTES) {
            const buf = await fs.readFile(path.join(this.realStagingPath, ...relPath.split('/')));
            if (!isLikelyBinary(buf)) {
              patches.push(buildLineDiff(relPath, '', buf.toString('utf8')));
            }
          }
        }
      } else if (cur.type !== prev.type || cur.hash !== prev.hash || cur.target !== prev.target) {
        if (isNodeModules) {
          dependencyFilesChanged++;
        } else {
          modified.push(relPath);
          if (cur.type === 'file' && prev.type === 'file' && cur.size <= MAX_TEXT_DIFF_BYTES) {
            const stagedBuf = await fs.readFile(path.join(this.realStagingPath, ...relPath.split('/')));
            const origPath = path.join(this.realProjectPath, ...relPath.split('/'));
            let origText = '';
            try {
              const origBuf = await fs.readFile(origPath);
              if (!isLikelyBinary(origBuf) && !isLikelyBinary(stagedBuf)) {
                origText = origBuf.toString('utf8');
                patches.push(buildLineDiff(relPath, origText, stagedBuf.toString('utf8')));
              }
            } catch {
              // ignore if original unreadable
            }
          }
        }
      }
    }

    for (const [relPath] of this.baselineManifest.entries()) {
      if (!currentManifest.has(relPath)) {
        if (relPath.startsWith('node_modules/')) {
          dependencyFilesChanged++;
        } else {
          deleted.push(relPath);
        }
      }
    }

    return {
      added,
      modified,
      deleted,
      patches,
      unsafeSymlinks,
      dependencyFilesChanged,
      hasChanges: added.length > 0 || modified.length > 0 || deleted.length > 0 || dependencyFilesChanged > 0,
    };
  }

  static formatDiff(diff) {
    const lines = [];
    if (!diff.hasChanges) {
      return 'No file changes detected in staging workspace.';
    }
    if (diff.added.length > 0) {
      lines.push('Added:');
      diff.added.forEach((f) => lines.push(`  + ${f}`));
    }
    if (diff.modified.length > 0) {
      lines.push('Modified:');
      diff.modified.forEach((f) => lines.push(`  ~ ${f}`));
    }
    if (diff.deleted.length > 0) {
      lines.push('Deleted:');
      diff.deleted.forEach((f) => lines.push(`  - ${f}`));
    }
    if (diff.dependencyFilesChanged > 0) {
      lines.push(`Dependency artifacts (node_modules): ${diff.dependencyFilesChanged} file(s) changed`);
    }
    if (diff.unsafeSymlinks.length > 0) {
      lines.push(`Blocked unsafe symlinks: ${diff.unsafeSymlinks.join(', ')}`);
    }
    if (diff.patches.length > 0) {
      lines.push('');
      lines.push(diff.patches.join('\n\n'));
    }
    return lines.join('\n');
  }

  async _resolveSafeProjectTarget(relPath) {
    if (!this.includeSensitive && isSensitiveWorkspacePath(relPath)) {
      throw new Error(`Refusing to modify sensitive path in original project: ${relPath}`);
    }
    const parts = relPath.split('/').filter(Boolean);
    if (parts.some((p) => p === '..' || p === '.')) {
      throw new Error(`Invalid relative path: ${relPath}`);
    }
    const destPath = path.join(this.realProjectPath, ...parts);
    const parentDir = path.dirname(destPath);
    await fs.mkdir(parentDir, { recursive: true });
    const realParent = await fs.realpath(parentDir);
    if (!isPathInside(this.realProjectPath, realParent)) {
      throw new Error(`Target parent escapes original project directory: ${relPath}`);
    }
    try {
      const existingStat = await fs.lstat(destPath);
      if (existingStat.isSymbolicLink()) {
        const realExisting = await fs.realpath(destPath);
        if (!isPathInside(this.realProjectPath, realExisting)) {
          throw new Error(`Destination is a symlink escaping original project: ${relPath}`);
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    return destPath;
  }

  async applyChanges({ approved = false, dryRun = false, includeDependencies = false } = {}) {
    const diff = await this.computeDiff();

    if (dryRun) {
      return { applied: false, dryRun: true, diff };
    }

    if (!approved) {
      return { applied: false, reason: 'APPROVAL_REQUIRED', diff };
    }

    if (diff.unsafeSymlinks.length > 0) {
      throw new Error(`Refusing to apply changes containing unsafe symlinks: ${diff.unsafeSymlinks.join(', ')}`);
    }

    if (!diff.hasChanges) {
      return { applied: false, reason: 'NO_CHANGES', diff };
    }

    const rollbackId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(4).toString('hex')}`;
    const rollbackDir = path.join(this.rollbackRootDir, rollbackId);
    const backupFilesDir = path.join(rollbackDir, 'files');
    await fs.mkdir(backupFilesDir, { recursive: true });

    const filesToWrite = [...diff.added, ...diff.modified];
    if (includeDependencies && diff.dependencyFilesChanged > 0) {
      const currentManifest = new Map();
      await this._recordManifest(this.realStagingPath, '', currentManifest);
      for (const [relPath, info] of currentManifest.entries()) {
        if (relPath.startsWith('node_modules/') && info.type === 'file') {
          const prev = this.baselineManifest.get(relPath);
          if (!prev || prev.hash !== info.hash) {
            filesToWrite.push(relPath);
          }
        }
      }
    }

    const rollbackManifest = {
      rollbackId,
      timestamp: new Date().toISOString(),
      projectPath: this.realProjectPath,
      status: 'INITIALIZING',
      added: [...diff.added],
      modified: [],
      deleted: [],
      modes: {},
    };

    // 1. Back up existing files before mutating anything
    for (const relPath of [...diff.modified, ...diff.deleted]) {
      const origPath = await this._resolveSafeProjectTarget(relPath);
      const lstat = await fs.lstat(origPath);
      const backupDest = path.join(backupFilesDir, ...relPath.split('/'));
      await fs.mkdir(path.dirname(backupDest), { recursive: true });
      await fs.copyFile(origPath, backupDest);
      rollbackManifest.modes[relPath] = lstat.mode & 0o777;
      if (diff.modified.includes(relPath)) {
        rollbackManifest.modified.push(relPath);
      } else {
        rollbackManifest.deleted.push(relPath);
      }
    }

    // Persist rollback snapshot manifest to disk BEFORE mutating the original project
    rollbackManifest.status = 'READY';
    const manifestPath = path.join(rollbackDir, 'manifest.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify(rollbackManifest, null, 2),
      'utf-8'
    );

    try {
      // 2. Apply added and modified files atomically
      for (const relPath of filesToWrite) {
        const stagedSrc = path.join(this.realStagingPath, ...relPath.split('/'));
        const stagedStat = await fs.lstat(stagedSrc);
        if (stagedStat.isSymbolicLink()) continue;

        const destPath = await this._resolveSafeProjectTarget(relPath);
        const tmpDest = path.join(path.dirname(destPath), `.devfix-tmp-${randomBytes(4).toString('hex')}`);
        await fs.copyFile(stagedSrc, tmpDest);
        await fs.chmod(tmpDest, stagedStat.mode & 0o777);
        await fs.rename(tmpDest, destPath);

        if (diff.added.includes(relPath) || !rollbackManifest.modified.includes(relPath)) {
          if (!rollbackManifest.added.includes(relPath)) {
            rollbackManifest.added.push(relPath);
          }
        }
      }

      // 3. Apply deletions (only files that were present in baselineManifest)
      for (const relPath of diff.deleted) {
        const destPath = await this._resolveSafeProjectTarget(relPath);
        await fs.rm(destPath, { recursive: true, force: true });
      }

      rollbackManifest.status = 'APPLIED';
      rollbackManifest.diffSummary = {
        added: diff.added.length,
        modified: diff.modified.length,
        deleted: diff.deleted.length,
      };
      rollbackManifest.appliedHashes = {};
      for (const relPath of [...diff.added, ...diff.modified]) {
        try {
          const destPath = await this._resolveSafeProjectTarget(relPath);
          rollbackManifest.appliedHashes[relPath] = await hashFile(destPath);
        } catch {
          // ignore hash errors if file was removed in interim
        }
      }
      await fs.writeFile(
        manifestPath,
        JSON.stringify(rollbackManifest, null, 2),
        'utf-8'
      );
    } catch (writeErr) {
      rollbackManifest.status = 'PARTIAL_FAILURE';
      rollbackManifest.error = writeErr.message;
      await fs.writeFile(
        manifestPath,
        JSON.stringify(rollbackManifest, null, 2),
        'utf-8'
      ).catch(() => {});

      // Automatically roll back partially written files to restore pristine original state
      try {
        await StagingWorkspace.rollback(rollbackId, { rollbackRootDir: this.rollbackRootDir });
        writeErr.rolledBack = true;
      } catch (rollbackErr) {
        writeErr.rollbackError = rollbackErr.message;
        writeErr.rolledBack = false;
      }
      writeErr.rollbackId = rollbackId;
      throw writeErr;
    }

    return {
      applied: true,
      rollbackId,
      rollbackDir,
      diff,
    };
  }

  static async listRollbacks(rollbackRootDir = process.env.DEVFIX_ROLLBACK_DIR || DEFAULT_ROLLBACK_ROOT) {
    try {
      const entries = await fs.readdir(rollbackRootDir, { withFileTypes: true });
      const manifests = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const manifestPath = path.join(rollbackRootDir, entry.name, 'manifest.json');
        try {
          const content = await fs.readFile(manifestPath, 'utf-8');
          manifests.push(JSON.parse(content));
        } catch {
          // ignore invalid rollback folder
        }
      }
      manifests.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      return manifests;
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  static async rollback(rollbackId, options = {}) {
    const rollbackRootDir = options.rollbackRootDir || process.env.DEVFIX_ROLLBACK_DIR || DEFAULT_ROLLBACK_ROOT;
    let targetDir;

    if (rollbackId) {
      const SAFE_ROLLBACK_ID = /^[a-zA-Z0-9_-]+$/;
      if (!SAFE_ROLLBACK_ID.test(rollbackId)) {
        throw new Error(`Invalid rollback ID: ${rollbackId}`);
      }
      targetDir = path.join(rollbackRootDir, rollbackId);
      try {
        await fs.access(targetDir);
      } catch {
        throw new Error(`Rollback snapshot not found: ${rollbackId}`);
      }
    } else {
      const all = await StagingWorkspace.listRollbacks(rollbackRootDir);
      if (all.length === 0) {
        throw new Error('No rollback snapshots found.');
      }
      const filterProject = options.projectPath ? await fs.realpath(path.resolve(options.projectPath)) : null;
      const match = filterProject ? all.find((m) => m.projectPath === filterProject) : all[0];
      if (!match) {
        throw new Error(`No rollback snapshot found for project ${options.projectPath}`);
      }
      targetDir = path.join(rollbackRootDir, match.rollbackId);
    }

    const manifestPath = path.join(targetDir, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    const realProjectPath = await fs.realpath(manifest.projectPath);

    // Prevent silently overwriting post-repair modifications unless options.force is set
    if (!options.force && manifest.appliedHashes) {
      for (const [relPath, expectedHash] of Object.entries(manifest.appliedHashes)) {
        const currentPath = path.join(realProjectPath, ...relPath.split('/'));
        try {
          const currentHash = await hashFile(currentPath);
          if (currentHash !== expectedHash) {
            throw new Error(
              `Cannot rollback: '${relPath}' has been modified since the repair was applied. Pass --force to overwrite.`
            );
          }
        } catch (e) {
          if (e.code !== 'ENOENT') throw e;
        }
      }
    }

    // 1. Remove files added during repair
    for (const relPath of manifest.added || []) {
      const destPath = path.join(realProjectPath, ...relPath.split('/'));
      if (!isPathInside(realProjectPath, destPath)) {
        throw new Error(`Unsafe rollback target path: ${relPath}`);
      }
      await fs.rm(destPath, { recursive: true, force: true });
      let parentDir = path.dirname(destPath);
      while (parentDir !== realProjectPath && isPathInside(realProjectPath, parentDir)) {
        try {
          await fs.rmdir(parentDir);
          parentDir = path.dirname(parentDir);
        } catch {
          break;
        }
      }
    }

    // 2. Restore modified and deleted files with original permissions
    for (const relPath of [...(manifest.modified || []), ...(manifest.deleted || [])]) {
      const backupSrc = path.join(targetDir, 'files', ...relPath.split('/'));
      const destPath = path.join(realProjectPath, ...relPath.split('/'));
      if (!isPathInside(realProjectPath, destPath)) {
        throw new Error(`Unsafe rollback target path: ${relPath}`);
      }
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      const realParent = await fs.realpath(path.dirname(destPath));
      if (!isPathInside(realProjectPath, realParent)) {
        throw new Error(`Unsafe rollback parent path: ${relPath}`);
      }
      await fs.copyFile(backupSrc, destPath);
      if (manifest.modes && typeof manifest.modes[relPath] === 'number') {
        await fs.chmod(destPath, manifest.modes[relPath]);
      }
    }

    // Mark status as rolled back in the manifest on disk if it was applied
    if (manifest.status === 'APPLIED') {
      manifest.status = 'ROLLED_BACK';
    }
    manifest.rolledBackAt = new Date().toISOString();
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8').catch(() => {});

    return manifest;
  }

  static async getHistory(options = {}) {
    const rollbackRootDir = options.rollbackRootDir || process.env.DEVFIX_ROLLBACK_DIR || DEFAULT_ROLLBACK_ROOT;
    const all = await StagingWorkspace.listRollbacks(rollbackRootDir);
    let filtered = all;
    if (options.projectPath) {
      const resolved = path.resolve(options.projectPath);
      let real = resolved;
      try {
        real = await fs.realpath(resolved);
      } catch {}
      filtered = all.filter((m) => m.projectPath === real || m.projectPath === resolved);
    }
    const limit = options.limit || 10;
    return filtered.slice(0, limit).map((m) => ({
      rollbackId: m.rollbackId,
      timestamp: m.timestamp,
      projectPath: m.projectPath,
      status: m.status || 'UNKNOWN',
      diffSummary: m.diffSummary || {
        added: (m.added || []).length,
        modified: (m.modified || []).length,
        deleted: (m.deleted || []).length,
      },
      files: {
        added: m.added || [],
        modified: m.modified || [],
        deleted: m.deleted || [],
      },
      canRollback: m.status !== 'ROLLED_BACK' && m.status !== 'PARTIAL_FAILURE',
    }));
  }

  static async getRollbackDiff(rollbackId, options = {}) {
    const rollbackRootDir = options.rollbackRootDir || process.env.DEVFIX_ROLLBACK_DIR || DEFAULT_ROLLBACK_ROOT;
    const history = await StagingWorkspace.getHistory({ rollbackRootDir, limit: 100 });
    let match = null;
    if (rollbackId) {
      match = history.find((h) => h.rollbackId === rollbackId);
      if (!match) throw new Error(`Rollback snapshot not found: ${rollbackId}`);
    } else if (options.projectPath) {
      const resolved = path.resolve(options.projectPath);
      let real = resolved;
      try {
        real = await fs.realpath(resolved);
      } catch {}
      match = history.find((h) => h.projectPath === real || h.projectPath === resolved);
      if (!match) throw new Error(`No repair history found for project ${options.projectPath}`);
    } else {
      match = history[0];
      if (!match) throw new Error('No repair history found.');
    }
    return match;
  }

  async cleanup() {
    if (this.stagingPath) {
      await fs.rm(this.stagingPath, { recursive: true, force: true });
      this.stagingPath = null;
      this.realStagingPath = null;
    }
  }
}

