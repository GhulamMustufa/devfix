# DevFix — Plain-English Project Explanation

## 1. What DevFix Actually Does

**DevFix** is a command-line developer tool written in Node.js (ES modules). Its job is to take a broken software project (for example: missing dependency, missing `.env` variable, bad TypeScript type, wrong import name, port conflict, or CRLF line-ending bug) and **fix it autonomously inside a Docker container** until a real verification command (like `npm test` or an HTTP health check) actually passes.

Unlike regular AI chat tools that only *suggest* a fix in text and leave you to copy-paste and test it, DevFix follows one core rule:

> **The AI is never allowed to declare success on its own.** Only an external, deterministic verifier (running your actual command or checking your HTTP server) can declare that the repair succeeded.

---

## 2. How the Entire System Works (End-to-End Flow)

```text
Developer runs: devfix fix ./my-app --verify "npm test"
       │
       ▼
[1. CLI Layer] (bin/devfix -> src/cli/index.js)
   Parses arguments, checks folder exists, starts a Docker container
       │
       ▼
[2. Agent Controller] (src/agent/Controller.js + Prompts.js)
   Runs a loop (up to 15 turns): asks the LLM what to do next
       │
       ├──► [3. LLM Provider] (src/llm/Provider.js)
       │       Sends conversation + tool schemas to DeepSeek / OpenAI / Groq / OpenRouter / Custom
       │       Receives text + tool_calls (read_file, execute_command, patch_file)
       │
       ├──► [4. Tool Registry] (src/tools/registry.js, read.js, patch.js, execute.js)
       │       Validates arguments and runs the requested tool
       │
       ├──► [5. Docker Sandbox] (src/sandbox/Docker.js)
       │       Executes shell commands & file edits inside the container (/app)
       │
       └──► [6. Deterministic Verifier] (src/verifier/index.js, Process.js, Http.js)
               Triggered after state-changing edits (or when the LLM stops calling tools)
               Runs the real check (exit code == 0 or HTTP status == 200)
               ├── PASS ──► Stops loop with SUCCESS
               └── FAIL ──► Feeds real error output back to the LLM for the next turn
       │
       ▼
[7. Telemetry & Reporting] (src/telemetry/Logger.js, Trajectory.js)
   Scrubs secrets and saves JSON + Markdown trajectory files in artifacts/runs/
```

---

## 3. Folder and File Map

