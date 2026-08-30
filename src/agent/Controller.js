import { DockerSandbox } from '../sandbox/Docker.js';
import { ToolRegistry } from '../tools/registry.js';
import { verify } from '../verifier/index.js';
import { LLMProvider } from '../llm/Provider.js';
import { SYSTEM_INSTRUCTION } from './Prompts.js';

const MAX_TOTAL_CONTEXT_LENGTH = 32000;
const MAX_TOOL_OUTPUT_LENGTH = 6000;

function truncateOutput(str) {
  if (typeof str !== 'string') return '';
  if (str.length <= MAX_TOOL_OUTPUT_LENGTH) return str;
  const half = Math.floor(MAX_TOOL_OUTPUT_LENGTH / 2);
  return str.slice(0, half) + `\n\n...[TRUNCATED ${str.length - MAX_TOOL_OUTPUT_LENGTH} chars]...\n\n` + str.slice(-half);
}

function normalizeToolCall(name, argsString) {
  try {
    const args = JSON.parse(argsString);
    // Sort keys for deterministic JSON
    const sortedKeys = Object.keys(args).sort();
    const normalizedArgs = {};
    for (const k of sortedKeys) {
      normalizedArgs[k] = args[k];
    }
    return JSON.stringify({ name, args: normalizedArgs });
  } catch (e) {
    return JSON.stringify({ name, argsString });
  }
}

export class AgentController {
  constructor(config = {}) {
    this.provider = new LLMProvider(config);
    this.maxIterations = config.maxIterations || 15;
    this.isCancelled = false;
    
    // Dependency injection for testability
    this.SandboxClass = config.SandboxClass || DockerSandbox;
    this.ToolRegistryClass = config.ToolRegistryClass || ToolRegistry;
    this.verifierFn = config.verifierFn || verify;
    this.onEvent = config.onEvent || (() => {});

    this.sandbox = null;
    
    // For graceful cancellation
    this.onCancel = () => {
      this.isCancelled = true;
    };
    process.on('SIGINT', this.onCancel);
    process.on('SIGTERM', this.onCancel);
  }

  async run({ initialFailure, projectContext, verifierConfig }) {
    this.sandbox = new this.SandboxClass({ name: `agent-sandbox-${Date.now()}` });
    const registry = new this.ToolRegistryClass(this.sandbox);
    const schemas = registry.getSchemas();

    let telemetry = {
      project: projectContext && projectContext.length > 50 ? projectContext.substring(0, 50) + '...' : projectContext,
      provider: this.provider.providerType,
      model: this.provider.modelName,
      startTime: Date.now(),
      endTime: null,
      durationMs: 0,
      iterations: 0,
      toolCalls: 0,
      validToolCalls: 0,
      invalidToolCalls: 0,
      providerErrors: 0,
      verificationAttempts: 0,
      finalStatus: 'UNKNOWN',
      finalVerification: null,
      tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };

    let messages = [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      { role: 'user', content: `Context:\n${projectContext}\n\nInitial Failure:\n${initialFailure}` }
    ];

    const actionHistory = new Set();
    let consecutiveDuplicates = 0;

    const finalize = async (status, verifierResult = null) => {
      process.off('SIGINT', this.onCancel);
      process.off('SIGTERM', this.onCancel);
      telemetry.endTime = Date.now();
      telemetry.durationMs = telemetry.endTime - telemetry.startTime;
      telemetry.finalStatus = status;
      telemetry.finalVerification = verifierResult;
      telemetry.conversation = messages;
      
      if (this.sandbox) {
        await this.sandbox.stop();
      }
      this.onEvent({ type: 'agent_done', status, telemetry });
      return telemetry;
    };

    try {
      await this.sandbox.start();

      while (telemetry.iterations < this.maxIterations) {
        if (this.isCancelled) {
          return finalize('USER_ABORTED');
        }

        telemetry.iterations++;
        this.onEvent({ type: 'iteration_start', iteration: telemetry.iterations });

        // Context Management: Truncate history if too long, preserving system prompt, initial failure, and recent items
        let currentLength = messages.reduce((acc, m) => acc + (m.content ? m.content.length : 100), 0);
        while (currentLength > MAX_TOTAL_CONTEXT_LENGTH && messages.length > 4) {
          // Keep indices 0 and 1 (system and initial user). Remove index 2.
          const removed = messages.splice(2, 1)[0];
          currentLength -= (removed.content ? removed.content.length : 100);
        }

        let response;
        try {
          this.onEvent({ type: 'agent_investigating' });
          response = await this.provider.chat(messages, schemas);
          if (response.usage) {
            telemetry.tokenUsage.prompt_tokens += response.usage.prompt_tokens || 0;
            telemetry.tokenUsage.completion_tokens += response.usage.completion_tokens || 0;
            telemetry.tokenUsage.total_tokens += response.usage.total_tokens || 0;
          }
        } catch (err) {
          telemetry.providerErrors++;
          this.onEvent({ type: 'provider_error', error: err.message });
          return finalize('PROVIDER_ERROR');
        }

        const messageData = { role: 'assistant', content: response.content || "" };
        
        let didStateChange = false;

        if (response.toolCalls && response.toolCalls.length > 0) {
          messageData.tool_calls = response.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: tc.arguments }
          }));
          messages.push(messageData);

