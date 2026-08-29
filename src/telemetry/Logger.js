import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

export class TelemetryLogger {
  constructor(options = {}) {
    this.outDir = options.outDir || path.resolve(process.cwd(), 'artifacts/runs');
  }

  async save(telemetry) {
    await fs.promises.mkdir(this.outDir, { recursive: true });
    const runId = randomBytes(4).toString('hex');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `\${timestamp}-\${runId}.json`;
    const filePath = path.join(this.outDir, filename);

    const scrubbed = this.scrub(telemetry);
    
    // Add extra metadata for the run
    const finalRecord = {
      runId,
      timestamp: new Date().toISOString(),
      ...scrubbed
    };

    await fs.promises.writeFile(filePath, JSON.stringify(finalRecord, null, 2), 'utf-8');
    return filePath;
  }

  scrub(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      return this._scrubString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.scrub(item));
    }
    if (typeof obj === 'object') {
      const scrubbedObj = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this._isSensitiveKey(key)) {
          scrubbedObj[key] = '[REDACTED]';
        } else {
          scrubbedObj[key] = this.scrub(value);
        }
      }
      return scrubbedObj;
    }
    return obj;
  }

  _isSensitiveKey(key) {
    const lower = key.toLowerCase();
    if (lower === 'tokenusage' || lower === 'tokens' || lower === 'prompt_tokens' || lower === 'completion_tokens' || lower === 'total_tokens') return false; // Allow token telemetry
    return lower.includes('api_key') ||
           lower.includes('secret') ||
           lower.includes('password') ||
           (lower.includes('token') && !lower.includes('usage')) ||
           lower.includes('authorization');
  }

  _scrubString(str) {
    // Scrub common credential patterns
    let scrubbed = str;
    
    // Bearer tokens
    scrubbed = scrubbed.replace(/Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');
    
    // Generic API keys (sk-..., etc.)
    scrubbed = scrubbed.replace(/sk-[a-zA-Z0-9\\-]{20,}/g, 'sk-[REDACTED]');
    
    return scrubbed;
  }
}