| Path | Role in Plain English |
|---|---|
| `bin/devfix` | Executable entry script (`#!/usr/bin/env node`) registered as the `devfix` CLI binary in `package.json`. |
| `src/cli/index.js` | Defines all CLI commands (`fix`, `inspect`, `demo`, `benchmark`, `doctor`), parses flags with `commander`, shows spinners with `ora`, and prints colored results with `chalk`. |
| `src/agent/Controller.js` | The brain's traffic cop (ReAct loop). Manages conversation messages, calls the LLM, executes tools, prevents duplicate loops, triggers verification, and collects telemetry. |
| `src/agent/Prompts.js` | Stores `SYSTEM_INSTRUCTION`, the core rules given to the LLM (inspect first, make small changes, never declare success yourself). |
| `src/llm/Provider.js` | Connects to DeepSeek (default), OpenAI, Groq, OpenRouter, or custom OpenAI-compatible URLs using the `openai` SDK, with retry/backoff and error key scrubbing. |
| `src/tools/registry.js` | Defines the 3 JSON tool schemas (`read_file`, `execute_command`, `patch_file`) and routes tool calls from the LLM to the tool handlers. |
| `src/tools/read.js` | Reads up to 1 MB of a file inside `/app` in the container. |
| `src/tools/patch.js` | Replaces a range of lines (`start_line` to `end_line`) in a file inside `/app` using `awk`, while trying to preserve file permissions. |
| `src/tools/execute.js` | Runs shell commands inside the Docker container after a small regex safety check. |
| `src/tools/utils.js` | Path helper (`resolveSandboxPath`) that blocks `..` and forces paths inside `/app`. |
| `src/sandbox/Docker.js` | Creates, runs commands in, and destroys Docker containers (`node:20-alpine` by default) with memory/CPU/PID limits. |
| `src/verifier/index.js` | Dispatcher that picks either the Process verifier or the HTTP verifier. |
| `src/verifier/Process.js` | Runs a command inside the container and checks whether `exit_code === expectedExitCode` within a timeout. |
| `src/verifier/Http.js` | Optionally starts a server in the background, polls a URL inside the container (`curl`/`wget`/`node`), checks HTTP status, and kills the server afterward. |
| `src/project/Detector.js` | Read-only scanner that inspects a folder's config files (`package.json`, lockfiles, `tsconfig.json`, `requirements.txt`, `pyproject.toml`, etc.) to guess language, runtime, package manager, and commands. |
| `src/project/Formatter.js` | Formats `ProjectDetector` output nicely for the terminal. |
| `src/project/Types.js` | Constants (`LANGUAGES`, `RUNTIMES`, `PACKAGE_MANAGERS`, `CONFIDENCE`) and empty project context factory. |
| `src/telemetry/Logger.js` | Scrubs sensitive keys/tokens and writes run records as `.json` and `.md` to `artifacts/runs/`. |
| `src/telemetry/Trajectory.js` | Converts a run's conversation history into a readable Markdown report. |
| `src/demo/cases.js` | Defines the 10 built-in broken environment scenarios (`DEV-01` through `DEV-10`). |
| `src/benchmark/Runner.js` | Runs `DEMO_CASES` (all 10 or `--case DEV-XX`) inside containers and collects results. |
| `src/benchmark/Metrics.js` | Computes success rate, average iterations, average time, tool reliability, total/average tokens, and DeepSeek cost estimate. |
| `src/benchmark/Reporter.js` | Prints the benchmark summary table and saves JSON/Markdown reports in `artifacts/benchmark/`. |
| `tests/*.test.js` | Automated test suite using Node's built-in `node:test` runner (6 test files). |
| `docs/` | VitePress documentation website (`https://devfix.ghulam-mustafa.com/`) plus `docs/internals/hackathon-archive/` historical notes. |
| `artifacts/` | Historical hackathon benchmark outputs (`phase-3e` through `phase-4f`, `example-run.json`) and local run output directories. |
| `scripts/`, `smoke.js`, `test-api.js`, `run_benchmarks.sh` | Helper/legacy test and benchmark scripts from hackathon phases. |

---

## 4. Technologies and Libraries Used

| Dependency | Version | Purpose | Notes |
|---|---|---|---|
| Node.js | `>=20` (tested on `v20.19.4`) | Runtime + built-in `node:test` runner | Uses native ES Modules (`"type": "module"`). |
| `openai` | `^6.49.0` | Official OpenAI Node SDK | Used for OpenAI, DeepSeek, Groq, OpenRouter, and custom OpenAI-compatible APIs. |
| `commander` | `^14.0.3` | CLI argument & subcommand parser | Powers `devfix <command> [options]`. |
| `dotenv` | `^17.4.2` | Loads `.env` into `process.env` | Imported at startup (`import 'dotenv/config'`) in `src/cli/index.js`. |
| `chalk` | `^5.6.2` | Terminal colors | Makes CLI output readable. |
| `ora` | `^9.4.1` | Terminal spinners | Shows live progress when running in a TTY; falls back to plain logs in CI. |
| `@google/generative-ai` | `^0.24.1` | Gemini SDK | **Currently unused in `src/`** — only imported by `scripts/gemini-connectivity-test.mjs`. |
| `vitepress` (dev) | `^1.6.4` | Static site generator | Builds the documentation website in `docs/`. |
| `husky` (dev) | `^9.1.7` | Git hooks | Runs `npm run test` and `npm run docs:build` before commits (`.husky/pre-commit`). |
| Docker | External CLI & Daemon | Container isolation | Required for `fix`, `demo`, `benchmark`, and integration tests. |

---

## 5. Major Components Explained in Detail

### A. CLI (`bin/devfix`, `src/cli/index.js`)
- **What is it?** The front door of DevFix that you type into your terminal.
- **Why do we need it?** Developers need simple commands (`inspect`, `fix`, `doctor`, `demo`, `benchmark`) with clear progress and exit codes instead of editing JavaScript scripts.
- **How does it work?**
  1. `bin/devfix` loads `src/cli/index.js`.
  2. `dotenv/config` reads `.env` from the current directory.
  3. `commander` matches commands: `fix <project> --verify <command>`, `inspect [dir]`, `demo <case>`, `benchmark [--case <id>]`, `doctor`.
  4. For `fix`, it checks the directory exists, mounts it directly into `DockerSandbox`, starts `AgentController`, saves telemetry, and exits `0` (success) or non-zero (failure).
