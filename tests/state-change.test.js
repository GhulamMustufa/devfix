import test from 'node:test';
import assert from 'node:assert';
import { isStateChangingCommand } from '../src/agent/stateChange.js';

test('Phase 2 — State-Change Detection Across Node, Python, and Shell Commands', async (t) => {
  await t.test('detects Node.js package managers mutations (npm, pnpm, yarn, bun, corepack)', () => {
    const mutations = [
      'npm install',
      'npm i express',
      'npm update',
      'npm uninstall cors',
      'npm ci',
      'npm rebuild',
      'yarn add lodash',
      'yarn install',
      'yarn remove chalk',
      'pnpm add dotenv',
      'pnpm i',
      'pnpm install',
      'pnpm remove vue',
      'bun add axios',
      'bun install',
      'corepack enable',
      'npx tsc --init',
    ];

    for (const cmd of mutations) {
      assert.strictEqual(
        isStateChangingCommand(cmd),
        true,
        `Expected '${cmd}' to be recognized as state changing`
      );
    }
  });

  await t.test('detects Python package managers mutations (pip, poetry, uv, conda, pipenv)', () => {
    const pyMutations = [
      'pip install -r requirements.txt',
      'pip install flask',
      'pip3 install requests',
      'python -m pip install pytest',
      'python3 -m pip install numpy',
      'poetry add pandas',
      'poetry install',
      'poetry remove scipy',
      'uv pip install fastapi',
      'uv add pydantic',
      'uv sync',
      'pipenv install django',
      'conda install pytorch',
    ];

    for (const cmd of pyMutations) {
      assert.strictEqual(
        isStateChangingCommand(cmd),
        true,
        `Expected '${cmd}' to be recognized as state changing`
      );
    }
  });

  await t.test('detects file, process, and workspace mutations', () => {
    const fileMutations = [
      'touch .env',
      'mkdir src/utils',
      'rm index.js',
      'rm -rf node_modules',
      'mv old.js new.js',
      'cp config.sample config.json',
      'chmod +x script.sh',
      'chown 1000:1000 app.js',
      'echo "PORT=3000" > .env',
      'printf "data" >> output.txt',
      'sed -i "s/foo/bar/g" app.js',
      'dos2unix entrypoint.sh',
      'tar -xzf archive.tar.gz',
      'kill 1234',
      'pkill -f node',
      'fuser -k 8080/tcp',
      'npm run build',
      'tsc',
      'make',
      'git checkout HEAD -- index.js',
      'git reset --hard',
      'export PORT=8080',
    ];

    for (const cmd of fileMutations) {
      assert.strictEqual(
        isStateChangingCommand(cmd),
        true,
        `Expected '${cmd}' to be recognized as state changing`
      );
    }
  });

  await t.test('does NOT trigger state change for read-only inspection commands', () => {
    const readOnly = [
      'cat package.json',
      'ls -la',
      'pwd',
      'grep -rn "PORT" src/',
      'head -n 20 index.js',
      'tail -f log.txt',
      'node -v',
      'python --version',
      'which node',
      'command -v curl',
      'git status',
      'git log -n 5',
      'git diff',
      'echo "checking status"',
      'tsc --noEmit',
    ];

    for (const cmd of readOnly) {
      assert.strictEqual(
        isStateChangingCommand(cmd),
        false,
        `Expected inspection command '${cmd}' NOT to trigger state change`
      );
    }
  });
});

