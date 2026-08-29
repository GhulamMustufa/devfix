import { createExecuteCommand } from './execute.js';
import { createReadFile } from './read.js';
import { createPatchFile } from './patch.js';

const toolSchemas = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file inside the sandbox. Use this before modifying configuration/source files when the file contents are relevant to diagnosis. Returns the filepath and content.",
      parameters: { type: "object", properties: { filepath: { type: "string" } }, required: ["filepath"] }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_command",
      description: "Execute a shell command inside the Docker sandbox only. Does NOT execute on host. Has a 10s timeout. Stdout/stderr are returned. Use this for diagnostic commands and controlled execution. Avoid destructive commands. Do not repeatedly run commands that provide no new information.",
      parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] }
    }
  },
  {
    type: "function",
    function: {
      name: "patch_file",
      description: "Replace a deterministic line range in a file. The patch operation verifies the file and target region exist, modifies only files inside the sandbox, and returns the result.",
      parameters: {
        type: "object",
        properties: {
          filepath: { type: "string" },
          start_line: { type: "integer" },
          end_line: { type: "integer" },
          replacement: { type: "string" }
        },
        required: ["filepath", "start_line", "end_line", "replacement"]
      }
    }
  }
];

class ToolRegistry {
  constructor(sandbox) {
    this.sandbox = sandbox;
    this.handlers = {
      execute_command: createExecuteCommand(sandbox),
      read_file: createReadFile(sandbox),
      patch_file: createPatchFile(sandbox)
    };
  }

  getSchemas() {
    return toolSchemas;
  }

  async executeTool(name, args) {
    if (!this.handlers[name]) {
       return { success: false, responseStr: "Unsupported tool" };
    }
    return this.handlers[name](args);
  }
}

export { ToolRegistry, toolSchemas };
