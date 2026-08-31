import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ProjectDetector } from '../src/project/Detector.js';
import { LANGUAGES, RUNTIMES, PACKAGE_MANAGERS, CONFIDENCE } from '../src/project/Types.js';

test('ProjectDetector', async (t) => {
  let tmpDir;

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devfix-test-'));
  });

  t.afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('detects pure Node.js/JavaScript project', async () => {
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
  });

  await t.test('detects TypeScript project from tsconfig', async () => {
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

  await t.test('detects TypeScript project from package.json dependencies', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
      devDependencies: { typescript: '^5.0.0' }
    }));
    await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');

    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.TYPESCRIPT);
    assert.strictEqual(context.runtime, RUNTIMES.NODE);
    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.PNPM);
    assert.strictEqual(context.confidence, CONFIDENCE.HIGH);
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
    assert.strictEqual(context.packageManager, PACKAGE_MANAGERS.UNKNOWN); // Doesn't know because no lockfile and couldn't parse
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
    // Both JS and Python exist, but python has requirements and pytest, JS only has a script.js
    await fs.writeFile(path.join(tmpDir, 'script.js'), '');
    await fs.writeFile(path.join(tmpDir, 'requirements.txt'), '');
    await fs.writeFile(path.join(tmpDir, 'pytest.ini'), '');
    
    const context = await ProjectDetector.inspect(tmpDir);

    assert.strictEqual(context.language, LANGUAGES.PYTHON);
    assert.strictEqual(context.runtime, RUNTIMES.PYTHON);
    assert.strictEqual(context.confidence, CONFIDENCE.HIGH);
  });
});
