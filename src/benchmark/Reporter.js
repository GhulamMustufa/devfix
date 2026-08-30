import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export class Reporter {
  static generateTerminalReport(results, metrics, runId) {
    const sampleRun = results.find(r => r.provider);
    const providerStr = sampleRun ? `${sampleRun.provider} ${sampleRun.model || ''}`.trim() : 'Unknown';

    let out = chalk.bold('DEVFIX BENCHMARK\n');
    out += chalk.gray('────────────────────────────────────────\n\n');

    out += `Model:               ${providerStr}\n`;
    out += `Cases:               ${metrics.totalCases}\n`;
    out += `Verified Repairs:    ${metrics.verifiedRepairs}/${metrics.totalCases}\n`;
    out += `Success Rate:        ${metrics.successRate}\n\n`;

    out += `Avg Iterations:      ${metrics.avgIterations}\n`;
    out += `Avg Repair Time:     ${metrics.avgRepairTimeSec}s\n`;
    out += `Tool Reliability:    ${metrics.toolReliability}\n`;
    out += `Avg Tokens:          ${metrics.avgTokens}\n`;
    out += `Estimated Cost:      ${metrics.costString}\n\n`;

    out += chalk.gray('────────────────────────────────────────\n\n');
    out += chalk.bold('CASE RESULTS\n\n');

    results.forEach(run => {
      // e.g. "DEV-01"
      const nameMatch = run.project ? run.project.match(/(DEV-\d+)/) : null;
      const caseName = nameMatch ? nameMatch[1] : 'UNKNOWN';
      const mark = run.finalStatus === 'SUCCESS' ? chalk.green('✓') : chalk.red('✗');
      const statusStr = (run.finalStatus || 'UNKNOWN').padEnd(16, ' ');
      const iterStr = `${run.iterations || 0} iter`.padStart(7, ' ');
      const durStr = `${((run.durationMs || 0) / 1000).toFixed(1)}s`.padStart(6, ' ');

      out += `${caseName.padEnd(8, ' ')} ${mark}  ${statusStr} ${iterStr}  ${durStr}\n`;
    });

    out += '\n' + chalk.gray('────────────────────────────────────────\n\n');

    out += chalk.bold('Primary Metric\n');
    out += `Verified Recovery Rate: ${metrics.successRate}\n\n`;

    out += chalk.bold('Secondary Metrics\n');
    out += `Tool Reliability: ${metrics.toolReliability}\n`;
    out += `Average Repair Time: ${metrics.avgRepairTimeSec}s\n`;
    out += `Average Iterations: ${metrics.avgIterations}\n`;
    out += `Average Tokens: ${metrics.avgTokens}\n`;
    out += `Cost: ${metrics.costString}\n\n`;

    out += chalk.gray('────────────────────────────────────────\n\n');

    out += `Historical validation:\n`;
    out += `Phase 3J: 3/5 (60%)\n`;
    out += `Phase 4F: 3/5 (60%)\n\n`;

    out += `Current expanded benchmark:\n`;
    out += `Phase 5: ${metrics.verifiedRepairs}/${metrics.totalCases} (${metrics.successRate})\n\n`;

    out += chalk.gray('────────────────────────────────────────\n\n');

    out += `Trajectories:\n`;
    out += `artifacts/runs/\n\n`;

    out += `Benchmark report:\n`;
    out += `artifacts/benchmark/${runId}.json\n\n`;

    out += `Human-readable report:\n`;
    out += `artifacts/benchmark/${runId}.md\n`;

    return out;
  }

  static async saveReports(results, metrics, runId) {
    const outDir = path.resolve(process.cwd(), 'artifacts/benchmark');
    await fs.promises.mkdir(outDir, { recursive: true });

    // Save JSON
    const reportJson = {
      metadata: {
        runId,
        timestamp: new Date().toISOString(),
      },
      metrics,
      results
    };
    
    const jsonPath = path.join(outDir, `${runId}.json`);
    await fs.promises.writeFile(jsonPath, JSON.stringify(reportJson, null, 2));

    // We recreate the terminal output without colors for the MD file
    const sampleRun = results.find(r => r.provider);
    const providerStr = sampleRun ? `${sampleRun.provider} ${sampleRun.model || ''}`.trim() : 'Unknown';

    let md = `# DevFix Benchmark Report\n\n`;
    
    md += `**Model:** ${providerStr}\n`;
    md += `**Cases:** ${metrics.totalCases}\n`;
    md += `**Verified Repairs:** ${metrics.verifiedRepairs}/${metrics.totalCases}\n`;
    md += `**Success Rate:** ${metrics.successRate}\n\n`;

    md += `**Avg Iterations:** ${metrics.avgIterations}\n`;
    md += `**Avg Repair Time:** ${metrics.avgRepairTimeSec}s\n`;
    md += `**Tool Reliability:** ${metrics.toolReliability}\n`;
    md += `**Avg Tokens:** ${metrics.avgTokens}\n`;
    md += `**Estimated Cost:** ${metrics.costString}\n\n`;

    md += `---\n\n## Case Results\n\n`;
    md += `| Case | Result | Status | Iterations | Duration |\n`;
    md += `|---|---|---|---|---|\n`;

    results.forEach(run => {
      const nameMatch = run.project ? run.project.match(/(DEV-\d+)/) : null;
      const caseName = nameMatch ? nameMatch[1] : 'UNKNOWN';
      const mark = run.finalStatus === 'SUCCESS' ? '✓' : '✗';
      const statusStr = run.finalStatus || 'UNKNOWN';
      const iterStr = `${run.iterations || 0}`;
      const durStr = `${((run.durationMs || 0) / 1000).toFixed(1)}s`;

      md += `| ${caseName} | ${mark} | ${statusStr} | ${iterStr} | ${durStr} |\n`;
    });

    md += `\n---\n\n## Historical Comparison\n\n`;
    md += `Historical validation:\n`;
    md += `- Phase 3J: 3/5 (60%)\n`;
    md += `- Phase 4F: 3/5 (60%)\n\n`;

    md += `Current expanded benchmark:\n`;
    md += `- Phase 5: ${metrics.verifiedRepairs}/${metrics.totalCases} (${metrics.successRate})\n\n`;
    
    const mdPath = path.join(outDir, `${runId}.md`);
    await fs.promises.writeFile(mdPath, md);

    return { jsonPath, mdPath };
  }
}
