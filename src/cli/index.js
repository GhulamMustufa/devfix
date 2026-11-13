import 'dotenv/config';
import { program } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentController } from '../agent/Controller.js';
import { DockerSandbox } from '../sandbox/Docker.js';
import { TelemetryLogger } from '../telemetry/Logger.js';
import { DEMO_CASES } from '../demo/cases.js';
import { resolveProviderConfig, isLocalOrKeylessProvider } from '../llm/Provider.js';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline/promises';
import { StagingWorkspace } from '../workspace/Staging.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version
const pkgPath = path.resolve(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

const banner = chalk.cyan(`
    ____             ________      
   / __ \\___ _   __ / ____/ /_  __
  / / / / _ \\ | / // /_  / / | / /
 / /_/ /  __/ |/ // __/ / /| |/ / 
/_____/\\___/|___//_/   /_/ |___/  
`);

program
  .name('devfix')
  .description('Autonomous Local Development Troubleshooter')
  .version(pkg.version)
  .addHelpText('before', banner + '\n');

// Graceful Spinner Wrapper (Handles CI and JSON quiet mode without breaking)
function createSpinner(text, isQuiet = false) {
  const spinner = ora({ text, isSilent: isQuiet || !process.stdout.isTTY });
  if (!isQuiet && process.stdout.isTTY) {
    spinner.start();
  } else if (!isQuiet) {
    console.log(chalk.blue('▸ ' + text));
  }
  return spinner;
}

function stopSpinner(spinner, success, text, isQuiet = false) {
  if (isQuiet) return;
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
  console.log(chalk.yellow('\n\nCaught SIGINT, shutting down cleanly...'));
});

