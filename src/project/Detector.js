import fs from 'fs/promises';
import path from 'path';
import {
  LANGUAGES,
  RUNTIMES,
  PACKAGE_MANAGERS,
  CONFIDENCE,
  DEFAULT_DOCKER_IMAGES,
  createEmptyProjectContext,
} from './Types.js';

export class ProjectDetector {
  /**
   * Inspects a directory to determine project metadata, runtime versions,
   * package managers, workspace layout, and appropriate execution environment.
   * @param {string} projectPath
   * @returns {Promise<Object>} ProjectContext
   */
  static async inspect(projectPath) {
    const context = createEmptyProjectContext();

    let entries = [];
    try {
      entries = await fs.readdir(projectPath, { withFileTypes: true });
    } catch (e) {
      context.evidence.push(`Failed to read directory: ${e.message}`);
      return context;
    }

    if (entries.length === 0) {
      context.evidence.push('Directory is empty.');
      return context;
    }

    const files = entries.filter((e) => e.isFile() || e.isSymbolicLink()).map((e) => e.name);
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    // 1. Detect virtual environments
    this._detectVirtualEnv(projectPath, dirs, context);

    // 2. Detect Node ecosystem
    await this._detectNode(projectPath, files, context);

    // 3. Detect Python ecosystem
    await this._detectPython(projectPath, files, context);

    // 4. Resolve multi-language or mixed environment
    this._resolveEcosystemPrecedence(context, files);

    // 5. Detect lockfile and package manager conflicts
    this._detectConflicts(context);

    // 6. Select appropriate Docker sandbox image
    context.dockerImage = this.resolveDockerImage(context);

    // If both failed
    if (context.language === LANGUAGES.UNKNOWN && context.runtime === RUNTIMES.UNKNOWN) {
      context.evidence.push('No recognized project indicators found.');
    }

    return context;
  }

  static _detectVirtualEnv(projectPath, dirs, context) {
    const venvNames = ['.venv', 'venv', 'env'];
    for (const name of venvNames) {
      if (dirs.includes(name)) {
        context.hasVirtualEnv = true;
        context.virtualEnvPath = name;
        context.evidence.push(`Found virtual environment directory: ${name}`);
        break;
      }
    }
  }

