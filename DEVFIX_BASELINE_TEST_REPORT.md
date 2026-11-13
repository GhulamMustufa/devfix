# DevFix — Baseline Test & Verification Report (Phase 0)

**Date:** 2026-11-12
**Branch:** `main` at commit `fae4507` (clean working tree before creating `improve/production-audit-and-hardening`)
**Node.js:** `v20.19.4`
**Local `package.json` version:** `1.0.2`
**Published npm version (`npm view devfix version`):** `1.0.2`

---

## 1. Executed Checks Summary

| Check | Command | Outcome | Details |
|---|---|---|---|
| Dependency Install | `npm ci` | **PASS** | Installed 148 packages cleanly (note: `node_modules/` was absent initially). |
| Unit & Integration Suite | `npm test` (`node --test tests/*.test.js`) | **PARTIAL FAIL (45 pass / 5 fail)** | All 45 non-Docker/mocked tests passed. All 5 failures are caused by Docker daemon not running on the host (`/Users/mac/.docker/run/docker.sock`). |
| Docker Integration Tests (outside sandbox) | `node --test tests/foundation.test.js tests/verifier.test.js` | **PARTIAL FAIL (5 pass / 5 fail)** | Docker daemon on host is stopped (`Cannot connect to the Docker daemon at unix:///Users/mac/.docker/run/docker.sock`). Non-Docker subtests in `foundation.test.js` (5/5) passed. |
| Docs Build | `npm run docs:build` | **PASS** | VitePress `1.6.4` built `docs/.vitepress/dist` in 5.58s with zero errors. |
| Package Tarball Check | `npm pack --dry-run` | **PASS** | Valid `devfix-1.0.2.tgz` (24.7 kB packed, 25 files: `bin/devfix`, `src/**`, `README.md`, `package.json`). |
| CLI Inspect Check | `node bin/devfix inspect .` | **PASS** | Correctly detected JavaScript, Node.js, npm, `package.json`, `package-lock.json`, `npm test`. |
| CLI Doctor Check | `node bin/devfix doctor` | **EXPECTED FAIL (exit 3)** | Reported Node `v20.19.4` ✓, Docker CLI ✓, Docker daemon ✗, `LLM_API_KEY` missing ✗. **Bug observed:** printed default `LLM_PROVIDER=openai` and `LLM_MODEL=gpt-4o-mini`, contradicting `LLMProvider` (`deepseek` / `deepseek-chat`). |

---

## 2. Detailed Test Breakdown (`npm test`)

| Test File | Passed | Failed | Notes |
|---|---|---|---|
| `tests/agent.test.js` | 5 | 0 | Mocked `Sandbox`, `ToolRegistry`, `verifierFn`, `provider.chat`. Covers verifier termination, max iterations, duplicate action detection, malformed tool call recovery, provider 401 error. |
| `tests/benchmark.test.js` | 4 | 0 | `Metrics.calculate` (rate/avg/cost, empty results, unknown provider) and `Reporter.generateTerminalReport`. |
| `tests/cli.test.js` | 16 | 0 | 6 CLI checks (`--help`, `--version`, missing `--verify`, invalid path, file path, unknown demo case), 3 `TelemetryLogger` redaction checks, 7 `TrajectoryGenerator` checks. |
| `tests/project-detector.test.js` | 10 | 0 | 9 subtests + 1 parent suite count = 10 passing checks for Node/JS/TS/Python/empty/malformed JSON/ambiguous directories. |
| `tests/foundation.test.js` | 5 | 3 | **Passed (5):** `execute_command rejects dangerous patterns`, `read_file restricts path traversal`, `patch_file fails safely on non-existent path`, `patch_file fails safely on invalid range`, `sandbox stops and cleans up`. **Failed (3):** `sandbox creates and starts`, `execute_command enforces timeout`, `patch_file preserves executable permissions` — all 3 failed because Docker daemon is not running. |
| `tests/verifier.test.js` | 0 | 1 (suite) | Top-level `await sandbox.start()` threw because Docker daemon is not running, aborting all 10 subtests (`Dispatcher`, `Process` x4, `HTTP` x5). |
| **Total** | **45** | **5** | **45 passing, 5 failing (all 5 due to stopped Docker daemon).** |

---

## 3. Critical Test Suite Gaps Identified

The current test suite provides **zero coverage** for:
1. **Security Attacks:**
   - Shell command injection in `read_file` (`filepath`), `patch_file` (`filepath`, `replacement`), and `Http.js` (`url`).
   - Symlink traversal inside `/app` or across host mounts.
   - Telemetry redaction of GitHub, AWS, Gemini, Groq, NPM, Slack tokens, database URLs with passwords, private keys, `.env` secrets, and `process.env.LLM_API_KEY`.
2. **LLM Provider (`src/llm/Provider.js`):**
   - No unit tests at all for `Provider` constructor validation, retry/exponential backoff on 429/500, fast-fail on 400/401/403/404, `_scrubError`, or custom/Ollama endpoints.
3. **Agent Controller Edge Cases (`src/agent/Controller.js`):**
   - No test for context window truncation (`MAX_TOTAL_CONTEXT_LENGTH`) with `tool_calls` + `tool` messages.
   - No test for `SIGINT`/`SIGTERM` cancellation (`USER_ABORTED`).
   - No test for state-changing shell commands (e.g., `echo > .env`, `pip install`).
4. **CLI Commands Not Tested:**
   - `devfix inspect`, `devfix doctor`, `devfix benchmark`, and actual `devfix fix` execution path (mocked or integration).
5. **Project Detection Gaps:**
   - No tests for monorepos, multiple conflicting lockfiles, Node/Python version files (`.nvmrc`, `engines.node`, `.python-version`), `uv`, `Pipfile`, or `yarn`/`pnpm` command generation.
6. **Test Hygiene Bugs:**
   - `tests/foundation.test.js` and `tests/verifier.test.js` do not wrap `sandbox.stop()` in `try/finally` or `t.after(...)`, risking leaked containers when a test fails mid-run.
   - `tests/foundation.test.js:19` calls `registry.executeTool('execute_command', { command: 'sleep 3' })` and discards `res` without asserting on it (line 20 tests `sandbox.execute` directly instead).

---

## 4. Benchmark Suite Inspection (`src/demo/cases.js` & `artifacts/`)

- **Preserved Historical Evidence:**
  - `artifacts/phase-3j/summary.json` & `artifacts/phase-4f/final-summary.json`: `3/5 (60%)` on `DEV-01`..`DEV-05` using `deepseek-chat` (`DEV-01` failed, `DEV-02` passed, `DEV-03` failed, `DEV-04` passed, `DEV-05` passed).
- **Defects Found in Current `src/demo/cases.js` (10-case suite):**
  1. `DEV-01`: Verifier runs `docker build -t dev-01 .` inside a `node:20-alpine` container that has no Docker daemon (`sh: docker: not found` in `artifacts/phase-3j/DEV-01.json:12`).
  2. `DEV-03`: `verifierConfig` sets `command: 'node index.js'`, while `src/verifier/Http.js` reads `startCommand` — so the server under test is never started during verification.
  3. `DEV-06` & `DEV-10`: Both start an Express HTTP server (`app.listen(...)`) that never exits, yet both use `verifierConfig.type: 'process'` expecting exit code `0`, guaranteeing a timeout unless the agent deletes the server listen call!
  4. None of `DEV-01`..`DEV-10` currently test Python environments (`pip`, `poetry`, `uv`, `pytest`), `yarn`/`pnpm` conflicts, Node version mismatches, or realistic test-suite verification.