- **Where is it in our code?** `bin/devfix`, `src/cli/index.js`, `package.json`.
- **What happens if it fails?** Users get confusing errors, wrong defaults (`doctor` says `openai` while `Provider` uses `deepseek`), or telemetry written into random folders.
- **What can we improve?** Use a safe temporary copy instead of mounting the real project directly, pass `ProjectDetector` context into `fix`, align `doctor` defaults, and add `--dry-run`, `--json`, `diff`, `rollback`, and `history`.

### B. Agent Controller (`src/agent/Controller.js`, `src/agent/Prompts.js`)
- **What is it?** The loop that lets the AI investigate, make changes, and keep trying until the verifier passes (or a safety limit is hit).
- **Why do we need it?** A single AI reply cannot see real command errors. The controller creates a feedback loop: *Observe -> Act -> Verify -> Repeat*.
- **How does it work?**
  1. Starts a sandbox and builds the initial `messages` array (`SYSTEM_INSTRUCTION` + context + initial failure).
  2. Loops up to `maxIterations` (default 15):
     - Trims old messages if total text exceeds 32,000 characters.
     - Calls `provider.chat(messages, schemas)`.
     - Parses any `toolCalls`, checks for repeated identical calls, runs them via `ToolRegistry`, and truncates long outputs to 6,000 characters.
     - If a state change is detected (`patch_file` or matching shell command heuristic) or the model returned no tool calls, runs `verify(sandbox, verifierConfig)`.
     - If verified -> returns `SUCCESS`. Otherwise feeds the verifier failure back as a `user` message and clears `actionHistory`.
- **Where is it in our code?** `src/agent/Controller.js`, `src/agent/Prompts.js`.
- **What happens if it fails?** Broken context trimming (`messages.splice(2, 1)`) can orphan `tool` messages and trigger HTTP 400 errors; incomplete state-change detection misses commands like `echo > .env` or `pip install`, causing false `REPEATED_ACTION` stops.
- **What can we improve?** Trim assistant+tool message pairs atomically, broaden state-change detection (or detect workspace file changes directly), harden `Prompts.js` against prompt injection from project files, and make SIGINT/SIGTERM cleanup cooperative.

### C. LLM Provider (`src/llm/Provider.js`)
- **What is it?** The translator between DevFix and external or local AI model APIs.
- **Why do we need it?** Developers use different AI providers (DeepSeek, OpenAI, Groq, OpenRouter, or local Ollama) and networks occasionally fail temporarily.
- **How does it work?**
  1. Reads `LLM_PROVIDER` (default `'deepseek'`), `LLM_MODEL` (default `'deepseek-chat'`), and `LLM_API_KEY`.
  2. Creates an `OpenAI` SDK client pointing to the right `baseURL`.
  3. Calls `chat.completions.create` with `tools` and `tool_choice: 'auto'`, `temperature: 0.1`.
  4. Retries transient errors up to 6 times with exponential backoff (failing fast on 400/401/403/404) and scrubs `this.apiKey` from thrown error messages.
- **Where is it in our code?** `src/llm/Provider.js`.
- **What happens if it fails?** API errors crash runs or leak credentials; Ollama users without an API key are blocked immediately because `LLM_API_KEY` is strictly required even for `custom`.
- **What can we improve?** Allow optional API keys for `custom`/local endpoints (like Ollama), add explicit request timeouts, safely handle empty `choices` or object-typed tool arguments from local models, and remove double retries with the OpenAI SDK.

### D. Tool Registry (`src/tools/`)
- **What is it?** The set of 3 controlled actions the AI is allowed to take: `read_file`, `execute_command`, and `patch_file`.
- **Why do we need it?** The AI needs structured ways to inspect files, edit lines, and run commands inside the container.
- **How does it work?**
  1. `registry.js` gives the LLM the JSON schemas for the 3 tools.
  2. `read.js` checks the path with `resolveSandboxPath` and runs `head -c 1000000 <path>` in the container.
  3. `patch.js` creates a `.bak` backup, reads file permissions (`stat -c %a`), runs `awk` to replace `start_line..end_line`, and restores permissions.
  4. `execute.js` checks a small regex blocklist and runs `sandbox.execute(cmd)`.