          for (const tc of response.toolCalls) {
            telemetry.toolCalls++;
            this.onEvent({ type: 'tool_selected', name: tc.name, args: tc.arguments });
            
            // Validate arguments
            let parsedArgs;
            try {
              parsedArgs = JSON.parse(tc.arguments);
              telemetry.validToolCalls++;
            } catch (e) {
              telemetry.invalidToolCalls++;
              this.onEvent({ type: 'tool_error', name: tc.name, error: 'Malformed arguments' });
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: tc.name,
                content: `Malformed tool call arguments: ${e.message}`
              });
              continue;
            }

            // Duplicate detection
            const actionKey = normalizeToolCall(tc.name, tc.arguments);
            if (actionHistory.has(actionKey)) {
              consecutiveDuplicates++;
              if (consecutiveDuplicates >= 2) {
                return finalize('REPEATED_ACTION');
              }
              this.onEvent({ type: 'duplicate_action', name: tc.name });
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: tc.name,
                content: `Error: You have already executed this exact tool call. Do not repeat failed actions. Formulate a new hypothesis or use different arguments.`
              });
              continue;
            } else {
              consecutiveDuplicates = 0;
              actionHistory.add(actionKey);
            }

            // Execute tool
            const toolResult = await registry.executeTool(tc.name, parsedArgs);
            this.onEvent({ type: 'tool_executed', name: tc.name, success: toolResult.success });
            
            let resultStr = "";
            if (!toolResult.success) {
              resultStr = `Tool Execution Failed:\n${toolResult.responseStr || toolResult.error || JSON.stringify(toolResult)}`;
            } else {
              resultStr = `Success. ${toolResult.responseStr || JSON.stringify(toolResult)}`;
            }

            // Truncate output
            resultStr = truncateOutput(resultStr);
            
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: tc.name,
              content: resultStr
            });

            // Mark state change for verification
            if (tc.name === 'patch_file') {
              didStateChange = true;
            } else if (tc.name === 'execute_command') {
              // Heuristic for state changing commands
              const cmd = parsedArgs.command || "";
              const isStateChange = /npm i|npm rm|yarn add|yarn remove|apt-get|apk add|chmod|chown|kill|fuser|pkill|sed -i|dos2unix|mv |cp /.test(cmd);
              if (isStateChange) {
                didStateChange = true;
              }
            }
          }
        } else {
          // Agent returned no tool calls, meaning it thinks it's done or stuck.
          messages.push(messageData);
          didStateChange = true; // Force verify if it stops
        }

        // Verification Boundary
        if (didStateChange && verifierConfig) {
          telemetry.verificationAttempts++;
          this.onEvent({ type: 'verifier_start' });
          const verifierResult = await this.verifierFn(this.sandbox, verifierConfig);
          this.onEvent({ type: 'verifier_result', success: verifierResult.success, details: verifierResult });
          
          if (verifierResult.success) {
            return finalize('SUCCESS', verifierResult);
          } else {
            messages.push({
              role: 'user',
              content: `Verification Failed:\n${JSON.stringify(verifierResult, null, 2)}\n\nThe environment is not fully repaired. Keep investigating.`
            });
            // Clear history because state changed, so reading files or running commands again is valid
            actionHistory.clear();
          }
        } else if (!response.toolCalls || response.toolCalls.length === 0) {
          // If no tool calls were made and verification didn't succeed or wasn't configured, prompt to continue
          messages.push({
            role: 'user',
            content: `You did not provide a tool call. Remember, you must diagnose and fix the environment using tools, and the verifier will declare success automatically if fixed.`
          });
        }
      }

      return finalize('MAX_ITERATIONS');

    } catch (e) {
      console.error("Agent Loop Error:", e);
      return finalize('SANDBOX_ERROR');
    }
  }
}
