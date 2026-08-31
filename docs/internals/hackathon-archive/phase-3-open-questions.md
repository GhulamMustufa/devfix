# Phase 3A: Open Technical Questions & Implementation Risks

Before beginning full implementation of the architecture, we must address these open questions and technical risks via targeted experiments.

## 1. Tool Call Parsing Reliability
*   **Risk:** Can the standard Gemini/OpenAI SDK consistently output complex file patch JSON objects without syntax errors? Antigravity handles this natively, but our runner must parse raw LLM output.
*   **Mitigation Experiment:** We need to build a tiny LLM script that tries to patch a file 50 times in a row and measure the syntax error rate.

## 2. Docker Execution Latency
*   **Risk:** Phase 2D.5 proved that iterative execution is necessary. If spinning up a Docker container and mounting the volume takes 10 seconds per iteration, a 5-iteration fix will take an unacceptably long time.
*   **Mitigation Experiment:** Should we use `docker exec` on a persistent background container for the duration of the agent loop, rather than `docker run` for every single command?

## 3. Context Truncation Strategy
*   **Risk:** Compilers (like `tsc` or `gcc`) can output 50,000 lines of logs on failure. Feeding this entire log to the LLM will exhaust the context window and massively inflate token costs.
*   **Mitigation Experiment:** We must determine the optimal log trimming strategy. Does the agent need the first 50 lines (the core error) or the last 50 lines (the stack trace exit)? Usually, compiler errors are at the top, while runtime stack traces are at the bottom.

## 4. Native OS vs. Docker Sandbox
*   **Risk:** If we mount the user's host directory into a Docker sandbox, fixing file permissions (e.g., `chmod +x` inside the container) might create file permission issues on the user's host machine. 
*   **Open Question:** Do we copy the files into the container, let the agent fix them, and then explicitly copy back the patched files to the host?

## 5. Infinite LLM Loops
*   **Risk:** What happens if the LLM issues a command that hangs indefinitely (e.g., a dev server `npm run dev` that doesn't return an exit code)? 
*   **Mitigation:** The runner MUST wrap all `execute_command` calls in a strict timeout (e.g., 10 seconds). If it times out, the runner kills the process and tells the LLM "Command timed out."
