# DevFix — Complete Architecture Audit

## 1. Does Code Match the Claimed Architecture?

Claimed architecture:
`CLI → Agent Controller → LLM Provider → Tool Registry → Docker Sandbox → Deterministic Verifier → Telemetry`

**Verdict: Mostly yes, with structural coupling flaws.**
All 7 layers exist in `src/` with clean module separation, **except**:
1. **CLI ↔ Sandbox ↔ AgentController Coupling (`src/cli/index.js:74-133`)**: `fix` and `demo` manually instantiate and `start()`/`stop()` `DockerSandbox` outside `AgentController`, then inject a dummy subclass (`SandboxClass`) whose `start()` and `stop()` are no-ops, just to forward `execute()`. Meanwhile, `AgentController.run()` accepts `sandboxName` (ignored) and still creates `new this.SandboxClass(...)`. Notice `SandboxClass` wrapper does **not** forward `executeHostCommand` or `executeDetached`.
2. **Project Detection Is Disconnected from `fix` (`src/cli/index.js:208`)**: `ProjectDetector` (`src/project/Detector.js`) is only used by `devfix inspect`. `devfix fix` ignores it completely and launches `node:20-alpine` with a generic string context even for Python or Yarn/pnpm projects.

---

## 2. Component-by-Component Audit

### A. CLI (`bin/devfix`, `src/cli/index.js`, `package.json`)
- **What is already good:**
  - Clean `commander` setup with `--help`, `--version`, `fix`, `inspect`, `demo`, `benchmark`, `doctor`.
  - TTY-safe `ora` spinner wrapper (`createSpinner` / `stopSpinner`) so CI logs don't break.
  - Validates `<project>` existence and directory type (`exit 2`).
- **What is broken / incomplete:**
  - `doctor` (`src/cli/index.js:356-357`) checks `LLM_PROVIDER || 'openai'` and `LLM_MODEL || 'gpt-4o-mini'`, whereas `LLMProvider` (`src/llm/Provider.js:8-9`) defaults to `'deepseek'` and `'deepseek-chat'`.
  - `fix` mounts the user's real directory directly (`hostMountPath: absPath`), has no `--dry-run`, no `--json`, no `--timeout`, no `--max-iterations`, no interactive approval, no `diff`, and no `rollback`.
  - `TelemetryLogger` (`src/telemetry/Logger.js:7`) and `Reporter` (`src/benchmark/Reporter.js:75`) write to `process.cwd()/artifacts/...`, which pollutes arbitrary working directories when installed globally (`npm i -g devfix`).
  - `package.json` includes unused `@google/generative-ai` in `dependencies`.
  - Global `SIGINT` handler in `src/sandbox/Docker.js:23` calls `process.exit(1)` immediately, preempting `src/cli/index.js:66` and `src/agent/Controller.js:47`, preventing graceful telemetry finalization.

### B. Agent Controller (`src/agent/Controller.js`, `src/agent/Prompts.js`)
- **What is already good:**
  - Dependency-injected (`SandboxClass`, `ToolRegistryClass`, `verifierFn`, `onEvent`), making unit testing without Docker/LLMs straightforward.
  - Tracks rich metrics (`iterations`, `toolCalls`, `validToolCalls`, `invalidToolCalls`, `providerErrors`, `verificationAttempts`, `tokenUsage`).
  - Clears `actionHistory` after failed verification so re-reading modified files isn't falsely flagged as a loop.
- **What is broken / incomplete:**
  - **Context truncation corrupts tool-call pairing (`Controller.js:113-118`)**: `messages.splice(2, 1)` removes one message at a time. Removing an `assistant` message with `tool_calls` leaves orphaned `role: 'tool'` messages (or vice versa), which causes OpenAI/DeepSeek APIs to return `400 Bad Request`. Also `currentLength` ignores `m.tool_calls` size.
  - **Narrow `isStateChange` heuristic (`Controller.js:215`)**: Only matches `/npm i|npm rm|yarn add|yarn remove|apt-get|apk add|chmod|chown|kill|fuser|pkill|sed -i|dos2unix|mv |cp /`. Commands like `echo ... > .env`, `printf >`, `tee`, `pip install`, `poetry install`, `pnpm add`, `npm ci`, `touch`, `rm` do NOT set `didStateChange = true`, so verification is skipped and `actionHistory` is not cleared.
  - **Overly strict duplicate termination (`Controller.js:172`)**: Terminates the whole run with `REPEATED_ACTION` after 2 duplicate calls even if a diagnostic command had non-deterministic environment output or occurred after a non-tracked file change.
  - **No prompt-injection warning in `Prompts.js`**: `SYSTEM_INSTRUCTION` does not instruct the agent to treat repo files, READMEs, comments, and command stderr as untrusted data. Also hardcodes Node examples (`npm install dotenv`) even for Python projects.

