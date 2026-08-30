import 'dotenv/config';
import { program } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { AgentController } from '../agent/Controller.js';
import { DockerSandbox } from '../sandbox/Docker.js';
import { TelemetryLogger } from '../telemetry/Logger.js';
import { DEMO_CASES } from '../demo/cases.js';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version
const pkgPath = path.resolve(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

program
  .name('devfix')
  .description('Autonomous Local Development Troubleshooter')
  .version(pkg.version);

const logger = new TelemetryLogger();

// Graceful Spinner Wrapper (Handles CI environments without breaking)
function createSpinner(text) {
  const spinner = ora({ text, isSilent: !process.stdout.isTTY });
  if (process.stdout.isTTY) {
    spinner.start();
  } else {
    console.log(chalk.blue('▸ ' + text));
  }
  return spinner;
}

function stopSpinner(spinner, success, text) {
  if (process.stdout.isTTY) {
    if (success) {
      spinner.succeed(chalk.green(text));
    } else {
      spinner.fail(chalk.red(text));
    }
  } else {
    if (success) {
      console.log(chalk.green('✓ ' + text));
    } else {
      console.log(chalk.red('✗ ' + text));
    }
  }
}

// Ensure signal cleanup
let activeController = null;
process.on('SIGINT', () => {
  if (activeController) {
    activeController.cancel();
  }
  console.log(chalk.yellow('\n\nCaught SIGINT, shutting down...'));
});

// Run Agent
async function runAgent(sandbox, verifierConfig, spinner, initialFailure, projectContext) {
  const controller = new AgentController({
    maxIterations: 15,
    SandboxClass: class extends DockerSandbox {
      constructor(options) {
        super(options);
        // Inherit exact sandbox instance instead of class instantiation inside agent
      }
      async start() { }
      async stop() { }
      async execute(cmd, timeout) { return sandbox.execute(cmd, timeout); }
    },
    onEvent: (event) => {
      if (!process.stdout.isTTY) return; // Reduce noise in CI
      
      switch (event.type) {
        case 'agent_investigating':
          spinner.text = 'Agent investigating...';
          break;
        case 'tool_selected':
          spinner.text = `Executing: ${chalk.cyan(event.name)}`;
          break;
        case 'tool_executed':
          if (event.success) {
            spinner.text = `Completed: ${chalk.cyan(event.name)}`;
          } else {
            spinner.text = `Failed: ${chalk.cyan(event.name)}`;
          }
          break;
        case 'verifier_start':
          spinner.text = 'Verifying environment state...';
          break;
        case 'verifier_result':
          if (event.success) {
            spinner.text = chalk.green('Verifier: SUCCESS');
          } else {
            spinner.text = chalk.yellow('Verifier: FAIL');
          }
          break;
      }
    }
  });

  activeController = controller;

  // The actual AgentController expects to instantiate the sandbox, but since we inject a wrapper that forwards to our pre-started sandbox, it's fine.
  // Wait, AgentController constructor instantiates: `this.sandbox = new this.SandboxClass({ name: ... })`
  // And calls `this.sandbox.start()` and `this.sandbox.stop()`.
  // So our dummy class wrapper works perfectly!

  const result = await controller.run({
    initialFailure,
    projectContext,
    sandboxName: sandbox.name,
    verifierConfig
  });

  activeController = null;
  return result;
}

// Display final telemetry
function displayTelemetry(result) {
  console.log('\n────────────────────────────\n');
  
  if (result.finalStatus === 'SUCCESS') {
    console.log(chalk.green('✓ Repair successful\n'));
  } else {
    console.log(chalk.red('✗ Repair unsuccessful\n'));
    console.log(chalk.gray(`Reason: ${result.finalStatus}`));
    if (result.finalVerification) {
      console.log(chalk.gray(`Last verified state: ${result.finalVerification.status}`));
    }
  }

  console.log(`Iterations: ${result.iterations}`);
  console.log(`Tool calls: ${result.toolCalls}`);
  console.log(`Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
}

// --------------------------------------------------
// COMMANDS
// --------------------------------------------------

program
  .command('fix <project>')
  .description('Troubleshoot and fix a local project directory')
  .requiredOption('--verify <command>', 'Command to deterministically verify success (e.g. "npm test")')
  .action(async (project, options) => {
    console.log(chalk.cyan.bold('DEVFIX'));
    console.log(chalk.gray('Autonomous Local Development Troubleshooter\n'));
    
    // Validate project path
    const absPath = path.resolve(project);
    let stat;
    try {
      stat = await fs.promises.stat(absPath);
    } catch (e) {
      console.error(chalk.red(`✗ Error: Path does not exist (${absPath})`));
      process.exit(2);
    }

    if (!stat.isDirectory()) {
      console.error(chalk.red(`✗ Error: Path is not a directory (${absPath})`));
      process.exit(2);
    }

    console.log(`Project: ${chalk.blue(absPath)}`);
    console.log(`Sandbox: Docker isolated`);
    console.log(`Verifier: ${chalk.magenta(options.verify)}\n`);

    const spinner = createSpinner('Initializing secure sandbox...');
    
    const sandbox = new DockerSandbox({ hostMountPath: absPath });
    try {
      await sandbox.start();
      stopSpinner(spinner, true, 'Sandbox initialized');
    } catch (e) {
      stopSpinner(spinner, false, 'Failed to initialize sandbox');
      console.error(chalk.red(e.message));
      process.exit(4);
    }

    const agentSpinner = createSpinner('Agent investigating...');
    
    const verifierConfig = {
      type: 'process',
      command: options.verify,
      expectedExitCode: 0,
      timeoutMs: 15000
    };

    let result;
    try {
      result = await runAgent(sandbox, verifierConfig, agentSpinner, "Environment repair requested via fix command", "Analyze the directory and identify what needs to be fixed to satisfy the verifier.");
      stopSpinner(agentSpinner, result.finalStatus === 'SUCCESS', result.finalStatus === 'SUCCESS' ? 'Agent completed repair' : 'Agent finished with failure');
    } catch (e) {
      stopSpinner(agentSpinner, false, 'Agent crashed');
      console.error(e);
    } finally {
      const cleanSpinner = createSpinner('Cleaning up...');
      await sandbox.stop();
      stopSpinner(cleanSpinner, true, 'Sandbox cleaned up');
    }

    if (result) {
      result.project = absPath;
      const savedPaths = await logger.save(result);
      displayTelemetry(result);
      console.log(`\nTrajectory: ${savedPaths.md}\n`);
      process.exit(result.finalStatus === 'SUCCESS' ? 0 : 1);
    } else {
      process.exit(5);
    }
  });

program
  .command('demo <case>')
  .description('Run a benchmark demonstration case (DEV-01 to DEV-05)')
  .action(async (caseId) => {
    const demoCase = DEMO_CASES[caseId];
    if (!demoCase) {
      console.error(chalk.red(`✗ Error: Unknown demo case ${caseId}`));
      process.exit(2);
    }

    console.log(chalk.cyan.bold('DEVFIX DEMO'));
    console.log(`Case: ${chalk.white.bold(demoCase.name)}\n`);
    
    console.log(chalk.gray('Initial state:'));
    console.log(chalk.red(`✗ ${demoCase.initialFailure}\n`));

    const spinner = createSpinner('Initializing benchmark sandbox...');
    
    const sandbox = new DockerSandbox({});
    try {
      await sandbox.start();
      for (const cmd of demoCase.setup) {
        await sandbox.executeHostCommand(cmd);
      }
      stopSpinner(spinner, true, 'Sandbox initialized with benchmark state');
    } catch (e) {
      stopSpinner(spinner, false, 'Failed to initialize benchmark sandbox');
      console.error(chalk.red(e.message));
      process.exit(4);
    }

    const agentSpinner = createSpinner('Agent investigating...');
    let result;
    try {
      result = await runAgent(sandbox, demoCase.verifierConfig, agentSpinner, demoCase.initialFailure, demoCase.projectContext);
      stopSpinner(agentSpinner, result.finalStatus === 'SUCCESS', result.finalStatus === 'SUCCESS' ? 'Agent completed repair' : 'Agent finished with failure');
    } catch (e) {
      stopSpinner(agentSpinner, false, 'Agent crashed');
      console.error(e);
    } finally {
      const cleanSpinner = createSpinner('Cleaning up...');
      await sandbox.stop();
      stopSpinner(cleanSpinner, true, 'Sandbox cleaned up');
    }

    if (result) {
      result.project = `DEMO:${caseId}`;
      const savedPaths = await logger.save(result);
      displayTelemetry(result);
      console.log(`\nTrajectory: ${savedPaths.md}\n`);
      process.exit(result.finalStatus === 'SUCCESS' ? 0 : 1);
    } else {
      process.exit(5);
    }
  });

program
  .command('benchmark')
  .description('Run the 10-case Hackathon Benchmark')
  .option('--case <id>', 'Run a specific case')
  .action(async (options) => {
    // Dynamic import to avoid loading all benchmark components if not running benchmark
    const { BenchmarkRunner } = await import('../benchmark/Runner.js');
    try {
      const output = await BenchmarkRunner.evaluate(DEMO_CASES, options.case, createSpinner, stopSpinner);
      console.log('\n' + output);
    } catch (e) {
      console.error(chalk.red(`✗ Benchmark failed: ${e.message}`));
      process.exit(1);
    }
  });


program
  .command('doctor')
  .description('Check system requirements')
  .action(() => {
    console.log(chalk.cyan.bold('DEVFIX DOCTOR\n'));
    let hasError = false;

    // Node version
    const nodeVer = process.version;
    console.log(chalk.green(`✓ Node.js (${nodeVer})`));

    // Docker CLI
    try {
      execSync('docker --version', { stdio: 'ignore' });
      console.log(chalk.green('✓ Docker CLI'));
    } catch (e) {
      console.log(chalk.red('✗ Docker CLI not found'));
      hasError = true;
    }

    // Docker Daemon
    try {
      execSync('docker info', { stdio: 'ignore' });
      console.log(chalk.green('✓ Docker daemon running'));
    } catch (e) {
      console.log(chalk.red('✗ Docker daemon not reachable'));
      hasError = true;
    }

    // Configured LLM Provider
    const provider = process.env.LLM_PROVIDER || 'openai';
    const model = process.env.LLM_MODEL || 'gpt-4o-mini';
    const hasKey = !!process.env.LLM_API_KEY;

    console.log(chalk.green(`✓ LLM_PROVIDER=${provider}`));
    console.log(chalk.green(`✓ LLM_MODEL=${model}`));
    if (hasKey) {
      console.log(chalk.green('✓ API credentials configured'));
    } else {
      console.log(chalk.red('✗ API credentials missing (LLM_API_KEY)'));
      hasError = true;
    }

    console.log('');
    if (hasError) {
      console.log(chalk.red('Fix errors before running devfix.'));
      process.exit(3);
    } else {
      console.log(chalk.green('Ready.'));
      process.exit(0);
    }
  });

program.parse(process.argv);