// Run Agent
async function runAgent(sandbox, verifierConfig, spinner, initialFailure, projectContext, isQuiet = false) {
  const controller = new AgentController({
    maxIterations: 15,
    SandboxClass: class extends DockerSandbox {
      constructor(options) {
        super(options);
      }
      async start() { }
      async stop() { }
      async execute(cmd, timeout) { return sandbox.execute(cmd, timeout); }
      async executeArgs(script, args, timeout) { return sandbox.executeArgs(script, args, timeout); }
    },
    onEvent: (event) => {
      if (isQuiet || !process.stdout.isTTY) return;
      
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

async function promptApproval(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    const normalized = answer.trim().toLowerCase();
    return normalized === 'y' || normalized === 'yes';
  } finally {
    rl.close();
  }
}

function collectVerifyCommands(val, prev) {
  if (!prev) return [val];
  return [...prev, val];
}

program
  .command('fix <project>')
  .description('Troubleshoot and fix a local project directory in an isolated staging sandbox')
  .requiredOption(
    '--verify <command>',
    'Command to deterministically verify success (specify multiple times for multi-check verification)',
    collectVerifyCommands
  )
  .option('--dry-run', 'Run diagnosis and verification in staging without modifying the original project')
  .option('-y, --yes', 'Automatically approve applying verified staging changes back to the original project')
  .option('--allow-network', 'Allow container network access during repair (default: disabled via --network=none)')
  .option('--image <image>', 'Docker base image override (default: auto-detected based on project runtime)')
  .option('--diff', 'Display full file differences after repair')
  .option('--no-telemetry', 'Opt out of telemetry logging for this run')
  .option('--json', 'Output repair results and metadata in machine-readable JSON format')
  .action(async (project, options) => {
    const isJson = Boolean(options.json);

    if (!isJson) {
      console.log(chalk.cyan.bold('DEVFIX'));
      console.log(chalk.gray('Autonomous Local Development Troubleshooter\n'));
    }
    
    // Validate project path
    const absPath = path.resolve(project);
    let stat;
    try {
      stat = await fs.promises.stat(absPath);
    } catch (e) {
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: `Path does not exist: ${absPath}` }));
      } else {
        console.error(chalk.red(`✗ Error: Path does not exist (${absPath})`));
      }
      process.exit(2);
    }

    if (!stat.isDirectory()) {
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: `Path is not a directory: ${absPath}` }));
      } else {
        console.error(chalk.red(`✗ Error: Path is not a directory (${absPath})`));
      }
      process.exit(2);
    }

    const { ProjectDetector } = await import('../project/Detector.js');
    let projectContext = null;
    try {
      projectContext = await ProjectDetector.inspect(absPath);
    } catch (e) {
      // Detection failure is non-fatal; falls back to default runtime
    }

    const selectedImage = options.image || (projectContext && projectContext.dockerImage) || 'node:20-alpine';

    const staging = new StagingWorkspace({ projectPath: absPath });
    let stagingInfo;
    try {
      stagingInfo = await staging.init();
    } catch (e) {
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: `Error preparing staging workspace: ${e.message}` }));
      } else {
        console.error(chalk.red(`✗ Error preparing staging workspace: ${e.message}`));
      }
      process.exit(2);
    }

    const allowNetwork = Boolean(options.allowNetwork);

    if (!isJson) {
      console.log(`Project:  ${chalk.blue(absPath)} (protected — unmodified during repair)`);
      console.log(`Staging:  ${chalk.gray(stagingInfo.stagingPath)}`);
      const runtimeDisplay = projectContext?.runtimeVersion
        ? `${projectContext.runtime} (${projectContext.runtimeVersion})`
        : (projectContext?.runtime || 'Unknown');
      const pmDisplay = projectContext?.packageManager
        ? `${projectContext.packageManager}${projectContext.lockfile ? ` via ${projectContext.lockfile}` : ''}`
        : 'Unknown';
      console.log(`Runtime:  ${chalk.cyan(runtimeDisplay)} (package manager: ${chalk.cyan(pmDisplay)})`);
      console.log(`Sandbox:  Docker isolated (image=${chalk.cyan(selectedImage)}${options.image ? ' [user override]' : ''}, non-root, --cap-drop=ALL, network=${allowNetwork ? chalk.yellow('enabled') : chalk.green('none')})`);
      const verifyDisplay = Array.isArray(options.verify) ? options.verify.join(' && ') : options.verify;
      console.log(`Verifier: ${chalk.magenta(verifyDisplay)}`);
      if (projectContext?.conflicts && projectContext.conflicts.length > 0) {
        projectContext.conflicts.forEach((c) => console.log(chalk.yellow(`⚠ Warning: ${c}`)));
      }
      if (projectContext?.isMonorepo) {
        const wsStr = projectContext.workspaces?.join(', ') || 'workspaces';
        console.log(chalk.cyan(`ℹ Monorepo layout detected: ${wsStr}`));
      }
      if (stagingInfo.excludedFiles.length > 0) {
        console.log(chalk.gray(`Protected sensitive files excluded from staging: ${stagingInfo.excludedFiles.length}`));
      }
      if (stagingInfo.blockedSymlinks.length > 0) {
        console.log(chalk.yellow(`Blocked unsafe external symlinks: ${stagingInfo.blockedSymlinks.join(', ')}`));
      }
      console.log('');
    }

    const spinner = createSpinner('Initializing secure sandbox...', isJson);
    
    const sandbox = new DockerSandbox({
      hostMountPath: stagingInfo.stagingPath,
      allowNetwork,
      image: selectedImage,
    });

    let result;
    let diff = null;
    let appliedInfo = null;

    try {
      try {
        await sandbox.start();
        stopSpinner(spinner, true, 'Sandbox initialized', isJson);
      } catch (e) {
        stopSpinner(spinner, false, 'Failed to initialize sandbox', isJson);
        if (isJson) {
          console.log(JSON.stringify({ success: false, error: e.message }));
        } else {
          console.error(chalk.red(e.message));
        }
        process.exitCode = 4;
        return;
      }

      const agentSpinner = createSpinner('Agent investigating...', isJson);
      
      const verifyCommands = Array.isArray(options.verify) ? options.verify : [options.verify];
      const verifierConfig =
        verifyCommands.length > 1
          ? {
              type: 'multi',
              checks: verifyCommands.map((cmd) => ({
                type: 'process',
                command: cmd,
                expectedExitCode: 0,
                timeoutMs: 15000,
              })),
            }
          : {
              type: 'process',
              command: verifyCommands[0],
              expectedExitCode: 0,
              timeoutMs: 15000,
            };

      const contextSummary = [
        `Detected Language: ${projectContext?.language || 'Unknown'}`,
        `Runtime: ${projectContext?.runtime || 'Unknown'}${projectContext?.runtimeVersion ? ` (${projectContext.runtimeVersion})` : ''}`,
        `Package Manager: ${projectContext?.packageManager || 'Unknown'}${projectContext?.lockfile ? ` (lockfile: ${projectContext.lockfile})` : ''}`,
        projectContext?.isMonorepo ? `Monorepo: yes (${projectContext.workspaces?.join(', ')})` : null,
        projectContext?.hasVirtualEnv ? `Virtualenv: ${projectContext.virtualEnvPath}` : null,
        projectContext?.commands && Object.keys(projectContext.commands).length > 0
          ? `Detected Commands: ${JSON.stringify(projectContext.commands)}`
          : null,
        projectContext?.conflicts && projectContext.conflicts.length > 0
          ? `Warnings/Conflicts: ${projectContext.conflicts.join('; ')}`
          : null,
        'Goal: Analyze the directory inside /app and identify what needs to be fixed to satisfy the verifier.'
      ].filter(Boolean).join('\n');

      try {
        result = await runAgent(
          sandbox,
          verifierConfig,
          agentSpinner,
          'Environment repair requested via fix command',
          contextSummary,
          isJson
        );
        stopSpinner(
          agentSpinner,
          result.finalStatus === 'SUCCESS',
          result.finalStatus === 'SUCCESS' ? 'Agent completed repair' : 'Agent finished with failure',
          isJson
        );
      } catch (e) {
        stopSpinner(agentSpinner, false, 'Agent crashed', isJson);
        if (!isJson) console.error(e);
      } finally {
        const cleanSpinner = createSpinner('Cleaning up container...', isJson);
        await sandbox.stop();
        stopSpinner(cleanSpinner, true, 'Sandbox cleaned up', isJson);
      }

      if (result) {
        result.project = absPath;
        const runLogger = new TelemetryLogger({ enabled: options.telemetry !== false });
        const savedPaths = await runLogger.save(result);
        diff = await staging.computeDiff();

        if (result.finalStatus === 'SUCCESS' && diff.hasChanges) {
          if (options.dryRun) {
            if (!isJson) console.log(chalk.yellow('\nDry-run mode: original project was NOT modified.'));
          } else {
            let approved = Boolean(options.yes);
            if (!approved && !isJson && process.stdin.isTTY && process.stdout.isTTY) {
              approved = await promptApproval(
                chalk.yellow(`\nApply these verified changes to ${absPath}? [y/N] `)
              );
            }

            if (approved) {
              appliedInfo = await staging.applyChanges({ approved: true });
              if (!isJson) {
                console.log(chalk.green(`✓ Changes applied to ${absPath}`));
                console.log(chalk.gray(`Rollback ID: ${appliedInfo.rollbackId} (restore with: devfix rollback ${appliedInfo.rollbackId})`));
              }
            } else if (!isJson) {
              console.log(
                chalk.yellow('Changes were NOT applied (explicit approval required; pass --yes or confirm interactively).')
              );
            }
          }
        }

        if (isJson) {
          const jsonReport = {
            success: result.finalStatus === 'SUCCESS',
            project: absPath,
            status: result.finalStatus,
            dryRun: Boolean(options.dryRun),
            applied: appliedInfo ? true : false,
            rollbackId: appliedInfo ? appliedInfo.rollbackId : null,
            environment: {
              language: projectContext?.language || 'Unknown',
              runtime: projectContext?.runtime || 'Unknown',
              runtimeVersion: projectContext?.runtimeVersion || null,
              packageManager: projectContext?.packageManager || 'Unknown',
              lockfile: projectContext?.lockfile || null,
              dockerImage: selectedImage,
            },
            diff: diff ? {
              hasChanges: diff.hasChanges,
              added: diff.added,
              modified: diff.modified,
              deleted: diff.deleted,
            } : null,
            metrics: {
              iterations: result.iterations,
              toolCalls: result.toolCalls,
              durationMs: result.durationMs,
            },
            trajectory: savedPaths?.md || null,
          };
          console.log(JSON.stringify(jsonReport, null, 2));
        } else {
          displayTelemetry(result);
          if (savedPaths?.md) console.log(`\nTrajectory: ${savedPaths.md}`);

          console.log('\n' + chalk.bold('STAGING DIFF'));
          console.log(StagingWorkspace.formatDiff(diff) + '\n');

          if (result.finalStatus !== 'SUCCESS') {
            console.log(chalk.yellow('Verification did not pass — original project left untouched.'));
          }
        }

        process.exitCode = result.finalStatus === 'SUCCESS' ? 0 : 1;
      } else {
        process.exitCode = 5;
      }
    } finally {
      await staging.cleanup();
    }
  });

