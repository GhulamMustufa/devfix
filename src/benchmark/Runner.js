import { AgentController } from '../agent/Controller.js';
import { DockerSandbox } from '../sandbox/Docker.js';
import { TelemetryLogger } from '../telemetry/Logger.js';
import { Reporter } from './Reporter.js';
import { Metrics } from './Metrics.js';
import { randomBytes } from 'crypto';
import chalk from 'chalk';

export class BenchmarkRunner {
  static async evaluate(cases, selectedCaseId = null, createSpinner, stopSpinner) {
    const runId = randomBytes(4).toString('hex');
    const results = [];
    
    const casesToRun = selectedCaseId 
      ? { [selectedCaseId]: cases[selectedCaseId] } 
      : cases;
      
    if (selectedCaseId && !cases[selectedCaseId]) {
      throw new Error(`Unknown case: ${selectedCaseId}`);
    }

    for (const [caseId, caseDef] of Object.entries(casesToRun)) {
      console.log(chalk.bold(`\nEvaluating ${caseId}...`));
      
      const spinner = createSpinner ? createSpinner(`Initializing sandbox for ${caseId}...`) : null;
      
      const sandbox = new DockerSandbox({ name: `benchmark-${runId}-${caseId.toLowerCase()}` });
      try {
        await sandbox.start();
        for (const cmd of caseDef.setup) {
          await sandbox.executeHostCommand(cmd);
        }
        if (spinner) spinner.text = `Agent investigating ${caseId}...`;
        
        const controller = new AgentController({
          maxIterations: 15,
          SandboxClass: class extends DockerSandbox {
            constructor(options) { super(options); }
            async start() { }
            async stop() { }
            async execute(cmd, timeout) { return sandbox.execute(cmd, timeout); }
          }
        });
        
        const result = await controller.run({
          initialFailure: caseDef.initialFailure,
          projectContext: caseDef.projectContext || `Benchmark case ${caseId}`,
          sandboxName: sandbox.name,
          verifierConfig: caseDef.verifierConfig
        });
        
        result.project = caseId;
        
        // Save individual trajectory
        const logger = new TelemetryLogger();
        await logger.save(result);
        
        results.push(result);
        
        if (spinner) {
          stopSpinner(
            spinner, 
            result.finalStatus === 'SUCCESS', 
            `${caseId}: ${result.finalStatus === 'SUCCESS' ? 'Repaired' : 'Failed'} (${result.iterations} iter, ${((result.durationMs || 0)/1000).toFixed(1)}s)`
          );
        } else {
          console.log(`${caseId}: ${result.finalStatus === 'SUCCESS' ? 'Repaired' : 'Failed'} (${result.iterations} iter, ${((result.durationMs || 0)/1000).toFixed(1)}s)`);
        }
      } catch (e) {
        if (spinner) stopSpinner(spinner, false, `${caseId} crashed: ${e.message}`);
        else console.error(`${caseId} crashed:`, e);
        
        // Push a failed result so the benchmark doesn't stop, but accurately reflects the failure
        results.push({
          project: caseId,
          finalStatus: 'CRASH',
          durationMs: 0,
          iterations: 0,
          validToolCalls: 0,
          invalidToolCalls: 0
        });
      } finally {
        if (spinner) spinner.text = `Cleaning up sandbox for ${caseId}...`;
        await sandbox.stop().catch(console.error);
        if (spinner) stopSpinner(spinner, true, '');
      }
    }

    console.log('\nGenerating benchmark report...');
    const metrics = Metrics.calculate(results);
    const reportOutput = Reporter.generateTerminalReport(results, metrics, runId);
    await Reporter.saveReports(results, metrics, runId);

    return reportOutput;
  }
}
