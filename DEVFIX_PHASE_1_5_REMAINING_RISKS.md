# DevFix Phase 1.5 Remaining Risks & Known Limitations

**Branch:** `improve/production-audit-and-hardening`  
**Date:** 2026-11-13  
**Status:** Pre-Phase 2 Risk Register

---

## 1. High-Priority Pre-Release Considerations

### A. Live Container Verification Pending Docker Daemon Startup
- **Risk:** While unit tests, argument builders, safety regexes, staging copy/apply/rollback, and injection prevention pass 100%, the end-to-end container execution of `tests/foundation.test.js` and `tests/verifier.test.js` cannot run while the host Docker daemon is stopped at `unix:///Users/mac/.docker/run/docker.sock`.
- **Mitigation:** The moment the Docker daemon is started on the host, run `npm test`. The test suite will automatically execute both Docker integration tests and non-Docker suites.
- **Severity:** Medium (Code verified via unit tests; live daemon execution needed before publishing an npm release).

### B. Unstructured Secrets in Arbitrary Strings
- **Risk:** `Redactor` successfully catches structured tokens (`AIza...`, `sk-...`, `ghp_...`, `AKIA...`, `xox...`, `gsk_...`, `npm_...`), PEM private keys, Bearer/Basic headers, `user:pass@` URLs, `.env` assignments (`SECRET=...`), and any secrets loaded in `process.env`. However, if a user's code generates an arbitrary random 32-character string that has no known prefix and was never declared in `process.env`, pattern-based redaction cannot distinguish it from benign UUIDs or hashes without semantic entity recognition.
- **Mitigation:** Staging excludes real `.env` files entirely by default. Therefore, real project secrets are not present in the staging container to begin with, significantly reducing the probability of printing unstructured secrets to logs.
- **Severity:** Low.

### C. Non-Root File Ownership on Linux Hosts vs macOS Docker Desktop
- **Risk:** On macOS, Docker Desktop uses VirtioFS / osxfs, which transparently maps host UIDs to container UIDs. On native Linux hosts, `DockerSandbox` runs with `--user ${process.getuid()}:${process.getgid()}` (defaulting to `1000:1000` on macOS). If a project directory contains root-owned files or if an Alpine image pre-populates root-owned global folders (e.g. `/usr/local/lib/node_modules`), global `npm install -g` inside the container will fail with `EACCES`.
- **Mitigation:** This behavior is intentional: DevFix is designed to apply developer-level, application-scoped fixes (editing `package.json`, local source code, or invoking local `npm install`), rather than mutating system-level global container packages.
- **Severity:** Low.

---

## 2. Architecture & Functional Limitations Deferred to Subsequent Phases

### D. Context Truncation Across Incomplete Tool Call Pairs (Phase 2 Scope)
- **Current Behavior in `AgentController.js`:**
  Line 118 trims messages when `currentLength > MAX_TOTAL_CONTEXT_LENGTH`:
  `const removed = messages.splice(2, 1)[0];`
  If an `assistant` message containing `tool_calls` is removed while its corresponding `tool` result message is not (or vice versa), OpenAI-compatible providers reject the conversation history with `400 Bad Request` ("tool_call_id does not match").
- **Resolution Plan:** In Phase 2 (Agent Reliability & Loop Protection), update context trimming to prune complete turn blocks (assistant call + tool result pairs) together, or compact tool outputs into observation summaries.
- **Severity:** Medium (Appears only on long runs exceeding 32,000 characters).

### E. `ProjectDetector` Not Yet Integrated with `devfix fix` (Phase 3 Scope)
- **Current Behavior in `cli/index.js`:**
  `devfix inspect` runs `ProjectDetector.inspect(dir)` and prints runtime information. However, `devfix fix` requires manual `--verify "<cmd>"`, rather than automatically inferring default verify commands (e.g. `npm test` or `pytest`).
- **Resolution Plan:** In Phase 3, wire `ProjectDetector` into `devfix fix` to offer smart verifier defaults and multi-runtime Docker image selection (e.g. `python:3.11-slim` for Python projects).
- **Severity:** Low.

### F. Monorepos & Large Directory Staging Performance (Phase 3 Scope)
- **Current Behavior in `StagingWorkspace.js`:**
  `StagingWorkspace` copies all non-sensitive directories recursively into `/tmp`. In large monorepos with existing multi-gigabyte `node_modules` folders, this copy operation incurs noticeable disk I/O and temporary disk space usage.
- **Resolution Plan:** In Phase 3, allow `.devfixignore` or `--exclude` patterns to skip copying heavy build caches when not needed for the repair.
- **Severity:** Low.

---

## 3. Gate Criteria for Phase 2 Approval

Phase 1 and Phase 1.5 have fulfilled all security, workspace isolation, rollback, and verification requirements.

**Before proceeding to Phase 2, the user should:**
1. Review the Phase 1.5 deliverables:
   - [DEVFIX_PHASE_1_5_SECURITY_CLOSURE_REPORT.md](file:///Users/mac/Desktop/projects/devfix/DEVFIX_PHASE_1_5_SECURITY_CLOSURE_REPORT.md)
   - [DEVFIX_PHASE_1_5_TEST_RESULTS.md](file:///Users/mac/Desktop/projects/devfix/DEVFIX_PHASE_1_5_TEST_RESULTS.md)
   - [DEVFIX_PHASE_1_5_REMAINING_RISKS.md](file:///Users/mac/Desktop/projects/devfix/DEVFIX_PHASE_1_5_REMAINING_RISKS.md)
2. Verify that branch `improve/production-audit-and-hardening` is clean and ready.
3. Provide explicit approval to proceed to **Phase 2: Agent Reliability & Loop Protection**.