- **Where is it in our code?** `src/tools/registry.js`, `src/tools/read.js`, `src/tools/patch.js`, `src/tools/execute.js`, `src/tools/utils.js`.
- **What happens if it fails?** **Critical security bug:** `read.js` and `patch.js` put `resolvedPath` and `args.replacement` directly into `sh -c` strings without safe escaping, allowing shell command injection! Also `patch.js` leaves `.bak` files in the project and can silently succeed when `start_line` is beyond EOF.
- **What can we improve?** Eliminate shell interpolation in `read_file` and `patch_file` (use `docker exec` with separate arguments or base64/stdin, or Node/POSIX safe argument passing), resolve symlinks (`realpath`) inside `/app`, validate line bounds, and stop leaving `.bak` files behind.

### E. Docker Sandbox (`src/sandbox/Docker.js`)
- **What is it?** A disposable Linux container (`node:20-alpine` by default) that isolates commands from your laptop.
- **Why do we need it?** Running AI-generated shell commands directly on your host machine could delete files or corrupt your system.
- **How does it work?**
  1. `start()` optionally mounts `hostMountPath` to `/app` with `-v`, sets `--memory=512m`, `--cpus=1.0`, `--pids-limit=100`, `--security-opt=no-new-privileges=true`, and runs `sleep 360000`.
  2. `execute(cmd, timeoutMs)` runs `docker exec <name> timeout <sec> sh -c <cmd>`.
  3. `stop()` runs `docker rm -f <name>`.
- **Where is it in our code?** `src/sandbox/Docker.js`.
- **What happens if it fails?** Currently `fix` mounts the user's **real directory read-write**, runs as **root** inside the container, keeps **default Linux capabilities**, leaves **unrestricted network access** open, and hardcodes `node:20-alpine` (so Python projects fail). Also `cleanupAll()` calls `process.exit(1)` on SIGINT, aborting telemetry.
- **What can we improve?** Copy the project to a temporary workspace (excluding `.git` secrets / `.env` unless explicitly allowed, or staging cleanly), run with `--cap-drop=ALL`, configurable `--network=none`, non-root user where compatible, process-group timeout kills, and select Python/Node images based on project detection.

### F. Deterministic Verifier (`src/verifier/`)
- **What is it?** The independent judge that checks if the repair actually works.
- **Why do we need it?** LLMs often guess or claim "It's fixed!" when builds still fail.
- **How does it work?**
  1. `Process.js` executes a command inside the container and compares `exit_code === expectedExitCode`.
  2. `Http.js` optionally starts a background server (`startCommand`), detects `curl`/`wget`/`node`, polls the `url` until `expectedStatus` (e.g., `200`) or timeout, then kills the background PID.
- **Where is it in our code?** `src/verifier/index.js`, `src/verifier/Process.js`, `src/verifier/Http.js`.
- **What happens if it fails?** `Http.js` injects `url` into shell strings, and `DEV-03` sets `command` instead of `startCommand`, so `Http.js` never starts the server in `DEV-03`. Also only a single check is supported right now (not build + test + lint + typecheck).
- **What can we improve?** Support multi-step verification pipelines, fix `url` shell injection, support `command` fallback or fix `DEV-03` config, and clean up server process groups reliably.

### G. Telemetry (`src/telemetry/`)
- **What is it?** The recorder that saves what happened in every run for debugging and auditing.
- **Why do we need it?** Developers need to see why an agent succeeded or failed without leaking secrets.
- **How does it work?** `Logger.js` scrubs known keys/patterns, then writes JSON and calls `Trajectory.js` to write Markdown to `artifacts/runs/`.
- **Where is it in our code?** `src/telemetry/Logger.js`, `src/telemetry/Trajectory.js`.
- **What happens if it fails?** Current redaction misses GitHub tokens, Gemini/Groq/AWS keys, DB URLs with passwords, private keys, `.env` lines, and `process.env.LLM_API_KEY` if it doesn't start with `sk-`. Markdown formatting also has typos (`\\n` literal split, `args.file` instead of `args.filepath`).
- **What can we improve?** Expand secret redaction patterns + dynamic env-secret scrubbing, fix `Trajectory.js` rendering bugs, and store global CLI runs in an app data directory (or configurable `--out`) rather than polluting random CWDs.