program
  .command('rollback [rollbackId]')
  .description('Restore original project files from a previously applied DevFix repair snapshot')
  .option('--list', 'List available rollback snapshots')
  .option('--project <dir>', 'Filter latest rollback by project directory')
  .option('--force', 'Overwrite files modified since repair was applied')
  .option('--json', 'Output result in machine-readable JSON format')
  .action(async (rollbackId, options) => {
    try {
      if (options.list) {
        const snapshots = await StagingWorkspace.listRollbacks();
        if (options.json) {
          console.log(JSON.stringify(snapshots, null, 2));
          return;
        }
        if (snapshots.length === 0) {
          console.log('No rollback snapshots found.');
          return;
        }
        console.log(chalk.bold('Available Rollback Snapshots:\n'));
        snapshots.forEach((s) => {
          const statusStr = s.status === 'ROLLED_BACK'
            ? chalk.yellow('(already rolled back)')
            : chalk.green(`(${s.status || 'READY'})`);
          console.log(`  ${chalk.cyan(s.rollbackId)}  ${chalk.gray(s.timestamp)}  ${chalk.blue(s.projectPath)}  ${statusStr}`);
        });
        return;
      }

      const manifest = await StagingWorkspace.rollback(rollbackId, {
        projectPath: options.project,
        force: Boolean(options.force),
      });

      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          rollbackId: manifest.rollbackId,
          projectPath: manifest.projectPath,
          status: manifest.status,
          restored: [...(manifest.modified || []), ...(manifest.deleted || [])],
          removed: manifest.added || [],
        }, null, 2));
        return;
      }

      console.log(chalk.green(`✓ Rolled back repair ${manifest.rollbackId} for ${manifest.projectPath}`));
      if (manifest.modified && manifest.modified.length > 0) {
        console.log(chalk.gray(`  Restored modified files (${manifest.modified.length}): ${manifest.modified.join(', ')}`));
      }
      if (manifest.deleted && manifest.deleted.length > 0) {
        console.log(chalk.gray(`  Restored deleted files (${manifest.deleted.length}): ${manifest.deleted.join(', ')}`));
      }
      if (manifest.added && manifest.added.length > 0) {
        console.log(chalk.gray(`  Removed added files (${manifest.added.length}): ${manifest.added.join(', ')}`));
      }
    } catch (e) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: e.message }, null, 2));
      } else {
        console.error(chalk.red(`✗ Rollback failed: ${e.message}`));
      }
      process.exit(1);
    }
  });

