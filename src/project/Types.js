export const LANGUAGES = {
  JAVASCRIPT: 'JavaScript',
  TYPESCRIPT: 'TypeScript',
  PYTHON: 'Python',
  UNKNOWN: 'Unknown'
};

export const RUNTIMES = {
  NODE: 'Node.js',
  PYTHON: 'Python',
  UNKNOWN: 'Unknown'
};

export const PACKAGE_MANAGERS = {
  NPM: 'npm',
  YARN: 'yarn',
  PNPM: 'pnpm',
  PIP: 'pip',
  POETRY: 'poetry',
  UNKNOWN: 'Unknown'
};

export const CONFIDENCE = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

export function createEmptyProjectContext() {
  return {
    language: LANGUAGES.UNKNOWN,
    runtime: RUNTIMES.UNKNOWN,
    packageManager: PACKAGE_MANAGERS.UNKNOWN,
    commands: {},
    files: [],
    evidence: [],
    confidence: CONFIDENCE.LOW,
    sandbox: 'Docker' // Default per spec
  };
}
