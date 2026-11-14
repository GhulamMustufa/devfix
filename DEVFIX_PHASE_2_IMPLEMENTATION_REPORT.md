# DevFix Phase 2 Implementation Report — Agent Reliability & Deterministic Verification

**Branch:** `improve/production-audit-and-hardening`  
**Date:** 2026-11-13  
**Status:** Complete. All 108 non-Docker tests are passing (100%). Docker integration tests remain documented as **BLOCKED** due to the stopped host Docker daemon.

---

## Executive Summary

Phase 2 focuses on agent operational reliability, deterministic multi-step verification, signal safety, and seamless local LLM integration. All changes preserve the Phase 1 temporary staging architecture, strict container sandbox security (`--user` non-root, `--cap-drop=ALL`, `--network=none`), and comprehensive secret redaction.

### Key Deliverables Completed in Phase 2
1. **Atomic Context Truncation:** Implemented [src/agent/context.js](file:///Users/mac/Desktop/projects/devfix/src/agent/context.js). Conversation history is now trimmed in atomic turn blocks, guaranteeing that assistant `tool_calls` are never orphaned from their matching `role: 'tool'` response messages.
2. **Cross-Ecosystem State-Change Detection:** Implemented [src/agent/stateChange.js](file:///Users/mac/Desktop/projects/devfix/src/agent/stateChange.js). Expanded detection beyond basic `npm i` to cover Node.js (`pnpm`, `yarn`, `bun`, `corepack`, `npx`), Python (`pip`, `poetry`, `uv`, `conda`, `pipenv`), file writes/redirections (`>`, `>>`, `touch`, `mkdir`, `rm`, `sed -i`, `dos2unix`), process management (`kill`, `pkill`, `fuser`), and compilation (`tsc`, `make`), while ignoring read-only inspection commands (`cat`, `ls`, `grep`, `pwd`).
3. **Keyless Local LLM Support (Ollama & Custom Endpoints):** Updated [src/llm/Provider.js](file:///Users/mac/Desktop/projects/devfix/src/llm/Provider.js) and [src/cli/index.js](file:///Users/mac/Desktop/projects/devfix/src/cli/index.js). DevFix now natively supports `LLM_PROVIDER=ollama` (default model `llama3.2`, default endpoint `http://127.0.0.1:11434/v1`) and local custom endpoints without requiring an artificial `LLM_API_KEY`, while `devfix doctor` recognizes keyless local setups.
4. **Signal Safety & Cancellation Lifecycle:** Implemented `AgentController.prototype.cancel()` in [src/agent/Controller.js](file:///Users/mac/Desktop/projects/devfix/src/agent/Controller.js), eliminating a previous `TypeError: activeController.cancel is not a function` on SIGINT, and ensured signal event listeners are cleanly detached upon finalization.
5. **DEV-03 HTTP Verifier Alignment & Process Lifecycle:** Updated [src/verifier/index.js](file:///Users/mac/Desktop/projects/devfix/src/verifier/index.js) and [src/demo/cases.js](file:///Users/mac/Desktop/projects/devfix/src/demo/cases.js) to accept both `startCommand` and `command`, resolving the parameter mismatch that prevented background servers from launching in DEV-03.
6. **Multi-Check Deterministic Verification:** Upgraded [src/verifier/index.js](file:///Users/mac/Desktop/projects/devfix/src/verifier/index.js) and [src/cli/index.js](file:///Users/mac/Desktop/projects/devfix/src/cli/index.js) with `verifyMulti()`, allowing users to specify multiple sequential checks (e.g. `--verify "npm run build" --verify "npm test"`), while remaining 100% backward compatible with single process and HTTP checks.

---

## Detailed Breakdown of Phase 2 Changes

### Objective 1: Atomic Context Truncation
- **Files:** [src/agent/context.js](file:///Users/mac/Desktop/projects/devfix/src/agent/context.js) (new), [src/agent/Controller.js](file:///Users/mac/Desktop/projects/devfix/src/agent/Controller.js)
1. **What was wrong?**  
   `Controller.js` previously trimmed context using `messages.splice(2, 1)`. If `messages[2]` was an assistant message containing `tool_calls`, its tool responses remained in the array without a parent. Conversely, if it removed a single tool response, the parent assistant message referenced an ID that had no response. OpenAI-compatible API providers reject such histories with `400 Bad Request` (`Invalid 'messages': tool_call_id does not match`).
2. **What did you change?**  
   Created `pruneMessages(messages, maxTotalLength, minRecentTurnsToKeep)`. It groups messages into atomic turn blocks (`[assistantWithTools, tool1, tool2, ...]`). When length exceeds budget, it drops the oldest atomic turns as complete units, inserts a concise tombstone notice, and guarantees that at least the most recent turns are preserved intact.
3. **How does this protect the user?**  
   Long debugging sessions with numerous iterations no longer crash on provider API calls due to malformed message structures.
4. **How was it tested?**  
   Tested via `tests/agent.test.js` (`Context truncation prunes atomic turns without orphaning tool calls or tool results`), verifying assistant call IDs match result IDs 1:1 after pruning.
5. **What limitations remain?**  
   Very large single tool outputs (e.g. a 50,000-character test failure log) are truncated by `truncateOutput()` down to 6,000 characters before entering `messages`, which may omit middle lines of massive stack traces.

---

### Objective 2: Comprehensive State-Change Detection
- **Files:** [src/agent/stateChange.js](file:///Users/mac/Desktop/projects/devfix/src/agent/stateChange.js) (new), [src/agent/Controller.js](file:///Users/mac/Desktop/projects/devfix/src/agent/Controller.js)
1. **What was wrong?**  
   `Controller.js` used a narrow regex (`/npm i|npm rm|yarn add|yarn remove|apt-get|apk add|chmod|chown|kill|fuser|pkill|sed -i|dos2unix|mv |cp /`). Commands using `pnpm`, `bun`, `corepack`, `pip`, `poetry`, `uv`, `touch`, `mkdir`, file write redirections (`>`), or `git restore` did not trigger verification, causing the agent to waste iterations or terminate with `MAX_ITERATIONS` even after fixing the problem.
2. **What did you change?**  
   Extracted `isStateChangingCommand()` covering the complete range of Node.js, Python, container, filesystem, process, compilation, and git mutation commands, while strictly excluding read-only commands (`cat`, `ls`, `grep`, `pwd`, `git status`).
3. **How does this protect the user?**  
   The agent triggers the deterministic verifier immediately after any real fix is applied in Python, Node.js, or shell environments, preventing redundant iterations and unnecessary API token costs.
4. **How was it tested?**  
   Verified in [tests/state-change.test.js](file:///Users/mac/Desktop/projects/devfix/tests/state-change.test.js) (4 passing tests covering 40+ command variations).
5. **What limitations remain?**  
   Complex multi-line bash scripts or alias invocations might not match literal command token patterns unless they contain standard tool names or redirection operators.

---

### Objective 3: Keyless Local LLM Integration (Ollama & Custom Endpoints)
- **Files:** [src/llm/Provider.js](file:///Users/mac/Desktop/projects/devfix/src/llm/Provider.js), [src/cli/index.js](file:///Users/mac/Desktop/projects/devfix/src/cli/index.js)
1. **What was wrong?**  
   `LLMProvider` required `LLM_API_KEY` for all providers except when auto-detecting Gemini. Local setups like Ollama (`http://127.0.0.1:11434/v1`) or LM Studio/vLLM (`http://localhost:1234/v1`) don't require an API key, but DevFix threw `LLM_API_KEY is required but was not provided`.
2. **What did you change?**  
   - Added `ollama` provider with default model `llama3.2` and default baseURL `http://127.0.0.1:11434/v1`.
   - Added `isLocalOrKeylessProvider()`. When using `ollama` or any local custom endpoint (`localhost`, `127.0.0.1`), DevFix sets a default dummy key (`'ollama'`) to satisfy the OpenAI SDK without requiring user configuration.
   - Updated `devfix doctor` to report local keyless endpoints as ready.
3. **How does this protect the user?**  
   Developers can troubleshoot repositories entirely on their own machine using local open-source models with zero API cost and zero data leaving their machine.
4. **How was it tested?**  
   Verified in [tests/provider.test.js](file:///Users/mac/Desktop/projects/devfix/tests/provider.test.js) (9 passing tests).
5. **What limitations remain?**  
   Local small models (e.g. 7B/8B parameters) have lower tool-calling precision than frontier commercial models and may require clear system prompts.

---

### Objective 4: Signal Safety, Cancellation & Resource Cleanup
- **Files:** [src/agent/Controller.js](file:///Users/mac/Desktop/projects/devfix/src/agent/Controller.js), [src/cli/index.js](file:///Users/mac/Desktop/projects/devfix/src/cli/index.js)
1. **What was wrong?**  
   In `cli/index.js`, the SIGINT handler called `activeController.cancel()`. However, `AgentController` only defined `this.onCancel = ...` and did not implement a `.cancel()` method on its prototype, causing an uncaught `TypeError` if a user pressed Ctrl+C. Furthermore, signal listeners were not detached upon run completion.
2. **What did you change?**  
   - Added `cancel()` to `AgentController` setting `this.isCancelled = true`.
   - Ensured `finalize()` removes signal listeners via `process.off('SIGINT', this.onCancel)` and `process.off('SIGTERM', this.onCancel)`.
3. **How does this protect the user?**  
   Graceful exit on Ctrl+C without stack traces, properly triggering staging cleanup and container shutdown.
4. **How was it tested?**  
   Verified in [tests/cancellation.test.js](file:///Users/mac/Desktop/projects/devfix/tests/cancellation.test.js) (2 passing tests).
5. **What limitations remain?**  
   If Node receives a hard `SIGKILL` (`kill -9`), cleanup handlers cannot run; however, `StagingWorkspace` rollback snapshots persist on disk for manual recovery via `devfix rollback`.

---

### Objective 5: DEV-03 HTTP Verifier Alignment
- **Files:** [src/verifier/index.js](file:///Users/mac/Desktop/projects/devfix/src/verifier/index.js), [src/demo/cases.js](file:///Users/mac/Desktop/projects/devfix/src/demo/cases.js), [src/verifier/Http.js](file:///Users/mac/Desktop/projects/devfix/src/verifier/Http.js)
1. **What was wrong?**  
   `src/verifier/index.js` expected `config.startCommand`, while DEV-03 specified `command: 'node index.js'`. Because `startCommand` was undefined, `verifyHttp` never executed the background server, resulting in false negatives.
2. **What did you change?**  
   - Updated `src/verifier/index.js` to accept `startCommand: config.startCommand || config.command`.
   - Updated `DEV-03` definition in `src/demo/cases.js` to include both `startCommand` and `command`.
3. **How does this protect the user?**  
   Ensures benchmark cases and user configurations can specify background servers using either property name.
4. **How was it tested?**  
   Verified in [tests/multi-verifier.test.js](file:///Users/mac/Desktop/projects/devfix/tests/multi-verifier.test.js).
5. **What limitations remain?**  
   HTTP health checks rely on an available HTTP client (`curl`, `wget`, or `node`) inside the container; Alpine images provide `wget` and `node` by default.

---

### Objective 6: Multi-Check Deterministic Verification
- **Files:** [src/verifier/index.js](file:///Users/mac/Desktop/projects/devfix/src/verifier/index.js), [src/cli/index.js](file:///Users/mac/Desktop/projects/devfix/src/cli/index.js)
1. **What was wrong?**  
   `devfix fix` only accepted a single verification command. Real-world projects typically require multiple gates (e.g. build, unit tests, linter, typecheck) to declare a repair successful.
2. **What did you change?**  
   - Implemented `verifyMulti()` in `src/verifier/index.js` supporting arrays of check configurations with named steps, summary reports, and `stopOnFirstFailure`.
   - Updated CLI `fix` command to accept multiple `--verify` flags (e.g. `devfix fix ./project --verify "npm run build" --verify "npm test"`).
   - Preserved 100% backward compatibility for single-command `--verify` options.
3. **How does this protect the user?**  
   An AI fix that makes tests pass by breaking the build or violating typing is prevented from being marked as successful.
4. **How was it tested?**  
   Verified in [tests/multi-verifier.test.js](file:///Users/mac/Desktop/projects/devfix/tests/multi-verifier.test.js) (5 passing tests).
5. **What limitations remain?**  
   Currently, multi-check execution is sequential (stop on first failure); parallel check execution is a potential future performance enhancement.