program
  .command('history [project]')
  .description('View repair history and available rollback snapshots')
  .option('--limit <n>', 'Maximum number of history records to display', '10')
  .option('--project <dir>', 'Filter history by project directory')
  .option('--json', 'Output repair history as JSON')
  .action(async (projectArg, options) => {
    try {
      const targetProject = options.project || projectArg;
      const history = await StagingWorkspace.getHistory({
        projectPath: targetProject,
        limit: parseInt(options.limit, 10) || 10,
      });

      if (options.json) {
        console.log(JSON.stringify(history, null, 2));
        return;
      }

      console.log(chalk.cyan.bold('DEVFIX REPAIR HISTORY\n'));
      if (history.length === 0) {
        console.log(chalk.gray('No repair history found.'));
        return;
      }

      history.forEach((h) => {
        const statusColor =
          h.status === 'APPLIED' ? chalk.green :
          h.status === 'ROLLED_BACK' ? chalk.yellow :
          chalk.red;
        const diffStr = chalk.gray(`(+${h.diffSummary.added} ~${h.diffSummary.modified} -${h.diffSummary.deleted})`);
        const canRollbackStr = h.canRollback ? chalk.cyan('[Rollback Available]') : chalk.gray('[Cannot Rollback]');
        console.log(
          `${chalk.bold(h.rollbackId)}  ${chalk.gray(h.timestamp)}  ${statusColor(h.status)}  ${diffStr}  ${canRollbackStr}\n  Project: ${chalk.blue(h.projectPath)}\n`
        );
      });
    } catch (e) {
      if (options.json) {
        console.log(JSON.stringify({ error: e.message }, null, 2));
      } else {
        console.error(chalk.red(`✗ Error retrieving history: ${e.message}`));
      }
      process.exit(1);
    }
  });

