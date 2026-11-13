import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import TrajectoryGenerator from './Trajectory.js';
import { isSensitiveKey, redactObject, redactString } from '../security/Redactor.js';

export class TelemetryLogger {
  constructor(options = {}) {
    const isExplicitlyDisabled = options.enabled === false;
    const isEnvDisabled =
      process.env.DEVFIX_TELEMETRY === '0' ||
      process.env.DO_NOT_TRACK === '1' ||
      process.env.DEVFIX_NO_TELEMETRY === '1';

    this.enabled = !isExplicitlyDisabled && !isEnvDisabled;
    this.outDir =
      options.outDir ||
      process.env.DEVFIX_RUNS_DIR ||
      process.env.DEVFIX_TELEMETRY_DIR ||
      path.resolve(process.cwd(), 'artifacts/runs');
  }

  async save(telemetry) {
    if (!this.enabled) {
      return { disabled: true, json: null, md: null };
    }

    try {
      await fs.promises.mkdir(this.outDir, { recursive: true });
      const runId = randomBytes(4).toString('hex');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${timestamp}-${runId}.json`;
      const filePath = path.join(this.outDir, fileName);

      const scrubbed = this.scrub(telemetry);

      // Add extra metadata for the run
      const finalRecord = {
        runId,
        timestamp: new Date().toISOString(),
        ...scrubbed,
      };

      await fs.promises.writeFile(filePath, JSON.stringify(finalRecord, null, 2), 'utf-8');

      // Generate and save markdown trajectory
      const mdContent = TrajectoryGenerator.generateMarkdown(finalRecord);
      const mdFilePath = path.join(this.outDir, `${timestamp}-${runId}.md`);
      await fs.promises.writeFile(mdFilePath, mdContent, 'utf-8');

      return { json: filePath, md: mdFilePath, runId };
    } catch (err) {
      // Telemetry failures must never break or crash a repair workflow
      if (process.env.DEBUG || process.env.DEVFIX_DEBUG) {
        console.warn(`[devfix telemetry warning] Failed to save telemetry record: ${err.message}`);
      }
      return { error: err.message, json: null, md: null };
    }
  }

  scrub(obj) {
    return redactObject(obj);
  }

  _isSensitiveKey(key) {
    return isSensitiveKey(key);
  }

  _scrubString(str) {
    return redactString(str);
  }
}
