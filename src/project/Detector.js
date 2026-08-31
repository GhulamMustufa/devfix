import fs from 'fs/promises';
import path from 'path';
import {
  LANGUAGES,
  RUNTIMES,
  PACKAGE_MANAGERS,
  CONFIDENCE,
  createEmptyProjectContext
} from './Types.js';

export class ProjectDetector {
  /**
   * Inspects a directory to determine project metadata without running any code.
   * @param {string} projectPath 
   * @returns {Promise<Object>} ProjectContext
   */
  static async inspect(projectPath) {
    const context = createEmptyProjectContext();
    
    let files = [];
    try {
      files = await fs.readdir(projectPath);
    } catch (e) {
      context.evidence.push(`Failed to read directory: ${e.message}`);
      return context;
    }

    if (files.length === 0) {
      context.evidence.push('Directory is empty.');
      return context;
    }

    // Try detecting Node ecosystem
    await this._detectNode(projectPath, files, context);

    // If Node wasn't detected with high confidence, check Python
    if (context.runtime !== RUNTIMES.NODE || context.confidence !== CONFIDENCE.HIGH) {
      await this._detectPython(projectPath, files, context);
    }

    // If both failed
    if (context.language === LANGUAGES.UNKNOWN && context.runtime === RUNTIMES.UNKNOWN) {
      context.evidence.push('No recognized project indicators found.');
    }

    return context;
  }

  static async _detectNode(projectPath, files, context) {
    let packageJson = null;

    if (files.includes('package.json')) {
      context.files.push('package.json');
      context.runtime = RUNTIMES.NODE;
      context.language = LANGUAGES.JAVASCRIPT; // Default to JS, upgrade to TS later
      context.confidence = CONFIDENCE.MEDIUM;
      context.evidence.push('Found package.json');

      try {
        const pkgContent = await fs.readFile(path.join(projectPath, 'package.json'), 'utf8');
        packageJson = JSON.parse(pkgContent);
        
        // Detect commands
        if (packageJson.scripts) {
          if (packageJson.scripts.test) context.commands.test = 'npm test';
          if (packageJson.scripts.build) context.commands.build = 'npm run build';
          if (packageJson.scripts.start) context.commands.start = 'npm start';
        }

        // Check for TS dependency
        const allDeps = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {})
        };
        
        if (allDeps.typescript) {
          context.language = LANGUAGES.TYPESCRIPT;
          context.confidence = CONFIDENCE.HIGH;
          context.evidence.push('Found typescript dependency in package.json');
        }
      } catch (e) {
        context.evidence.push('package.json exists but could not be parsed as JSON');
      }
    }

    if (files.includes('tsconfig.json')) {
      context.files.push('tsconfig.json');
      context.language = LANGUAGES.TYPESCRIPT;
      context.runtime = RUNTIMES.NODE;
      context.confidence = CONFIDENCE.HIGH;
      context.evidence.push('Found tsconfig.json');
    }

    // Identify Package Manager
    if (files.includes('package-lock.json')) {
      context.files.push('package-lock.json');
      context.packageManager = PACKAGE_MANAGERS.NPM;
      context.confidence = CONFIDENCE.HIGH;
      context.evidence.push('Found package-lock.json (npm)');
    } else if (files.includes('yarn.lock')) {
      context.files.push('yarn.lock');
      context.packageManager = PACKAGE_MANAGERS.YARN;
      context.confidence = CONFIDENCE.HIGH;
      context.evidence.push('Found yarn.lock (yarn)');
    } else if (files.includes('pnpm-lock.yaml')) {
      context.files.push('pnpm-lock.yaml');
      context.packageManager = PACKAGE_MANAGERS.PNPM;
      context.confidence = CONFIDENCE.HIGH;
      context.evidence.push('Found pnpm-lock.yaml (pnpm)');
    } else if (packageJson) {
      context.packageManager = PACKAGE_MANAGERS.NPM; // Default fallback if no lockfile but package.json exists
    }

    // If no explicit config files, look for raw .ts or .js files
    if (context.language === LANGUAGES.UNKNOWN) {
      const hasTsFiles = files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      const hasJsFiles = files.some(f => f.endsWith('.js') || f.endsWith('.jsx'));
      
      if (hasTsFiles) {
        context.language = LANGUAGES.TYPESCRIPT;
        context.runtime = RUNTIMES.NODE;
        context.confidence = CONFIDENCE.LOW;
        context.evidence.push('Found .ts source files');
      } else if (hasJsFiles) {
        context.language = LANGUAGES.JAVASCRIPT;
        context.runtime = RUNTIMES.NODE;
        context.confidence = CONFIDENCE.LOW;
        context.evidence.push('Found .js source files');
      }
    }
  }

  static async _detectPython(projectPath, files, context) {
    let pythonScore = 0;

    if (files.includes('requirements.txt')) {
      context.files.push('requirements.txt');
      context.packageManager = PACKAGE_MANAGERS.PIP;
      pythonScore += 2;
      context.evidence.push('Found requirements.txt (pip)');
    }

    if (files.includes('pyproject.toml')) {
      context.files.push('pyproject.toml');
      context.packageManager = PACKAGE_MANAGERS.POETRY; // Broad assumption, often poetry or hatch
      pythonScore += 2;
      context.evidence.push('Found pyproject.toml');
      
      try {
        const tomlContent = await fs.readFile(path.join(projectPath, 'pyproject.toml'), 'utf8');
        if (tomlContent.includes('tool.pytest')) {
          context.commands.test = 'pytest';
          context.evidence.push('Found pytest configuration in pyproject.toml');
        }
      } catch (e) {
        // Ignore read errors safely
      }
    }

    if (files.includes('setup.py')) {
      context.files.push('setup.py');
      pythonScore += 1;
      context.evidence.push('Found setup.py');
    }

    if (files.includes('pytest.ini') || files.includes('conftest.py')) {
      context.files.push(files.includes('pytest.ini') ? 'pytest.ini' : 'conftest.py');
      context.commands.test = 'pytest';
      pythonScore += 2;
      context.evidence.push('Found pytest indicators');
    }

    const pyFiles = files.filter(f => f.endsWith('.py'));
    if (pyFiles.length > 0) {
      pythonScore += 1;
      context.evidence.push(`Found ${pyFiles.length} .py source files`);
      
      if (pyFiles.includes('main.py')) {
        context.commands.start = 'python main.py';
      } else if (pyFiles.includes('app.py')) {
        context.commands.start = 'python app.py';
      }
    }

    if (pythonScore >= 2 && context.confidence !== CONFIDENCE.HIGH) {
      // Override Node if Python score is very high and Node wasn't HIGH
      context.language = LANGUAGES.PYTHON;
      context.runtime = RUNTIMES.PYTHON;
      context.confidence = pythonScore >= 3 ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM;
    }
  }
}
