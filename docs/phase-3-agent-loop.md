# Phase 3A: Agent Loop Extraction

Based on the empirical success of the Local Dev Environment Troubleshooter in Phase 2D.5, we have extracted the minimal viable autonomous loop required to reproduce the behavior.

## 1. Initial State
*   **Input:** The agent receives a broken workspace directory and a "Start Command" (e.g., `docker build -t app . && docker run app`).
*   **System Prompt:** Instructions on its role as a Local Dev Troubleshooter, emphasizing observation before modification, and strict adherence to resolving the root cause without rewriting the entire application.

## 2. Required Tools (Minimal Set)
To replicate Antigravity's success, the agent only needs three core capabilities:
1.  **`execute_command(command: string)`:** Runs a bash command in the sandbox and returns stdout/stderr and exit code.
2.  **`read_file(filepath: string)`:** Returns the contents of a file.
3.  **`patch_file(filepath: string, target: string, replacement: string)`:** Modifies a specific block of text in a file.

## 3. The Autonomous Loop (ReAct)
The system executes a classic Reasoning + Acting (ReAct) loop:

1.  **OBSERVE:** The system deterministically runs the Start Command and feeds the `stderr`/`stdout` crash log to the agent.
2.  **DIAGNOSE (Thought):** The LLM analyzes the stack trace and forms a hypothesis. If the error is ambiguous (e.g., `MODULE_NOT_FOUND`), the agent issues a `read_file` or `execute_command(ls -la)` tool call to gather more context.
3.  **ACT:** The agent issues a modifying tool call (e.g., `execute_command(npm install)` or `patch_file(Dockerfile)`).
4.  **SYSTEM EXECUTION:** The runner executes the tool in the sandbox and appends the result to the conversation.
5.  **VERIFY:** The agent runs the Start Command again to see if the issue is resolved.
6.  **UPDATE HYPOTHESIS:** If the command still fails, the agent observes the *new* error (cascading failure) and repeats from Step 2.

## 4. Loop Termination
The agent loop stops when:
*   The agent explicitly calls a `finish(success: boolean, summary: string)` tool, OR
*   The independent deterministic verifier intercepts a successful Start Command execution (Exit Code 0) and forcefully terminates the loop, OR
*   The absolute iteration limit is reached (e.g., `MAX_ITERATIONS = 5`).

## 5. Safeties & Resource Exhaustion Prevention
*   **Context Truncation:** Command outputs over 2000 characters are truncated before being fed back to the LLM to prevent context window overflow.
*   **Deterministic Limits:** The loop is strictly capped at 5-10 iterations by the Python/Node controller, completely outside the LLM's control.
*   **Duplicate Action Rejection:** The controller tracks tool calls. If the agent submits the exact same `patch_file` or `execute_command` twice in a row, the controller intercepts it, injects a system warning to the LLM, and forces it to rethink.
