class TrajectoryGenerator {
  static generateMarkdown(telemetry) {
    if (!telemetry) return '';

    let md = `# DevFix Agent Trajectory\n\n`;
    md += `Case: ${telemetry.project || 'Unknown'}\n`;
    md += `Model: ${telemetry.provider || 'Unknown'} ${telemetry.model || ''}\n`;
    md += `Result: ${telemetry.finalStatus || 'UNKNOWN'}\n`;
    
    if (telemetry.durationMs) {
      md += `Duration: ${(telemetry.durationMs / 1000).toFixed(1)}s\n`;
    }
    
    md += `Iterations: ${telemetry.iterations || 0}\n`;
    md += `Tool Calls: ${telemetry.toolCalls || 0}\n`;
    
    if (telemetry.tokenUsage && telemetry.tokenUsage.total_tokens) {
      md += `Tokens: ${telemetry.tokenUsage.total_tokens}\n`;
    }
    
    md += `\n---\n\n`;

    const conversation = telemetry.conversation || [];
    let initialFailure = 'Unknown failure';
    if (conversation.length > 1 && conversation[1].role === 'user') {
      const match = conversation[1].content.match(/Initial Failure:\n([\s\S]*)/);
      if (match) initialFailure = match[1].trim();
    }

    md += `## Initial Failure\n\n`;
    md += `\`\`\`text\n${this.truncate(initialFailure)}\n\`\`\`\n\n`;

    let currentIteration = 0;
    
    conversation.forEach((msg) => {
      if (msg.role === 'assistant') {
        currentIteration++;
        const thought = msg.content || '';
        const phase = this.getPhase(thought);
        
        if (thought) {
          md += `---\n\n## Iteration ${currentIteration} — ${phase}\n\n`;
          md += `Agent decision:\n\n> ${thought.trim().split('\\n').join('\\n> ')}\n\n`;
        }

        if (msg.tool_calls) {
          msg.tool_calls.forEach(tc => {
            if (!thought) {
              md += `---\n\n## Iteration ${currentIteration} — ACT\n\n`;
            }
            const name = tc.function.name;
            let args;
            try {
              args = JSON.parse(tc.function.arguments);
            } catch (e) {
              args = { raw: tc.function.arguments };
            }
            
            md += `Tool:\n\`${name}\`\n\n`;
            if (args.command) {
              md += `Command:\n\n\`\`\`text\n${args.command}\n\`\`\`\n\n`;
            } else if (args.file) {
              md += `File:\n\`${args.file}\`\n\n`;
              if (args.content) {
                md += `Content:\n\n\`\`\`text\n${this.truncate(args.content)}\n\`\`\`\n\n`;
              }
            } else {
               md += `Arguments:\n\n\`\`\`json\n${JSON.stringify(args, null, 2)}\n\`\`\`\n\n`;
            }
          });
        }
      } else if (msg.role === 'tool') {
        md += `Result:\n\n\`\`\`text\n${this.truncate(msg.content)}\n\`\`\`\n\n`;
      } else if (msg.role === 'user' && msg.content.includes('Verification Failed')) {
        md += `---\n\n## Iteration ${currentIteration} — VERIFY\n\n`;
        md += `Verifier:\nProcess\n\n`;
        md += `Result:\nFAIL\n\n`;
        
        // Extract the JSON portion if possible
        const lines = msg.content.split('\n');
        const reason = lines.slice(1, lines.length - 2).join('\n'); // skip 'Verification Failed:' and ending prompt
        md += `Reason:\n\`\`\`text\n${this.truncate(reason)}\n\`\`\`\n\n`;
      }
    });

    md += `---\n\n`;
    if (telemetry.finalStatus === 'SUCCESS') {
      md += `## Final Verification\n\n`;
      md += `Verifier:\nSUCCESS\n\n`;
      md += `Result:\nEnvironment verified successfully.\n\n`;
    }
    
    md += `## Final Outcome\n\n`;
    if (telemetry.finalStatus === 'SUCCESS') {
      md += `✓ VERIFIED REPAIR\n\n`;
      md += `The deterministic verifier confirmed that the repaired project satisfies the required condition.\n`;
    } else {
      md += `✗ REPAIR UNSUCCESSFUL\n\n`;
      md += `Reason: ${telemetry.finalStatus}\n`;
    }

    return md;
  }

  static getPhase(thought) {
    if (!thought) return 'ACT';
    const text = thought.toUpperCase();
    if (text.includes('OBSERVE') && !text.includes('INSPECT')) return 'OBSERVE';
    if (text.includes('INSPECT')) return 'INSPECT';
    if (text.includes('ACT') || text.includes('HYPOTHESIZE')) return 'ACT';
    if (text.includes('VERIFY')) return 'VERIFY';
    return 'OBSERVE';
  }

  static truncate(text, maxLines = 50, maxChars = 2000) {
    if (!text || typeof text !== 'string') return String(text);
    
    let lines = text.split('\n');
    let truncated = false;
    
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      truncated = true;
    }
    
    let result = lines.join('\n');
    if (result.length > maxChars) {
      result = result.substring(0, maxChars);
      truncated = true;
    }
    
    if (truncated) {
      result += '\n... [truncated]';
    }
    
    return result;
  }
}

export default TrajectoryGenerator;
