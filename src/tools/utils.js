import path from 'path';
import { isSensitiveWorkspacePath } from '../workspace/Staging.js';

function resolveSandboxPath(filepath) {
  if (typeof filepath !== 'string' || filepath.length === 0) {
    throw new Error('Filepath must be a non-empty string.');
  }

  // Block null bytes and ASCII control characters
  if (/[\x00-\x1f\x7f]/.test(filepath)) {
    throw new Error('Invalid control characters in filepath.');
  }

  const normalizedInput = filepath.replace(/\\/g, '/');
  const rawSegments = normalizedInput.split('/');

  // Block any explicit '..' traversal segment (allows safe filenames like 'file..bak.js')
  if (rawSegments.includes('..')) {
    throw new Error('Path traversal is not allowed.');
  }

  let relative = normalizedInput;
  if (normalizedInput.startsWith('/')) {
    if (normalizedInput === '/app' || normalizedInput === '/app/') {
      throw new Error('Path must reference a file inside /app.');
    }
    if (!normalizedInput.startsWith('/app/')) {
      throw new Error('Only sandbox-relative paths inside /app are allowed.');
    }
    relative = normalizedInput.slice(5);
  }

  const resolved = path.posix.resolve('/app', relative);
  if (resolved === '/app' || !resolved.startsWith('/app/')) {
    throw new Error('Path resolves outside the sandbox workspace.');
  }
  return resolved;
}

function isSensitiveSandboxPath(resolvedPath) {
  if (!resolvedPath || typeof resolvedPath !== 'string') return false;
  const rel = resolvedPath.startsWith('/app/') ? resolvedPath.slice(5) : resolvedPath;
  return isSensitiveWorkspacePath(rel);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

async function runSandboxScript(sandbox, script, args = [], timeoutMs = 5000) {
  if (typeof sandbox.executeArgs === 'function') {
    return sandbox.executeArgs(script, args, timeoutMs);
  }
  // Fallback for mocked sandboxes that only implement execute(command, timeoutMs)
  const quotedArgs = args.map(shellQuote).join(' ');
  const cmd = `sh -c ${shellQuote(script)} _ ${quotedArgs}`;
  return sandbox.execute(cmd, timeoutMs);
}

export { resolveSandboxPath, isSensitiveSandboxPath, shellQuote, runSandboxScript };