### C. LLM Provider (`src/llm/Provider.js`)
- **What is already good:**
  - Supports `deepseek`, `openai`, `groq`, `openrouter`, and `custom` via the `openai` SDK.
  - Fails fast on permanent HTTP status codes (`400`, `401`, `403`, `404`) and uses exponential backoff for transient errors.
  - Scrubs `this.apiKey` from thrown error messages (`_scrubError`).
- **What is broken / incomplete:**
  - **Blocks local models without API keys (`Provider.js:12-14`)**: Throws if `LLM_API_KEY` is missing, even for `providerType === 'custom'` (Ollama/LM Studio).
  - **Double retry amplification**: `MAX_RETRIES = 6` wraps an `OpenAI` client whose default `maxRetries` is `2`, yielding up to `7 * 3 = 21` API attempts and no explicit per-request `timeout`.
  - **Local/custom model edge cases (`Provider.js:73-83`)**: Crashes if `response.choices` is empty; assumes `tc.function.arguments` is always a string (some local servers return an object) and `tc.id` is always present.
  - **Inconsistent env vars**: Docs/scripts mention `DEEPSEEK_API_KEY` / `GEMINI_API_KEY`, while `Provider.js` only reads `LLM_API_KEY`.

### D. Tool Registry (`src/tools/`)
- **What is already good:**
  - Clean 3-tool design (`read_file`, `execute_command`, `patch_file`) with JSON schemas.
  - Preserves file permissions during `patch_file` (regression-tested).
