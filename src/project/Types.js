export const LANGUAGES = {
  JAVASCRIPT: 'JavaScript',
  TYPESCRIPT: 'TypeScript',
  PYTHON: 'Python',
  MIXED: 'Mixed',
  UNKNOWN: 'Unknown',
};

export const RUNTIMES = {
  NODE: 'Node.js',
  PYTHON: 'Python',
  MIXED: 'Mixed',
  UNKNOWN: 'Unknown',
};

export const PACKAGE_MANAGERS = {
  NPM: 'npm',
  YARN: 'yarn',
  PNPM: 'pnpm',
  BUN: 'bun',
  COREPACK: 'corepack',
  PIP: 'pip',
  POETRY: 'poetry',
  UV: 'uv',
  PIPENV: 'pipenv',
  CONDA: 'conda',
  UNKNOWN: 'Unknown',
};

export const CONFIDENCE = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export const DEFAULT_DOCKER_IMAGES = {
  NODE_DEFAULT: 'node:20-alpine',
  NODE_18: 'node:18-alpine',
  NODE_20: 'node:20-alpine',
  NODE_22: 'node:22-alpine',
  PYTHON_DEFAULT: 'python:3.11-slim',
  PYTHON_310: 'python:3.10-slim',
  PYTHON_311: 'python:3.11-slim',
  PYTHON_312: 'python:3.12-slim',
};

export function createEmptyProjectContext() {
  return {
    language: LANGUAGES.UNKNOWN,
    runtime: RUNTIMES.UNKNOWN,
    runtimeVersion: null,
    packageManager: PACKAGE_MANAGERS.UNKNOWN,
    packageManagerVersion: null,
    packageManagerDeclared: null,
    lockfile: null,
    lockfiles: [],
    conflicts: [],
    isMonorepo: false,
    workspaces: [],
    hasVirtualEnv: false,
    virtualEnvPath: null,
    commands: {},
    files: [],
    evidence: [],
    confidence: CONFIDENCE.LOW,
    dockerImage: DEFAULT_DOCKER_IMAGES.NODE_DEFAULT,
    sandbox: 'Docker',
  };
}
