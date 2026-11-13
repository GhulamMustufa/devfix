import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ProjectDetector } from '../src/project/Detector.js';
import { LANGUAGES, RUNTIMES, PACKAGE_MANAGERS, CONFIDENCE, DEFAULT_DOCKER_IMAGES } from '../src/project/Types.js';

test('ProjectDetector', async (t) => {
  let tmpDir;

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devfix-test-'));
  });

  t.afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('detects pure Node.js/JavaScript project with npm', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { test: 'jest', start: 'node index.js' },
      dependencies: { express: '*' }
    }));
    await fs.writeFile(path.join(tmpDir, 'package-lock.json'), '{}');
    await fs.writeFile(path.join(tmpDir, 'index.js'), 'console.log("hi");');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.JAVASCRIPT);
    assert.strictEqual(context.runtime, RUNTIMES.NODE);
    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.NPM);
    assert.strictEqual(context.confidence, CONFIDENCE.HIGH);
    assert.strictEqual(context.commands.test, 'npm test');
    assert.strictEqual(context.commands.start, 'npm start');
    assert.strictEqual(context.dockerImage, DEFAULT_DOCKER_IMAGES.NODE_DEFAULT);
  });

  await t.test('detects TypeScript project from tsconfig and yarn', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), '{}');
    await fs.writeFile(path.join(tmpDir, 'yarn.lock'), '');
    await fs.writeFile(path.join(tmpDir, 'tsconfig.json'), '{}');
    await fs.writeFile(path.join(tmpDir, 'index.ts'), '');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.TYPESCRIPT);
    assert.strictEqual(context.runtime, RUNTIMES.NODE);
    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.YARN);
    assert.strictEqual(context.confidence, CONFIDENCE.HIGH);
  });

  await t.test('detects pnpm from pnpm-lock.yaml', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { test: 'vitest' },
      devDependencies: { typescript: '^5.0.0' }
    }));
    await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.TYPESCRIPT);
    assert.strictEqual(context.runtime, RUNTIMES.NODE);
    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.PNPM);
    assert.strictEqual(context.lockfile, 'pnpm-lock.yaml');
    assert.strictEqual(context.commands.test, 'pnpm test');
  });

  await t.test('detects Bun from bun.lock / bun.lockb', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { test: 'bun test' }
    }));
    await fs.writeFile(path.join(tmpDir, 'bun.lockb'), '');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.JAVASCRIPT);
    assert.strictEqual(context.runtime, RUNTIMES.NODE);
    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.BUN);
    assert.strictEqual(context.lockfile, 'bun.lockb');
    assert.strictEqual(context.commands.test, 'bun test');
  });

  await t.test('detects Corepack packageManager declaration in package.json', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'corepack-sample',
      packageManager: 'pnpm@9.5.0'
    }));

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.PNPM);
    assert.strictEqual(context.packageManagerVersion, '9.5.0');
    assert.ok(context.evidence.some(e => e.includes('Found packageManager field in package.json')));
  });

  await t.test('detects Node version from engines.node in package.json', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'node18-sample',
      engines: { node: '>=18.0.0 <19' }
    }));

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.runtimeVersion, '>=18.0.0 <19');
    assert.strictEqual(context.dockerImage, DEFAULT_DOCKER_IMAGES.NODE_18);
  });

  await t.test('detects Node version from .nvmrc and maps to node:22-alpine', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), '{}');
    await fs.writeFile(path.join(tmpDir, '.nvmrc'), 'v22.11.0\n');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.runtimeVersion, 'v22.11.0');
    assert.strictEqual(context.dockerImage, DEFAULT_DOCKER_IMAGES.NODE_22);
  });

  await t.test('detects Node version from .node-version and maps to node:20-alpine', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), '{}');
    await fs.writeFile(path.join(tmpDir, '.node-version'), '20.14.0\n');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.runtimeVersion, '20.14.0');
    assert.strictEqual(context.dockerImage, DEFAULT_DOCKER_IMAGES.NODE_20);
  });

  await t.test('detects npm monorepo from package.json workspaces array', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'monorepo-root',
      workspaces: ['packages/*', 'apps/*']
    }));

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.isMonorepo, true);
    assert.deepStrictEqual(context.workspaces, ['packages/*', 'apps/*']);
  });

  await t.test('detects pnpm monorepo from pnpm-workspace.yaml', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), '{}');
    await fs.writeFile(path.join(tmpDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/**"\n');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.isMonorepo, true);
    assert.ok(context.files.includes('pnpm-workspace.yaml'));
  });

  await t.test('detects Python project from requirements.txt', async () => {
    await fs.writeFile(path.join(tmpDir, 'requirements.txt'), 'flask');
    await fs.writeFile(path.join(tmpDir, 'app.py'), 'print("hi")');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.PYTHON);
    assert.strictEqual(context.runtime, RUNTIMES.PYTHON);
    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.PIP);
    assert.strictEqual(context.confidence, CONFIDENCE.HIGH);
    assert.strictEqual(context.commands.start, 'python app.py');
    assert.strictEqual(context.dockerImage, DEFAULT_DOCKER_IMAGES.PYTHON_DEFAULT);
  });

  await t.test('detects Python project from pyproject.toml', async () => {
    await fs.writeFile(path.join(tmpDir, 'pyproject.toml'), '[tool.pytest]');
    await fs.writeFile(path.join(tmpDir, 'main.py'), '');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.PYTHON);
    assert.strictEqual(context.runtime, RUNTIMES.PYTHON);
    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.POETRY);
    assert.strictEqual(context.commands.test, 'pytest');
    assert.strictEqual(context.commands.start, 'python main.py');
  });

  await t.test('detects uv package manager from uv.lock and [tool.uv]', async () => {
    await fs.writeFile(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "demo"\n[tool.uv]\ndev-dependencies = []\n');
    await fs.writeFile(path.join(tmpDir, 'uv.lock'), '');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.PYTHON);
    assert.strictEqual(context.runtime, RUNTIMES.PYTHON);
    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.UV);
    assert.strictEqual(context.lockfile, 'uv.lock');
  });

  await t.test('detects Poetry from poetry.lock', async () => {
    await fs.writeFile(path.join(tmpDir, 'pyproject.toml'), '[tool.poetry]\nname = "demo"\n');
    await fs.writeFile(path.join(tmpDir, 'poetry.lock'), '');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.POETRY);
    assert.strictEqual(context.lockfile, 'poetry.lock');
  });

  await t.test('detects Pipenv from Pipfile.lock', async () => {
    await fs.writeFile(path.join(tmpDir, 'Pipfile'), '');
    await fs.writeFile(path.join(tmpDir, 'Pipfile.lock'), '{}');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.PYTHON);
    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.PIPENV);
    assert.strictEqual(context.lockfile, 'Pipfile.lock');
  });

  await t.test('detects Conda from environment.yml', async () => {
    await fs.writeFile(path.join(tmpDir, 'environment.yml'), 'name: myenv\ndependencies:\n  - python=3.10\n');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.PYTHON);
    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.CONDA);
  });

  await t.test('detects Python version from .python-version and maps to python:3.10-slim', async () => {
    await fs.writeFile(path.join(tmpDir, 'requirements.txt'), 'numpy\n');
    await fs.writeFile(path.join(tmpDir, '.python-version'), '3.10.12\n');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.runtimeVersion, '3.10.12');
    assert.strictEqual(context.dockerImage, DEFAULT_DOCKER_IMAGES.PYTHON_310);
  });

  await t.test('detects Python version from pyproject.toml requires-python (3.12)', async () => {
    await fs.writeFile(path.join(tmpDir, 'pyproject.toml'), '[project]\nrequires-python = ">=3.12"\n');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.runtimeVersion, '>=3.12');
    assert.strictEqual(context.dockerImage, DEFAULT_DOCKER_IMAGES.PYTHON_312);
  });

  await t.test('detects virtual environment in .venv directory', async () => {
    await fs.mkdir(path.join(tmpDir, '.venv'));
    await fs.writeFile(path.join(tmpDir, '.venv', 'pyvenv.cfg'), 'home = /usr/bin\n');
    await fs.writeFile(path.join(tmpDir, 'app.py'), 'print("test")');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.hasVirtualEnv, true);
    assert.strictEqual(context.virtualEnvPath, '.venv');
  });

  await t.test('detects conflicting multiple lockfiles', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), '{}');
    await fs.writeFile(path.join(tmpDir, 'package-lock.json'), '{}');
    await fs.writeFile(path.join(tmpDir, 'yarn.lock'), '');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.lockfiles.length, 2);
    assert.ok(context.conflicts.some(c => c.includes('Multiple lockfiles detected')));
  });

  await t.test('detects conflict between packageManager declaration and lockfile', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
      packageManager: 'pnpm@9.0.0'
    }));
    await fs.writeFile(path.join(tmpDir, 'yarn.lock'), '');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.ok(context.conflicts.some(c => c.includes('Package manager declaration') && c.includes('conflicts with lockfile')));
  });

  await t.test('detects mixed Node.js and Python repository', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'frontend', scripts: { build: 'vite' } }));
    await fs.writeFile(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "backend"\nrequires-python = ">=3.11"\n');
    await fs.writeFile(path.join(tmpDir, 'poetry.lock'), '');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.MIXED);
    assert.strictEqual(context.runtime, RUNTIMES.MIXED);
    assert.ok(context.evidence.some(e => e.includes('mixed Node.js and Python')));
  });

  await t.test('gracefully handles empty directory', async () => {
    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.UNKNOWN);
    assert.strictEqual(context.runtime, RUNTIMES.UNKNOWN);
    assert.ok(context.evidence.includes('Directory is empty.'));
  });

  await t.test('gracefully handles malformed package.json', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), '{ malformed json }');
    
    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.JAVASCRIPT);
    assert.strictEqual(context.runtime, RUNTIMES.NODE);
    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.UNKNOWN);
    assert.ok(context.evidence.includes('package.json exists but could not be parsed as JSON'));
  });

  await t.test('infers JS purely from .js files if no configs exist', async () => {
    await fs.writeFile(path.join(tmpDir, 'script.js'), 'let x = 1;');
    
    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.JAVASCRIPT);
    assert.strictEqual(context.runtime, RUNTIMES.NODE);
    assert.strictEqual(context.confidence, CONFIDENCE.LOW);
  });

  await t.test('ambiguous project - Python takes over if strong signals and weak Node signals', async () => {
    await fs.writeFile(path.join(tmpDir, 'script.js'), '');
    await fs.writeFile(path.join(tmpDir, 'requirements.txt'), '');
    await fs.writeFile(path.join(tmpDir, 'pytest.ini'), '');
    
    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.PYTHON);
    assert.strictEqual(context.runtime, RUNTIMES.PYTHON);
    assert.strictEqual(context.confidence, CONFIDENCE.HIGH);
  });
});

import { ProjectFormatter } from '../src/project/Formatter.js';

test('ProjectFormatter', async (t) => {
  await t.test('formats full context with Phase 3 fields', () => {
    const fakeContext = {
      language: 'JavaScript',
      runtime: 'Node.js',
      runtimeVersion: '>=20.0.0',
      packageManager: 'pnpm',
      packageManagerVersion: '9.4.0',
      lockfile: 'pnpm-lock.yaml',
      isMonorepo: true,
      workspaces: ['packages/*', 'apps/*'],
      hasVirtualEnv: true,
      virtualEnvPath: '.venv',
      dockerImage: 'node:20-alpine',
      conflicts: ['Multiple lockfiles detected: pnpm-lock.yaml, yarn.lock'],
      files: ['package.json', 'pnpm-lock.yaml'],
      commands: { test: 'pnpm test', build: 'pnpm run build' },
      sandbox: 'Docker',
      status: 'READY'
    };

    const output = ProjectFormatter.formatTerminalOutput('/path/to/project', fakeContext);

    assert(output.includes('Node.js (>=20.0.0)'));
    assert(output.includes('pnpm (9.4.0) via pnpm-lock.yaml'));
    assert(output.includes('Monorepo / Workspaces:'));
    assert(output.includes('packages/*, apps/*'));
    assert(output.includes('Virtual Environment:'));
    assert(output.includes('.venv'));
    assert(output.includes('node:20-alpine'));
    assert(output.includes('Warnings / Conflicts:'));
    assert(output.includes('Multiple lockfiles detected'));
    assert(output.includes('pnpm test'));
  });
});