program
  .command('diff [project]')
  .description('Show file differences from previous DevFix repairs')
  .option('--rollback <id>', 'Rollback snapshot ID to compare')
  .option('--json', 'Output diff in machine-readable JSON format')
  .action(async (projectArg, options) => {
    try {
      const match = await StagingWorkspace.getRollbackDiff(options.rollback, { projectPath: projectArg });
      if (options.json) {
        console.log(JSON.stringify(match, null, 2));
        return;
      }

      console.log(chalk.cyan.bold('DEVFIX REPAIR DIFF\n'));
      console.log(`Snapshot: ${chalk.cyan(match.rollbackId)} (${match.timestamp})`);
      console.log(`Project:  ${chalk.blue(match.projectPath)}`);
      console.log(`Status:   ${match.status}\n`);

      if (match.files.added.length > 0) {
        console.log(chalk.green(`Added files (${match.files.added.length}):`));
        match.files.added.forEach((f) => console.log(chalk.green(`  + ${f}`)));
        console.log('');
      }
      if (match.files.modified.length > 0) {
        console.log(chalk.yellow(`Modified files (${match.files.modified.length}):`));
        match.files.modified.forEach((f) => console.log(chalk.yellow(`  ~ ${f}`)));
        console.log('');
      }
      if (match.files.deleted.length > 0) {
        console.log(chalk.red(`Deleted files (${match.files.deleted.length}):`));
        match.files.deleted.forEach((f) => console.log(chalk.red(`  - ${f}`)));
        console.log('');
      }
      if (match.files.added.length === 0 && match.files.modified.length === 0 && match.files.deleted.length === 0) {
        console.log(chalk.gray('No file changes recorded for this snapshot.'));
      }
    } catch (e) {
      if (options.json) {
        console.log(JSON.stringify({ error: e.message }, null, 2));
      } else {
        console.error(chalk.red(`✗ Error viewing diff: ${e.message}`));
      }
      process.exit(1);
    }
  });

