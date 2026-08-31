import chalk from 'chalk';

export class ProjectFormatter {
  static formatTerminalOutput(projectPath, context) {
    let out = chalk.bold('DEVFIX PROJECT INSPECTION\n\n');
    out += `Path: ${projectPath}\n\n`;

    out += chalk.bold('Language:\n');
    out += `  ${context.language}\n\n`;

    out += chalk.bold('Runtime:\n');
    out += `  ${context.runtime}\n\n`;

    out += chalk.bold('Package Manager:\n');
    out += `  ${context.packageManager}\n\n`;

    out += chalk.bold('Project Files:\n');
    if (context.files.length > 0) {
      context.files.forEach(f => out += `  ${f}\n`);
    } else {
      out += `  None identified\n`;
    }
    out += '\n';

    out += chalk.bold('Detected Commands:\n');
    const commandKeys = Object.keys(context.commands);
    if (commandKeys.length > 0) {
      commandKeys.forEach(cmd => {
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