### H. Project Detection (`src/project/`)
- **What is it?** A read-only inspector (`devfix inspect`) that guesses the project's language, runtime, package manager, and scripts.
- **Why do we need it?** So DevFix knows whether a project uses Node/TypeScript/Python, npm/yarn/pnpm/pip/poetry/uv, and what container image and commands to use.
- **How does it work?** Reads top-level filenames (`package.json`, lockfiles, `tsconfig.json`, `requirements.txt`, `pyproject.toml`, `.py`/`.js`/`.ts` files) without executing code.
- **Where is it in our code?** `src/project/Detector.js`, `src/project/Formatter.js`, `src/project/Types.js`.
- **What happens if it fails?** Misses `uv`, `Pipfile`, Node version files (`.nvmrc`, `engines.node`), monorepos, multiple conflicting lockfiles, and `yarn test`/`pnpm test` commands — and `devfix fix` ignores `ProjectDetector` completely!
- **What can we improve?** Wire `ProjectDetector` into `devfix fix`, detect Node/Python versions and conflicting lockfiles, support `uv`/monorepos, and map detected runtimes to real working Docker images.

---

## 6. Key Technical Concepts Explained Simply (5-Part Breakdown)

### Concept 1: ReAct Agent Loop
1. **What it means:** "Reason + Act" — the AI thinks, picks a tool, sees the real output, and repeats.
2. **Why we use it:** Debugging requires reading errors and testing hypotheses one step at a time.
3. **Where in code:** `src/agent/Controller.js` (`while (telemetry.iterations < this.maxIterations)`).
4. **How it works:** Sends `messages` to `LLMProvider.chat()`, executes returned `toolCalls` via `ToolRegistry`, appends tool outputs, and loops until verified or capped.
5. **Needs improvement?** Yes — message truncation, state-change detection, and prompt-injection hardening need fixes.

### Concept 2: Deterministic Verification
1. **What it means:** Checking success with real computer facts (exit code `0`, HTTP `200`) rather than asking the AI "did it work?".
2. **Why we use it:** Prevents AI hallucinations and false "Fixed!" claims.
3. **Where in code:** `src/verifier/index.js`, `Process.js`, `Http.js`, called at `src/agent/Controller.js:231`.
4. **How it works:** Runs `verify(sandbox, verifierConfig)` inside the sandbox whenever state changes or the AI stops calling tools.
5. **Needs improvement?** Yes — fix `Http.js` command injection & `startCommand` mismatch, and add multi-check pipelines (build, test, lint, typecheck).

### Concept 3: Docker Container Sandboxing
1. **What it means:** Running untrusted commands inside a lightweight isolated Linux environment instead of directly on your Mac/Linux host.
2. **Why we use it:** Stops bad commands (`rm -rf`, broken global installs) from damaging your computer.
3. **Where in code:** `src/sandbox/Docker.js`.
4. **How it works:** Uses `docker run -d` with memory/CPU/PID limits and `docker exec` for each command, then `docker rm -f` at the end.
5. **Needs improvement?** **Yes — urgently.** Currently mounts the real project read-write, runs as root without `--cap-drop=ALL`, leaves network open, and hardcodes `node:20-alpine`.

### Concept 4: Tool Calling (Function Calling)
1. **What it means:** Giving the LLM a strict JSON menu of functions (`read_file`, `patch_file`, `execute_command`) so it outputs structured JSON arguments instead of free-form text.
2. **Why we use it:** Makes parsing AI actions reliable and testable.
3. **Where in code:** `src/tools/registry.js` (`toolSchemas`) and `src/llm/Provider.js`.
4. **How it works:** Sends `tools` array to OpenAI-compatible API; parses `tc.function.name` and `tc.function.arguments`.
5. **Needs improvement?** Yes — argument validation, shell escaping inside `read.js`/`patch.js`, and compatibility with local models (Ollama) need work.

### Concept 5: Secret Redaction (Telemetry Scrubbing)
1. **What it means:** Automatically replacing passwords, API keys, and tokens with `[REDACTED]` before saving logs.
2. **Why we use it:** Logs often contain environment variables, HTTP headers, or error messages that must never be saved to disk or shared in bug reports.
3. **Where in code:** `src/telemetry/Logger.js` (`scrub`, `_isSensitiveKey`, `_scrubString`) and `src/llm/Provider.js` (`_scrubError`).
4. **How it works:** Recursively walks objects and regex-replaces sensitive strings before writing JSON/Markdown.
5. **Needs improvement?** Yes — current patterns only catch `Bearer` and `sk-...`, missing most real-world secrets.

