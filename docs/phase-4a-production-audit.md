# Phase 4A — Production Audit

## 1. Current Architecture
The current codebase (built incrementally through Phases 2 and 3) exists primarily as monolithic, highly coupled experimental scripts (e.g., `scratch/phase-3j/runner.mjs`). 
- **Agent Loop**: Hardcoded `while(stats.iterations < MAX_ITERATIONS)` loop tightly bound to benchmark data structures.
- **LLM Integration**: Directly instantiates the `openai` Node SDK with hardcoded `deepseek-chat` configuration.
- **Sandbox Management**: Uses synchronous `child_process.execSync` to run bare `docker run` and `docker exec` commands.
- **Verification**: Verifier logic is tightly coupled to the runner, with hardcoded case IDs (e.g., `if (sandboxName === 'DEV-03')`).
- **Telemetry**: Writes directly to `artifacts/phase-3j/summary.json` at the end of the script.

## 2. Existing Reusable Components
- **System Prompt**: The `systemInstruction` text has been extensively refined and is production-ready.
- **Tool Definitions**: The JSON schemas for `read_file`, `execute_command`, and `patch_file`.
- **Patch Logic**: The `awk` script used to patch files while preserving executable permissions (validated in Phase 3I/3J).
- **Output Truncation**: The `truncate()` function designed to prevent context-window explosion.
- **Rate-Limit Handling**: Basic 429 backoff logic.

## 3. Components Requiring Refactoring
- **Sandbox Execution**: Replace `execSync` with asynchronous `exec` or `spawn` to prevent blocking the Node.js event loop and to allow real-time UI/CLI feedback.
- **Agent Controller**: Decouple the ReAct loop from the benchmark data. The controller must accept a generic `Sandbox` instance and return a trajectory.
- **Dynamic Iteration Control**: Upgrade the hardcoded 15-iteration loop to support early termination upon detecting repeated actions, unrecoverable sandbox states, or verified success.
- **Tool Execution Layer**: Move tool logic out of the main loop and into a dedicated `src/tools/` registry.

## 4. Components Requiring Replacement
- **Ad-Hoc Verifier**: Replace hardcoded `DEV-03` string matching with a generic configuration-driven verifier that can test process exit codes or HTTP health checks independently.
- **Credentials Management**: Remove hardcoded provider checks and use generic `.env` configuration (e.g., `LLM_PROVIDER`, `LLM_MODEL`).

## 5. Technical Debt
- **Synchronous Blocking**: Extensive use of `execSync` prevents graceful teardown on process exit (Ctrl+C).
- **Test Coupling**: Production code must be fully independent of the 5 benchmark cases used to prove it.

## 6. Security Risks
- **Command Injection/Bypass**: The current safety check for `execute_command` relies on simple string matching (`includes('rm -rf /')`), which is trivial to bypass.
- **Sandbox Escapes**: Docker containers are run without resource limits (`--memory`, `--cpus`), leaving the host vulnerable to resource starvation (e.g., fork bombs initiated by the agent). 

## 7. Reliability Risks
- **Network Flakiness**: `npm install` inside the sandbox can fail randomly. The agent needs clear signals to retry, or the sandbox needs robust network access.
- **Long-Running Commands**: An agent might run a server blocking the main thread (like `node index.js`). The controller must aggressively enforce timeouts on `execute_command`.

## 8. Demo Risks
- The Demo Mode must instantiate the DEV cases perfectly. If the demo relies on the scratch scripts, it will look like an academic project instead of a real CLI tool.

## 9. Missing Production Components
- **CLI Interface**: A user-facing CLI (e.g., `bin/devfix`) with argument parsing (using `commander` or `yargs`) and rich terminal output (spinners, colors).
- **Generic Project Loader**: Ability to mount a real local project directory into the sandbox, rather than just executing predefined `echo` commands.
- **Automated Tests**: Unit and integration tests for the controller, tools, and verifier.

## 10. Recommended Implementation Order
1. **Tool & Sandbox Layer (`src/sandbox/`, `src/tools/`)**: Build the asynchronous, resource-limited Docker sandbox and the isolated tool execution functions.
2. **Verifier Layer (`src/verifier/`)**: Implement generic Process and HTTP verifiers.
3. **Agent Controller (`src/agent/`)**: Implement the LLM API abstraction, context window management, and dynamic iteration loop.
4. **CLI & Telemetry (`src/cli/`, `src/telemetry/`)**: Build the user-facing CLI, rich output formatter, and structured JSON telemetry writer.
5. **Demo Mode**: Integrate the 5 benchmark cases as a sub-command (`devfix demo DEV-04`).
6. **End-to-End Testing**: Validate the final product against the full benchmark.