- **What is broken / dangerous:**
  - **Shell injection in `read.js:17` and `patch.js:24-35`**: Unquoted `resolvedPath` and unsafe `JSON.stringify(args.replacement)` interpolated into `sh -c`.
  - **Silent out-of-bounds patch (`patch.js:35`)**: If `start_line` exceeds total lines in the file, `awk` does nothing and `patch_file` falsely reports `changed: true`. Also leaves `.bak` artifacts inside the project directory.
  - **Naive path validation (`utils.js:5`)**: Checks `filepath.includes('..')` (breaks valid filenames with `..`, doesn't resolve symlinks inside `/app`).
  - **Inconsistent `execute_command` timeout display (`execute.js:30`)**: Hardcodes `timeout_seconds: 10` regardless of `sandbox.defaultTimeout`.

### E. Docker Sandbox (`src/sandbox/Docker.js`)
- **What is already good:**
  - Uses `execFileAsync('docker', [...])` for container creation and exec (avoiding host shell injection in `Docker.js` itself except `cleanupAll`).
  - Sets `--memory=512m`, `--cpus=1.0`, `--pids-limit=100`, and `--security-opt=no-new-privileges=true`.
- **What is broken / dangerous:**
  - **Direct host mount (`-v ${realPath}:/app`)**: Mutates user's original project without copy/staging/approval.
  - **Excessive container privileges & network**: Runs as `root`, does not pass `--cap-drop=ALL`, leaves full network access open, does not cap `--memory-swap`.
  - **Hardcoded `node:20-alpine`**: Python projects cannot run (`python3: not found`).
  - **Process group timeout leak**: BusyBox `timeout` in Alpine only signals `sh`, not necessarily backgrounded child processes.
  - **`cleanupAll()` (`Docker.js:13-25`)**: Uses `execSync('docker rm -f ' + name)` and `process.exit(1)` on `SIGINT`, breaking graceful cleanup.

### F. Deterministic Verifier (`src/verifier/`)
- **What is already good:**
  - Strict separation from LLM reasoning; supports both `Process` and `Http` verification with structured statuses (`SUCCESS`, `NON_ZERO_EXIT`, `TIMEOUT`, `HTTP_UNHEALTHY`, `EXECUTION_ERROR`, `HTTP_CLIENT_UNAVAILABLE`, `INVALID_CONFIGURATION`).
- **What is broken / incomplete:**
  - **`Http.js` + `DEV-03` mismatch**: `Http.js` expects `config.startCommand`, while `src/demo/cases.js:40` passes `command: 'node index.js'`, so `DEV-03`'s server is never started by the HTTP verifier.
  - **Command injection in `Http.js:31-36,46`**: `url` is interpolated unquoted into shell commands.
  - **Single-check limitation**: Cannot run composite verifications (e.g., build + lint + typecheck + test + startup/HTTP).
  - **Hardcoded `/tmp/server_exit_code` & `/tmp/run.sh`** and brittle `pkill -P` cleanup in BusyBox.

### G. Telemetry (`src/telemetry/`)
- **What is already good:**
  - Captures complete structured run metrics and writes both machine-readable JSON and human-readable Markdown trajectories.
- **What is broken / incomplete:**
  - Weak secret redaction (`Logger.js:68-79` only matches `Bearer` and `sk-...`; `\\-` regex typo; misses GitHub/AWS/Gemini/Groq/NPM tokens, DB URLs, `.env` values, private keys, and active `process.env` secrets).
  - `Trajectory.js:43` splits on `'\\n'` instead of `'\n'`.
  - `Trajectory.js:62` checks `args.file` instead of `args.filepath`, so `read_file` and `patch_file` never use the file-formatted branch.

### H. Project Detection (`src/project/`)
- **What is already good:**
  - Strictly read-only, handles empty directories and malformed `package.json` safely, 10/10 unit tests passing.
- **What is missing:**
  - Only scans top-level directory (`fs.readdir` depth 1); misses monorepos (`workspaces`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`) and nested `src/` files.
  - Doesn't detect conflicting multiple lockfiles (`package-lock.json` + `yarn.lock`).
  - Doesn't detect Node version (`.nvmrc`, `.node-version`, `engines.node`) or Python version (`.python-version`, `requires-python`).
  - Hardcodes `npm test` / `npm run build` even when `yarn` or `pnpm` is detected.
  - Assumes all `pyproject.toml` files use `poetry` — misses `uv` (`uv.lock`), `pipenv` (`Pipfile`), PEP 621 `pip`, `venv`/`.venv`, `unittest`, `ruff`, `mypy`.

### I. Benchmarks (`src/demo/cases.js`, `src/benchmark/`)
- **Historical evidence preserved:** `artifacts/phase-3e` through `phase-4f` show the 5-case benchmark (3/5 = 60% in Phase 3J & 4F).
- **Bugs in current 10-case `DEMO_CASES` (`src/demo/cases.js`)**:
  - `DEV-01` runs `docker build -t dev-01 .` inside a container that has no Docker daemon (`artifacts/phase-3j/DEV-01.json:12,463` confirms `docker: not found` and buildkit `operation not permitted`).
  - `DEV-03` sets `command` instead of `startCommand` in `verifierConfig` (`type: 'http'`).
  - `DEV-06` runs `node index.js` which calls `app.listen(3000)` under a `process` verifier (`timeoutMs: 5000`), meaning a correctly fixed server will block and time out unless the agent removes `app.listen`!
  - `DEV-10` runs `npm start` (`node server.js` calling `app.listen(config.port)`) under a `process` verifier (`timeoutMs: 15000`), causing the same guaranteed timeout even after syntax/dependency/config fixes!
  - `Metrics.js` only estimates cost for `deepseek-chat` and `Runner.js` runs each case once without failure categorization.

---

## 3. Documentation & Website vs Reality Discrepancies

| Claim in `README.md` / `docs/` | Actual Code Reality |
|---|---|
| `README.md` & `docs/quickstart.md`: `devfix fix .` ("Coming Soon") | `devfix fix <project> --verify <command>` IS already implemented (`src/cli/index.js:158`). |
| `docs/cli-reference.md`: `devfix fix` options `--debug`, `--timeout <ms>` | Neither `--debug` nor `--timeout` exists; required `--verify <command>` is omitted in docs. |
| `docs/index.md:50`: `devfix inspect .` spins up Docker and fixes code | `devfix inspect` is strictly read-only (`ProjectDetector.inspect`). |
| `docs/reproduction.md`: `npm run start -- ...`, `cp .env.example .env`, `./tests/fixtures/broken-project`, `DEEPSEEK_API_KEY`, `Anthropic` | `package.json` has NO `start` script; `.env.example` and `tests/fixtures/` do NOT exist; code uses `LLM_API_KEY`; Anthropic is NOT supported. |
| `docs/faq.md:27`: Uses `python:3.9-slim` for Python projects | `DockerSandbox` hardcodes `node:20-alpine` (Python is NOT installed in the sandbox). |
| `docs/faq.md:7`: `--security-opt no-new-privileges` drops all root privileges | Container still runs as `root` (UID 0) with default Linux capabilities. |
| `docs/faq.md:36`: Ollama works with `LLM_PROVIDER=custom` + `LLM_BASE_URL` | `Provider.js:12` throws if `LLM_API_KEY` is omitted. |
| `docs/faq.md:39`: Default max iterations is `10` | `Controller.js:35` and `cli/index.js:76` default to `15`. |
| `docs/contributing.md:9`: `github.com/ghulam-mustafa/devfix` | Actual repo is `github.com/GhulamMustufa/devfix`. |

