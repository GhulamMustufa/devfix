/**
 * Deterministic detection of state-changing commands across Node.js, Python,
 * container systems, and shell environments.
 */

// Patterns that mutate dependencies, files, processes, or configurations
const STATE_CHANGING_PATTERNS = [
  // 1. Node.js & JavaScript package managers
  /\b(?:npm|pnpm|bun)\s+(?:install|i|add|update|upgrade|uninstall|rm|remove|ci|rebuild|link)\b/i,
  /\byarn\s+(?:add|install|remove|upgrade)\b/i,
  /^\s*yarn\s*$/m, // bare 'yarn' installs packages
  /\bcorepack\s+(?:enable|prepare|use)\b/i,
  /\bnpx\s+[^\n;&]+\b/i,

  // 2. Python package & environment managers
  /\b(?:python\d*|python3)\s+-m\s+pip\s+(?:install|uninstall)\b/i,
  /\bpip\d*\s+(?:install|uninstall|sync)\b/i,
  /\bpoetry\s+(?:add|install|remove|update|lock)\b/i,
  /\buv\s+(?:pip\s+install|add|sync|lock|remove)\b/i,
  /\bpipenv\s+(?:install|uninstall|sync|update)\b/i,
  /\b(?:conda|mamba)\s+(?:install|remove|update)\b/i,

  // 3. System & container package managers
  /\b(?:apk|apt-get|apt|yum|dnf|pacman)\s+(?:add|del|install|remove|purge)\b/i,

  // 4. File, directory & filesystem mutations
  /\b(?:chmod|chown|chgrp)\s+[^\n;&]+/i,
  /\b(?:mkdir|rmdir|touch|truncate)\s+[^\n;&]+/i,
  /\brm\s+-[^\n;&]*/i,
  /\brm\s+[^\n;&]+/i,
  /\b(?:mv|cp|ln)\s+[^\n;&]+/i,
  /\bsed\s+(?:-i|--in-place)\b/i,
  /\b(?:dos2unix|unix2dos)\s+[^\n;&]+/i,
  /\b(?:tar|unzip|gunzip|gzip)\s+[^\n;&]+/i,
  /\bpatch\s+[^\n;&]+/i,

  // File write redirections (e.g. echo "foo" > bar, cat <<EOF > file)
  /(?:^|[;&|\s])(?:echo|printf|cat|tee)\b[^\n;&]*>>?\s*[^\s;&|]/i,
  />>\s*[^\s;&|]/, // append redirection
  /(?:^|[^<>&|])>\s*[^\s;&|]/, // overwrite redirection (excluding comparisons)

  // 5. Process & port operations
  /\b(?:kill|pkill|killall)\s+[^\n;&]+/i,
  /\bfuser\s+-[kK]\b/i,

  // 6. Build, compile, and type-check generators
  /\b(?:npm|pnpm|yarn|bun)\s+run\s+build\b/i,
  /\btsc\b(?!\s+--noEmit)/i,
  /\b(?:make|cmake|cargo\s+build|go\s+build)\b/i,

  // 7. Git workspace state modifications
  /\bgit\s+(?:checkout|restore|reset|clean|pull|stash|apply|revert|cherry-pick)\b/i,

  // 8. Environment export mutations
  /\bexport\s+[A-Za-z0-9_]+\s*=/i,
];

export function isStateChangingCommand(command) {
  if (!command || typeof command !== 'string') return false;
  const trimmed = command.trim();
  if (!trimmed) return false;

  return STATE_CHANGING_PATTERNS.some((pattern) => pattern.test(trimmed));
}