program
  .command('inspect [dir]')
  .description('Inspect a project directory and detect language/runtime')
  .option('--json', 'Output inspection metadata in machine-readable JSON format')
  .action(async (dir, options) => {
    const targetDir = dir || '.';
    const absPath = path.resolve(process.cwd(), targetDir);

    const { ProjectDetector } = await import('../project/Detector.js');
    const { ProjectFormatter } = await import('../project/Formatter.js');

    const isJson = Boolean(options.json);
    const spinner = createSpinner('Inspecting project...', isJson);
    try {
      const context = await ProjectDetector.inspect(absPath);
      stopSpinner(spinner, true, 'Inspection complete', isJson);
      
      if (isJson) {
        console.log(JSON.stringify(context, null, 2));
      } else {
        const output = ProjectFormatter.formatTerminalOutput(absPath, context);
        console.log('\n' + output);
      }
    } catch (e) {
      stopSpinner(spinner, false, 'Inspection failed', isJson);
      if (isJson) {
        console.log(JSON.stringify({ error: e.message }, null, 2));
      } else {
        console.error(chalk.red(`✗ Error: ${e.message}`));
      }
      process.exit(1);
    }
  });

program
  .command('demo <case>')
  .description('Run a benchmark demonstration case (DEV-01 to DEV-10)')
  .option('--allow-network', 'Allow container network access during demo case (default: disabled)')
  .action(async (caseId, options) => {
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
    
    const sandbox = new DockerSandbox({ allowNetwork: Boolean(options.allowNetwork) });
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
      const savedPaths = await new TelemetryLogger().save(result);
      displayTelemetry(result);
      if (savedPaths?.md) console.log(`\nTrajectory: ${savedPaths.md}\n`);
      process.exit(result.finalStatus === 'SUCCESS' ? 0 : 1);
    } else {
      process.exit(5);
    }
  });

