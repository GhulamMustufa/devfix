# Phase 3A: System Architecture

## Minimum Viable Architecture (MVA)
We have selected **Option C (Single agent with structured tool calling and an external deterministic verifier)**. 

### Why Option C?
Phase 2D.5 proved that a single ReAct loop with file/bash capabilities is sufficient to resolve complex local dev failures. Introducing multi-agent hierarchies (e.g., Planner -> Executor -> Verifier) adds immense latency, cost, and debugging complexity without yielding empirical benefits for this specific problem domain. The key is strict deterministic validation, not more LLMs.

---

## Component Design

### 1. User/Task Input (The CLI/Web Interface)
*   **Responsibility:** Accepts the repository path and the broken command from the user (e.g., `agentic-troubleshooter --cmd "npm run build"`).
*   **Implementation:** Deterministic CLI entrypoint.

### 2. Execution Sandbox (Safety Boundary)
*   **Responsibility:** Provides an isolated environment where destructive commands cannot harm the host OS. 
*   **Implementation:** Deterministic. The target repository is mounted into a transient Docker container (e.g., `ubuntu:latest` or matching the dev environment). All agent `execute_command` tools are routed through `docker exec`. The container enforces CPU/Memory/Network limits.

### 3. Agent Runner (The Controller)
*   **Responsibility:** Manages the `while` loop, tracks token usage, handles API rate limits, and enforces maximum iterations.
*   **Inputs:** The conversation history array.
*   **Outputs:** API requests to the LLM; parsed JSON tool calls.
*   **Implementation:** Deterministic Python or TypeScript application using official LLM SDKs (e.g., `@google/generative-ai`).

### 4. The LLM (The Brain)
*   **Responsibility:** Reads the crash logs, forms hypotheses, and outputs structured tool calls.
*   **Inputs:** System prompt, user prompt (the crash log), tool responses.
*   **Outputs:** Text (Thought) + Tool Call (Action).
*   **Implementation:** Model-driven (Gemini 1.5 Pro).

### 5. Independent Verification Engine
*   **Responsibility:** Determines objective truth. The LLM is *not* trusted to declare "I fixed it." 
*   **Inputs:** The user's original start command.
*   **Outputs:** Boolean (Success/Fail) based on Exit Code 0 or a passing health check.
*   **Implementation:** Deterministic. If the LLM claims victory but the verifier gets Exit 1, the verifier injects: *"Verification Failed: The command still errors with [output]. Try again."*

### 6. Safety & State Manager
*   **Responsibility:** Prevents infinite loops and unrecoverable states.
*   **Implementation:** 
    *   *Git Snapshotting:* Before the agent touches any code, the system runs `git init && git add . && git commit -m "snapshot"`. If the agent ruins the environment, the system runs `git reset --hard` to rollback.
    *   *Command Denylist:* Intercepts commands like `rm -rf /`, `sudo`, or `reboot`.

---

## Phase 2 to Phase 3 Mapping
*   *Phase 2D.5 Manual Observation* -> Replaced by automated capturing of `stdout`/`stderr` from the sandbox.
*   *Phase 2D.5 Antigravity File Editing* -> Replaced by LLM `patch_file` and `read_file` JSON tool calls.
*   *Phase 2D.5 Iterative Diagnosis* -> Replaced by the Agent Runner `while` loop feeding error logs back to the LLM.
