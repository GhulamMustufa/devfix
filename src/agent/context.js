/**
 * Safe context management for LLM conversation history.
 * Prunes conversation history in atomic turn blocks so tool_calls and tool results
 * are never orphaned, preserving OpenAI-compatible API protocol integrity.
 */

export function calculateContextLength(messages) {
  if (!Array.isArray(messages)) return 0;
  return messages.reduce((acc, m) => {
    let len = 0;
    if (typeof m.content === 'string') {
      len += m.content.length;
    } else if (m.content) {
      len += JSON.stringify(m.content).length;
    } else {
      len += 100;
    }
    if (Array.isArray(m.tool_calls)) {
      len += JSON.stringify(m.tool_calls).length;
    }
    return acc + len;
  }, 0);
}

export function pruneMessages(messages, maxTotalLength = 32000, minRecentTurnsToKeep = 2) {
  if (!Array.isArray(messages) || messages.length <= 3) {
    return messages;
  }

  let totalLen = calculateContextLength(messages);
  if (totalLen <= maxTotalLength) {
    return messages;
  }

  // Preserve header: system (0) and initial user prompt (1)
  const header = [messages[0], messages[1]];
  const body = messages.slice(2);

  // Group body into atomic turn blocks
  // An atomic turn block is a slice of messages that must never be split:
  // e.g. [assistantWithToolCalls, toolResult1, toolResult2, ...]
  const turns = [];
  let i = 0;
  while (i < body.length) {
    const msg = body[i];
    if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const toolCallIds = new Set(msg.tool_calls.map((tc) => tc.id));
      const turnMsgs = [msg];
      i++;
      while (i < body.length && body[i].role === 'tool' && toolCallIds.has(body[i].tool_call_id)) {
        turnMsgs.push(body[i]);
        i++;
      }
      turns.push(turnMsgs);
    } else {
      turns.push([msg]);
      i++;
    }
  }

  let prunedAny = false;
  // Prune oldest turn blocks until within budget, preserving at least minRecentTurnsToKeep
  while (turns.length > minRecentTurnsToKeep) {
    const candidate = [header[0], header[1], ...turns.flat()];
    if (calculateContextLength(candidate) <= maxTotalLength) {
      break;
    }
    turns.shift();
    prunedAny = true;
  }

  if (!prunedAny) {
    return messages;
  }

  const notice = {
    role: 'user',
    content: '[Earlier iteration history trimmed to conserve context window]',
  };

  const finalMessages = [header[0], header[1], notice];
  for (const turn of turns) {
    finalMessages.push(...turn);
  }

  return finalMessages;
}