program
  .command('benchmark')
  .description('Run the 10-case Hackathon Benchmark')
  .option('--case <id>', 'Run a specific case')
  .option('--allow-network', 'Allow container network access during benchmark runs (default: disabled)')
  .action(async (options) => {
    const { BenchmarkRunner } = await import('../benchmark/Runner.js');
    try {
      const output = await BenchmarkRunner.evaluate(
        DEMO_CASES,
        options.case,
        createSpinner,
        stopSpinner,
        { allowNetwork: Boolean(options.allowNetwork) }
      );
      console.log('\n' + output);
    } catch (e) {
      console.error(chalk.red(`✗ Benchmark failed: ${e.message}`));
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('Check system requirements and environment health')
  .option('--json', 'Output system health report in machine-readable JSON format')
  .action((options) => {
    const isJson = Boolean(options.json);
    const checks = {
      node: { status: 'ok', version: process.version },
      dockerCli: { status: 'unknown' },
      dockerDaemon: { status: 'unknown' },
      git: { status: 'unknown' },
      llm: { status: 'unknown' },
      storage: { status: 'unknown' },
      telemetry: { status: 'unknown' },
    };
    let hasError = false;

    // 1. Docker CLI
    try {
      const ver = execSync('docker --version', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      checks.dockerCli = { status: 'ok', version: ver };
    } catch (e) {
      checks.dockerCli = { status: 'error', error: 'Docker CLI not found in PATH' };
      hasError = true;
    }

    // 2. Docker Daemon
    try {
      execSync('docker info', { stdio: 'ignore' });
      checks.dockerDaemon = { status: 'ok' };
    } catch (e) {
      checks.dockerDaemon = { status: 'error', error: 'Docker daemon is not running or not reachable' };
      hasError = true;
    }

    // 3. Git CLI
    try {
      const gitVer = execSync('git --version', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      checks.git = { status: 'ok', version: gitVer };
    } catch (e) {
      checks.git = { status: 'error', error: 'Git CLI not found in PATH' };
      hasError = true;
    }

    // 4. Configured LLM Provider
    const { providerType: provider, modelName: model, apiKey, baseURL } = resolveProviderConfig();
    const isLocal = isLocalOrKeylessProvider(provider, baseURL);
    const hasKey = !!apiKey;
    if (isLocal) {
      checks.llm = { status: 'ok', provider, model, isLocal: true, baseURL: baseURL || 'localhost' };
    } else if (hasKey) {
      checks.llm = { status: 'ok', provider, model, configured: true };
    } else {
      checks.llm = { status: 'error', provider, model, error: 'API credentials missing (set LLM_API_KEY or GEMINI_API_KEY)' };
      hasError = true;
    }

    // 5. Storage / Rollback directory check
    try {
      const rollbackDir = process.env.DEVFIX_ROLLBACK_DIR || path.join(os.homedir(), '.devfix', 'rollbacks');
      fs.mkdirSync(rollbackDir, { recursive: true });
      fs.accessSync(rollbackDir, fs.constants.W_OK);
      checks.storage = { status: 'ok', rollbackDir };
    } catch (e) {
      checks.storage = { status: 'error', error: `Cannot write to rollback directory: ${e.message}` };
      hasError = true;
    }

    // 6. Telemetry status
    const telemetryDisabled =
      process.env.DEVFIX_TELEMETRY === '0' ||
      process.env.DO_NOT_TRACK === '1' ||
      process.env.DEVFIX_NO_TELEMETRY === '1';
    checks.telemetry = { status: telemetryDisabled ? 'opted_out' : 'enabled' };

    if (isJson) {
      console.log(JSON.stringify({ ok: !hasError, checks }, null, 2));
      process.exit(hasError ? 3 : 0);
      return;
    }

    console.log(chalk.cyan.bold('DEVFIX DOCTOR\n'));
    console.log(chalk.green(`✓ Node.js (${process.version})`));

    if (checks.dockerCli.status === 'ok') {
      console.log(chalk.green(`✓ Docker CLI (${checks.dockerCli.version})`));
    } else {
      console.log(chalk.red('✗ Docker CLI not found'));
    }

    if (checks.dockerDaemon.status === 'ok') {
      console.log(chalk.green('✓ Docker daemon running'));
    } else {
      console.log(chalk.red('✗ Docker daemon not reachable (start Docker Desktop or docker service)'));
    }

    if (checks.git.status === 'ok') {
      console.log(chalk.green(`✓ Git (${checks.git.version})`));
    } else {
      console.log(chalk.red('✗ Git CLI not found'));
    }

    console.log(chalk.green(`✓ LLM_PROVIDER=${provider}`));
    console.log(chalk.green(`✓ LLM_MODEL=${model}`));
    if (isLocal) {
      console.log(chalk.green(`✓ Local endpoint (${baseURL || 'localhost'}) — keyless configuration active`));
    } else if (hasKey) {
      console.log(chalk.green('✓ API credentials configured'));
    } else {
      console.log(chalk.red('✗ API credentials missing (set LLM_API_KEY or GEMINI_API_KEY)'));
    }

    if (checks.storage.status === 'ok') {
      console.log(chalk.green(`✓ Rollback storage ready (${checks.storage.rollbackDir})`));
    } else {
      console.log(chalk.red(`✗ Rollback storage error: ${checks.storage.error}`));
    }

    if (checks.telemetry.status === 'opted_out') {
      console.log(chalk.yellow('ℹ Telemetry is disabled (DEVFIX_TELEMETRY=0 / DO_NOT_TRACK=1)'));
    } else {
      console.log(chalk.green('✓ Local telemetry recording enabled'));
    }

    console.log('');
    if (hasError) {
      console.log(chalk.red('Resolve the errors above before running devfix fix.'));
      process.exit(3);
    } else {
      console.log(chalk.green('Ready. All system checks passed.'));
      process.exit(0);
    }
  });

program.parse(process.argv);