  static async _detectNode(projectPath, files, context) {
    let packageJson = null;
    let nodeScore = 0;

    if (files.includes('package.json')) {
      context.files.push('package.json');
      context.runtime = RUNTIMES.NODE;
      context.language = LANGUAGES.JAVASCRIPT;
      nodeScore += 3;
      context.evidence.push('Found package.json');

      try {
        const pkgContent = await fs.readFile(path.join(projectPath, 'package.json'), 'utf8');
        packageJson = JSON.parse(pkgContent);

        // Scripts & commands
        if (packageJson.scripts) {
          if (packageJson.scripts.test) context.commands.test = 'npm test';
          if (packageJson.scripts.build) context.commands.build = 'npm run build';
          if (packageJson.scripts.start) context.commands.start = 'npm start';
        }

        // TypeScript dependency
        const allDeps = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {}),
        };
        if (allDeps.typescript) {
          context.language = LANGUAGES.TYPESCRIPT;
          nodeScore += 2;
          context.evidence.push('Found typescript dependency in package.json');
        }

        // Node version engines declaration
        if (packageJson.engines && packageJson.engines.node) {
          context.runtimeVersion = packageJson.engines.node;
          context.evidence.push(`Found engines.node declaration: ${packageJson.engines.node}`);
        }

        // Corepack packageManager declaration
        if (packageJson.packageManager && typeof packageJson.packageManager === 'string') {
          const [pmName, pmVersion] = packageJson.packageManager.split('@');
          context.packageManagerDeclared = pmName.toLowerCase();
          context.packageManager = pmName.toLowerCase();
          if (pmVersion) context.packageManagerVersion = pmVersion;
          context.evidence.push(`Found packageManager field in package.json: ${packageJson.packageManager}`);
        }

        // Monorepo workspaces
        if (packageJson.workspaces) {
          context.isMonorepo = true;
          if (Array.isArray(packageJson.workspaces)) {
            context.workspaces = packageJson.workspaces;
          } else if (packageJson.workspaces.packages && Array.isArray(packageJson.workspaces.packages)) {
            context.workspaces = packageJson.workspaces.packages;
          }
          context.evidence.push(`Found workspaces configuration in package.json: ${JSON.stringify(context.workspaces)}`);
        }
      } catch (e) {
        context.evidence.push('package.json exists but could not be parsed as JSON');
      }
    }

    // Version files (.nvmrc, .node-version)
    if (files.includes('.nvmrc')) {
      context.files.push('.nvmrc');
      try {
        const nvmrc = (await fs.readFile(path.join(projectPath, '.nvmrc'), 'utf8')).trim();
        if (nvmrc) {
          context.runtimeVersion = nvmrc;
          context.evidence.push(`Found .nvmrc: ${nvmrc}`);
        }
      } catch {}
    } else if (files.includes('.node-version')) {
      context.files.push('.node-version');
      try {
        const nv = (await fs.readFile(path.join(projectPath, '.node-version'), 'utf8')).trim();
        if (nv) {
          context.runtimeVersion = nv;
          context.evidence.push(`Found .node-version: ${nv}`);
        }
      } catch {}
    }

    if (files.includes('tsconfig.json')) {
      context.files.push('tsconfig.json');
      context.language = LANGUAGES.TYPESCRIPT;
      context.runtime = RUNTIMES.NODE;
      nodeScore += 3;
      context.evidence.push('Found tsconfig.json');
    }

    if (files.includes('pnpm-workspace.yaml')) {
      context.files.push('pnpm-workspace.yaml');
      context.isMonorepo = true;
      context.packageManager = PACKAGE_MANAGERS.PNPM;
      context.evidence.push('Found pnpm-workspace.yaml (pnpm monorepo)');
    }

    if (files.includes('lerna.json')) {
      context.files.push('lerna.json');
      context.isMonorepo = true;
      context.evidence.push('Found lerna.json (Lerna monorepo)');
    }

    // Node lockfile detection
    const nodeLockfiles = [];
    if (files.includes('package-lock.json')) nodeLockfiles.push('package-lock.json');
    if (files.includes('npm-shrinkwrap.json')) nodeLockfiles.push('npm-shrinkwrap.json');
    if (files.includes('yarn.lock')) nodeLockfiles.push('yarn.lock');
    if (files.includes('pnpm-lock.yaml')) nodeLockfiles.push('pnpm-lock.yaml');
    if (files.includes('bun.lockb')) nodeLockfiles.push('bun.lockb');
    if (files.includes('bun.lock')) nodeLockfiles.push('bun.lock');

    for (const lf of nodeLockfiles) {
      context.files.push(lf);
      context.lockfiles.push(lf);
    }

    // Assign primary package manager from lockfiles
    if (nodeLockfiles.includes('pnpm-lock.yaml')) {
      context.packageManager = PACKAGE_MANAGERS.PNPM;
      context.lockfile = 'pnpm-lock.yaml';
      context.evidence.push('Found pnpm-lock.yaml (pnpm)');
      if (context.commands.test === 'npm test') context.commands.test = 'pnpm test';
      if (context.commands.start === 'npm start') context.commands.start = 'pnpm start';
    } else if (nodeLockfiles.includes('yarn.lock')) {
      context.packageManager = PACKAGE_MANAGERS.YARN;
      context.lockfile = 'yarn.lock';
      context.evidence.push('Found yarn.lock (yarn)');
      if (context.commands.test === 'npm test') context.commands.test = 'yarn test';
      if (context.commands.start === 'npm start') context.commands.start = 'yarn start';
    } else if (nodeLockfiles.includes('bun.lockb') || nodeLockfiles.includes('bun.lock')) {
      context.packageManager = PACKAGE_MANAGERS.BUN;
      context.lockfile = nodeLockfiles.includes('bun.lockb') ? 'bun.lockb' : 'bun.lock';
      context.evidence.push(`Found ${context.lockfile} (bun)`);
      if (context.commands.test === 'npm test') context.commands.test = 'bun test';
      if (context.commands.start === 'npm start') context.commands.start = 'bun start';
    } else if (nodeLockfiles.includes('package-lock.json') || nodeLockfiles.includes('npm-shrinkwrap.json')) {
      context.packageManager = PACKAGE_MANAGERS.NPM;
      context.lockfile = nodeLockfiles.includes('package-lock.json') ? 'package-lock.json' : 'npm-shrinkwrap.json';
      context.evidence.push(`Found ${context.lockfile} (npm)`);
    } else if (packageJson && context.packageManager === PACKAGE_MANAGERS.UNKNOWN) {
      context.packageManager = PACKAGE_MANAGERS.NPM;
    }

    if (nodeScore >= 2) {
      context.confidence = nodeScore >= 4 ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM;
    }

    // Raw JS/TS source fallback
    if (context.language === LANGUAGES.UNKNOWN) {
      const hasTs = files.some((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
      const hasJs = files.some((f) => f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.mjs') || f.endsWith('.cjs'));
      if (hasTs) {
        context.language = LANGUAGES.TYPESCRIPT;
        context.runtime = RUNTIMES.NODE;
        context.confidence = CONFIDENCE.LOW;
        context.evidence.push('Found TypeScript source files (.ts/.tsx)');
      } else if (hasJs) {
        context.language = LANGUAGES.JAVASCRIPT;
        context.runtime = RUNTIMES.NODE;
        context.confidence = CONFIDENCE.LOW;
        context.evidence.push('Found JavaScript source files (.js/.jsx)');
      }
    }
  }

  static async _detectPython(projectPath, files, context) {
    let pythonScore = 0;
    const pythonLockfiles = [];

    // Python version files
    if (files.includes('.python-version')) {
      context.files.push('.python-version');
      try {
        const pv = (await fs.readFile(path.join(projectPath, '.python-version'), 'utf8')).trim();
        if (pv) {
          context.runtimeVersion = pv;
          context.evidence.push(`Found .python-version: ${pv}`);
          pythonScore += 1;
        }
      } catch {}
    } else if (files.includes('runtime.txt')) {
      try {
        const rt = (await fs.readFile(path.join(projectPath, 'runtime.txt'), 'utf8')).trim();
        if (rt.toLowerCase().includes('python')) {
          context.files.push('runtime.txt');
          context.runtimeVersion = rt;
          context.evidence.push(`Found runtime.txt: ${rt}`);
          pythonScore += 1;
        }
      } catch {}
    }

    // Requirements & setup files
    if (files.includes('requirements.txt')) {
      context.files.push('requirements.txt');
      pythonScore += 2;
      if (context.packageManager === PACKAGE_MANAGERS.UNKNOWN) {
        context.packageManager = PACKAGE_MANAGERS.PIP;
      }
      context.evidence.push('Found requirements.txt (pip)');
    }

    if (files.includes('setup.py') || files.includes('setup.cfg')) {
      const fn = files.includes('setup.py') ? 'setup.py' : 'setup.cfg';
      context.files.push(fn);
      pythonScore += 1;
      context.evidence.push(`Found ${fn}`);
    }

    // Poetry lock
    if (files.includes('poetry.lock')) {
      pythonLockfiles.push('poetry.lock');
      context.files.push('poetry.lock');
      context.packageManager = PACKAGE_MANAGERS.POETRY;
      context.lockfile = 'poetry.lock';
      pythonScore += 3;
      context.evidence.push('Found poetry.lock (Poetry)');
    }

    // uv lock
    if (files.includes('uv.lock')) {
      pythonLockfiles.push('uv.lock');
      context.files.push('uv.lock');
      context.packageManager = PACKAGE_MANAGERS.UV;
      context.lockfile = 'uv.lock';
      pythonScore += 3;
      context.evidence.push('Found uv.lock (uv)');
    }

    // Pipenv lock
    if (files.includes('Pipfile.lock') || files.includes('Pipfile')) {
      const pfn = files.includes('Pipfile.lock') ? 'Pipfile.lock' : 'Pipfile';
      if (files.includes('Pipfile.lock')) pythonLockfiles.push('Pipfile.lock');
      context.files.push(pfn);
      context.packageManager = PACKAGE_MANAGERS.PIPENV;
      context.lockfile = files.includes('Pipfile.lock') ? 'Pipfile.lock' : null;
      pythonScore += 2;
      context.evidence.push(`Found ${pfn} (Pipenv)`);
    }

    // Conda environment
    if (files.includes('environment.yml') || files.includes('environment.yaml')) {
      const envFn = files.includes('environment.yml') ? 'environment.yml' : 'environment.yaml';
      context.files.push(envFn);
      context.packageManager = PACKAGE_MANAGERS.CONDA;
      pythonScore += 2;
      context.evidence.push(`Found ${envFn} (Conda)`);
    }

    // Pyproject.toml inspection
    if (files.includes('pyproject.toml')) {
      context.files.push('pyproject.toml');
      pythonScore += 2;
      context.evidence.push('Found pyproject.toml');

      try {
        const tomlContent = await fs.readFile(path.join(projectPath, 'pyproject.toml'), 'utf8');

        // Extract Python version declaration
        const pyVerMatch =
          tomlContent.match(/requires-python\s*=\s*["']([^"']+)["']/i) ||
          tomlContent.match(/python\s*=\s*["']([^"']+)["']/i);
        if (pyVerMatch && !context.runtimeVersion) {
          context.runtimeVersion = pyVerMatch[1];
          context.evidence.push(`Found requires-python in pyproject.toml: ${pyVerMatch[1]}`);
        }

        // Check tool configurations
        if (tomlContent.includes('[tool.poetry]')) {
          if (context.packageManager === PACKAGE_MANAGERS.UNKNOWN || context.packageManager === PACKAGE_MANAGERS.PIP) {
            context.packageManager = PACKAGE_MANAGERS.POETRY;
          }
          context.evidence.push('Found [tool.poetry] configuration in pyproject.toml');
        } else if (tomlContent.includes('[tool.uv]')) {
          if (context.packageManager === PACKAGE_MANAGERS.UNKNOWN || context.packageManager === PACKAGE_MANAGERS.PIP) {
            context.packageManager = PACKAGE_MANAGERS.UV;
          }
          context.evidence.push('Found [tool.uv] configuration in pyproject.toml');
        } else if (context.packageManager === PACKAGE_MANAGERS.UNKNOWN) {
          context.packageManager = PACKAGE_MANAGERS.POETRY;
        }

        if (tomlContent.includes('tool.pytest') || tomlContent.includes('[tool.pytest.ini_options]')) {
          context.commands.test = 'pytest';
          context.evidence.push('Found pytest configuration in pyproject.toml');
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    if (files.includes('pytest.ini') || files.includes('conftest.py')) {
      const tf = files.includes('pytest.ini') ? 'pytest.ini' : 'conftest.py';
      context.files.push(tf);
      context.commands.test = 'pytest';
      pythonScore += 2;
      context.evidence.push('Found pytest indicators');
    }

    const pyFiles = files.filter((f) => f.endsWith('.py'));
    if (pyFiles.length > 0) {
      pythonScore += 1;
      context.evidence.push(`Found ${pyFiles.length} .py source files`);

      if (pyFiles.includes('main.py')) {
        context.commands.start = 'python main.py';
      } else if (pyFiles.includes('app.py')) {
        context.commands.start = 'python app.py';
      }
    }

    for (const lf of pythonLockfiles) {
      context.lockfiles.push(lf);
    }

    context._pythonScore = pythonScore;
  }

  static _resolveEcosystemPrecedence(context, files) {
    const hasConfigSignals =
      files.includes('package.json') ||
      files.includes('package-lock.json') ||
      files.includes('yarn.lock') ||
      files.includes('pnpm-lock.yaml') ||
      files.includes('bun.lock') ||
      files.includes('bun.lockb') ||
      files.includes('tsconfig.json');
    const hasNodeSignals = context.runtime === RUNTIMES.NODE || hasConfigSignals;
    const pythonScore = context._pythonScore || 0;
    delete context._pythonScore;

    // Both strong Node and strong Python signals = MIXED
    if (hasNodeSignals && pythonScore >= 3 && files.includes('package.json') && files.includes('pyproject.toml')) {
      context.language = LANGUAGES.MIXED;
      context.runtime = RUNTIMES.MIXED;
      context.confidence = CONFIDENCE.HIGH;
      context.evidence.push('Detected mixed Node.js and Python environment in repository');
      return;
    }

    // Pure Python project
    if (pythonScore >= 2 && (!hasConfigSignals || pythonScore > 3)) {
      context.language = LANGUAGES.PYTHON;
      context.runtime = RUNTIMES.PYTHON;
      context.confidence = pythonScore >= 3 ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM;
      return;
    }

    // Pure Node project
    if (hasNodeSignals) {
      context.runtime = RUNTIMES.NODE;
      if (context.language === LANGUAGES.UNKNOWN) {
        context.language = LANGUAGES.JAVASCRIPT;
      }
      if (!hasConfigSignals && context.confidence === CONFIDENCE.LOW) {
        // Keep LOW confidence for raw source files without config
      } else {
        context.confidence = CONFIDENCE.HIGH;
      }
    }
  }

  static _detectConflicts(context) {
    // Check multiple conflicting lockfiles
    if (context.lockfiles.length > 1) {
      const msg = `Multiple lockfiles detected: ${context.lockfiles.join(', ')}`;
      context.conflicts.push(msg);
      context.evidence.push(`Warning: ${msg}`);
    }

    // Check package.json packageManager vs lockfile conflict
    if (context.packageManagerDeclared && context.lockfile) {
      const declared = context.packageManagerDeclared.toLowerCase();
      const lock = context.lockfile.toLowerCase();
      let hasMismatch = false;
      if (declared === PACKAGE_MANAGERS.PNPM && !lock.includes('pnpm')) hasMismatch = true;
      if (declared === PACKAGE_MANAGERS.YARN && !lock.includes('yarn')) hasMismatch = true;
      if (declared === PACKAGE_MANAGERS.BUN && !lock.includes('bun')) hasMismatch = true;
      if (declared === PACKAGE_MANAGERS.NPM && !lock.includes('package-lock') && !lock.includes('shrinkwrap')) hasMismatch = true;

      if (hasMismatch) {
        const msg = `Package manager declaration (${context.packageManagerDeclared}) conflicts with lockfile (${context.lockfile})`;
        context.conflicts.push(msg);
        context.evidence.push(`Warning: ${msg}`);
      }
    }
  }

  /**
   * Resolves the recommended standard Docker base image based on runtime and version requirements.
   * @param {Object} context
   * @returns {string} Docker base image
   */
  static resolveDockerImage(context) {
    if (!context || !context.runtime) {
      return DEFAULT_DOCKER_IMAGES.NODE_DEFAULT;
    }

    const versionStr = String(context.runtimeVersion || '').toLowerCase();

    if (context.runtime === RUNTIMES.PYTHON) {
      if (versionStr.includes('3.12')) return DEFAULT_DOCKER_IMAGES.PYTHON_312;
      if (versionStr.includes('3.10')) return DEFAULT_DOCKER_IMAGES.PYTHON_310;
      return DEFAULT_DOCKER_IMAGES.PYTHON_311;
    }

    if (context.runtime === RUNTIMES.NODE) {
      if (versionStr.includes('22') || versionStr.includes('^22') || versionStr.includes('>=22')) {
        return DEFAULT_DOCKER_IMAGES.NODE_22;
      }
      if (versionStr.includes('18') || versionStr.includes('^18') || (versionStr.includes('>=18') && !versionStr.includes('20'))) {
        return DEFAULT_DOCKER_IMAGES.NODE_18;
      }
      return DEFAULT_DOCKER_IMAGES.NODE_20;
    }

    // Default stable Node LTS
    return DEFAULT_DOCKER_IMAGES.NODE_DEFAULT;
  }
}
