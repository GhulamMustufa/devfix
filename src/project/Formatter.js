import chalk from 'chalk';

export class ProjectFormatter {
  static formatTerminalOutput(projectPath, context) {
    let out = chalk.bold('DEVFIX PROJECT INSPECTION\n\n');
    out += `Path: ${projectPath}\n\n`;

    out += chalk.bold('Language:\n');
    out += `  ${context.language}\n\n`;

    out += chalk.bold('Runtime:\n');
    const runtimeStr = context.runtimeVersion
      ? `${context.runtime} (${context.runtimeVersion})`
      : context.runtime;
    out += `  ${runtimeStr}\n\n`;

    out += chalk.bold('Package Manager:\n');
    let pmStr = context.packageManager;
    if (context.packageManagerVersion) {
      pmStr += ` (${context.packageManagerVersion})`;
    }
    if (context.lockfile) {
      pmStr += ` via ${context.lockfile}`;
    }
    out += `  ${pmStr}\n\n`;

    if (context.isMonorepo) {
      out += chalk.bold('Monorepo / Workspaces:\n');
      const wsStr = Array.isArray(context.workspaces) && context.workspaces.length > 0
        ? context.workspaces.join(', ')
        : 'Enabled';
      out += `  ${chalk.cyan(wsStr)}\n\n`;
    }

    if (context.hasVirtualEnv) {
      out += chalk.bold('Virtual Environment:\n');
      out += `  ${chalk.cyan(context.virtualEnvPath || 'Detected')}\n\n`;
    }

    out += chalk.bold('Docker Base Image:\n');
    out += `  ${chalk.green(context.dockerImage || 'node:20-alpine')}\n\n`;

    if (context.conflicts && context.conflicts.length > 0) {
      out += chalk.bold(chalk.yellow('Warnings / Conflicts:\n'));
      context.conflicts.forEach((c) => {
        out += chalk.yellow(`  ⚠ ${c}\n`);
      });
      out += '\n';
    }

    out += chalk.bold('Project Files:\n');
    if (context.files.length > 0) {
      context.files.forEach((f) => (out += `  ${f}\n`));
    } else {
      out += `  None identified\n`;
    }
    out += '\n';

    out += chalk.bold('Detected Commands:\n');
    const commandKeys = Object.keys(context.commands);
    if (commandKeys.length > 0) {
      commandKeys.forEach((cmd) => {
        out += `  ${cmd}: ${context.commands[cmd]}\n`;
      });
    } else {
      out += `  Could not be inferred\n`;
    }
    out += '\n';

    out += chalk.bold('Sandbox:\n');
    out += `  ${context.sandbox}\n\n`;

    out += chalk.bold('Status:\n');
    out += `  READY\n`;

    return out;
  }
}
