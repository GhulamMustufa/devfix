import path from 'path';

function resolveSandboxPath(filepath) {
  // Prevent traversing up
  if (filepath.includes('..')) {
    throw new Error("Path traversal is not allowed.");
  }
  
  // Strip leading slash if present, so we always resolve relative to /app
  let normalized = filepath;
  if (normalized.startsWith('/')) {
    if (!normalized.startsWith('/app/')) {
       throw new Error("Only sandbox-relative paths inside /app are allowed.");
    }
    normalized = normalized.slice(5); // remove /app/
  }
  
  const resolved = path.posix.join('/app', normalized);
  if (!resolved.startsWith('/app')) {
    throw new Error("Path resolves outside the sandbox workspace.");
  }
  return resolved;
}

export { resolveSandboxPath };
