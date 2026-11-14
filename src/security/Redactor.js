const ALLOWED_TOKEN_METRICS = new Set([
  'tokenusage',
  'tokens',
  'prompt_tokens',
  'completion_tokens',
  'total_tokens',
  'max_tokens',
  'cached_tokens',
]);

const SENSITIVE_KEY_SUBSTRINGS = [
  'api_key',
  'apikey',
  'secret',
  'password',
  'passwd',
  'passphrase',
  'authorization',
  'credential',
  'private_key',
  'access_key',
  'session_key',
  'cookie',
  'jwt',
  'database_url',
  'connection_string',
  'dsn',
];

const ENV_SECRET_NAMES = [
  'LLM_API_KEY',
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'DEEPSEEK_API_KEY',
  'GROQ_API_KEY',
  'OPENROUTER_API_KEY',
  'ANTHROPIC_API_KEY',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'NPM_TOKEN',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'DATABASE_URL',
];

export function isSensitiveKey(key) {
  if (!key || typeof key !== 'string') return false;
  const lower = key.toLowerCase();
  if (ALLOWED_TOKEN_METRICS.has(lower)) return false;

  if (SENSITIVE_KEY_SUBSTRINGS.some((part) => lower.includes(part))) {
    return true;
  }
  if (lower.includes('token') && !lower.includes('usage')) {
    return true;
  }
  return false;
}

export function redactString(str, extraSecrets = []) {
  if (typeof str !== 'string' || str.length === 0) return str;
  let scrubbed = str;

  // 1. Scrub active process.env secrets and any explicitly passed secrets
  const runtimeSecrets = [
    ...extraSecrets,
    ...ENV_SECRET_NAMES.map((name) => process.env[name]),
  ].filter((val) => typeof val === 'string' && val.length >= 8);

  for (const secret of runtimeSecrets) {
    scrubbed = scrubbed.split(secret).join('[REDACTED]');
  }

  // 2. PEM private keys (multi-line)
  scrubbed = scrubbed.replace(
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
    '[REDACTED_PRIVATE_KEY]'
  );

  // 3. Bearer / Basic auth headers
  scrubbed = scrubbed.replace(/Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');
  scrubbed = scrubbed.replace(/Basic\s+[a-zA-Z0-9+/=]{8,}/gi, 'Basic [REDACTED]');

  // 4. Known provider & platform token prefixes
  // OpenAI / DeepSeek / Anthropic / generic sk- keys
  scrubbed = scrubbed.replace(/\bsk-[a-zA-Z0-9_-]{20,}/g, 'sk-[REDACTED]');
  // Google / Gemini API keys
  scrubbed = scrubbed.replace(/\bAIza[0-9A-Za-z\-_]{20,}/g, 'AIza[REDACTED]');
  // Groq API keys
  scrubbed = scrubbed.replace(/\bgsk_[a-zA-Z0-9]{20,}/g, 'gsk_[REDACTED]');
  // GitHub PATs & OAuth tokens
  scrubbed = scrubbed.replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}/g, 'gh_[REDACTED]');
  scrubbed = scrubbed.replace(/\bgithub_pat_[A-Za-z0-9_]{20,}/g, 'github_pat_[REDACTED]');
  // npm tokens
  scrubbed = scrubbed.replace(/\bnpm_[A-Za-z0-9]{20,}/g, 'npm_[REDACTED]');
  // AWS Access Key ID
  scrubbed = scrubbed.replace(/\bAKIA[0-9A-Z]{16}\b/g, 'AKIA[REDACTED]');
  // Slack tokens
  scrubbed = scrubbed.replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, 'xox-[REDACTED]');

  // 5. URLs with embedded user:password credentials
  scrubbed = scrubbed.replace(
    /((?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis(?:s)?|amqp(?:s)?|https?):\/\/)([^:\s/@"']+):([^@\s/"']+)@/gi,
    '$1[REDACTED]:[REDACTED]@'
  );

  // 6. .env / shell assignment lines for sensitive variable names
  scrubbed = scrubbed.replace(
    /^(\s*(?:export\s+)?[A-Za-z0-9_]*(?:API_KEY|SECRET|TOKEN|PASSWORD|PASSWD|PASSPHRASE|AUTH_KEY|PRIVATE_KEY|ACCESS_KEY|CREDENTIAL|DSN)[A-Za-z0-9_]*\s*=\s*)(.+)$/gm,
    (match, prefix, value) => {
      const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
      if (
        !trimmed ||
        trimmed === '[REDACTED]' ||
        trimmed === '***REDACTED_API_KEY***' ||
        trimmed.startsWith('your_') ||
        trimmed.startsWith('<')
      ) {
        return match;
      }
      return `${prefix}[REDACTED]`;
    }
  );

  return scrubbed;
}

export function redactObject(obj, extraSecrets = []) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return redactString(obj, extraSecrets);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, extraSecrets));
  }
  if (typeof obj === 'object') {
    const scrubbedObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveKey(key)) {
        scrubbedObj[key] = '[REDACTED]';
      } else {
        scrubbedObj[key] = redactObject(value, extraSecrets);
      }
    }
    return scrubbedObj;
  }
  return obj;
}

