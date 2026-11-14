# DevFix — Production Improvement Roadmap

This roadmap organizes all improvements into controlled phases so existing working functionality and historical benchmark artifacts remain intact.

---

## Priority Order & Phases

### Phase 1 — Critical Security & Workspace Isolation (Highest Priority)
**Goal:** Make DevFix safe to run on real developer repositories without risking host data loss, command injection, or secret leaks.

1. **Temporary Workspace Isolation + Diff & Rollback:**
   - Replace direct `-v ${realPath}:/app` mounting in `devfix fix` with:
     `Original Project -> Temp Staging Copy -> Docker Sandbox -> Verify -> Diff Preview -> User Approval -> Atomic Apply + Rollback Backup`.
   - Exclude sensitive files (`.env*`, `.git`, private keys, `.npmrc`, etc.) from staging by default (configurable/explicit opt-in if needed for config recovery, with clear warnings).
   - Reject symlinks escaping the workspace root during copy-in and apply-back.
2. **Eliminate Shell Command Injection:**
   - Rewrite `src/tools/read.js`, `src/tools/patch.js`, `src/verifier/Http.js`, and `src/sandbox/Docker.js` (`cleanupAll`) to pass file paths, replacement strings, URLs, and container names safely without unquoted shell interpolation.
   - Fix `patch_file` to validate integer line bounds against actual file line count and avoid leaving `.bak` files inside the project.
   - Add canonical symlink checks inside `/app` in `src/tools/utils.js` / tool execution.
3. **Harden Docker Container Defaults:**
   - Add `--cap-drop=ALL`, `--memory-swap` equal to `--memory`, configurable network mode (`--network=none` supported, controlled network policy), and process-group kill on timeout.
4. **Telemetry & Error Secret Redaction:**
   - Expand `src/telemetry/Logger.js` to scrub GitHub, AWS, Gemini, Groq, Anthropic, NPM, Slack tokens, DB URLs with passwords, private keys, `.env` values, and active `process.env` secrets.
   - Fix `Trajectory.js` rendering bugs (`\\n` split and `args.filepath`).
5. **Prompt Injection Hardening:**
   - Update `src/agent/Prompts.js` to treat repository files, comments, and logs strictly as untrusted data.

**Risk & Mitigation:** Adding `--network=none` by default would break `npm install` / `pip install` fixes. Mitigation: make network policy explicit (`--network bridge|none`, defaulting to controlled/configurable mode and documenting trade-offs clearly) while `--cap-drop=ALL` and temp workspace isolation are always enforced.

---

### Phase 2 — Agent Reliability & Deterministic Verification
**Goal:** Fix bugs that cause unnecessary agent crashes, false loop terminations, or inaccurate verifications.

1. **Fix Context Truncation (`src/agent/Controller.js`):**
   - Never orphan `tool` messages from their parent `assistant` `tool_calls` message when trimming history; account for `tool_calls` character length.
2. **Fix State-Change & Duplicate Detection (`src/agent/Controller.js`):**
   - Broaden `isStateChange` beyond the small regex (cover redirections `>`, `tee`, `pip`, `poetry`, `uv`, `pnpm`, `npm ci`, `rm`, `touch`, `mkdir`, `git`) or inspect workspace file hashes/mtime.
   - Fix signal-handler race between `Docker.js`, `Controller.js`, and `cli/index.js` so `SIGINT` gracefully stops the loop, saves `USER_ABORTED` telemetry, and removes containers cleanly.
3. **Harden LLM Provider & Local Model Support (`src/llm/Provider.js`):**
   - Allow optional `LLM_API_KEY` for `custom` (e.g., Ollama at `http://localhost:11434/v1`).
   - Add explicit request timeout, disable duplicate SDK retries (`maxRetries: 0` on OpenAI client when `Provider.js` handles retries), guard empty `choices`, and normalize object-typed tool arguments from local models.
4. **Upgrade Deterministic Verifier (`src/verifier/`):**
   - Fix `Http.js` (`command` vs `startCommand` fallback + process group cleanup + unique temp files).
   - Add composite / multi-check verification support (build, test, lint, typecheck, startup, HTTP health checks, custom commands).

---

### Phase 3 — Language & Environment Support
**Goal:** Make Node.js and Python support genuinely work inside the sandbox.

1. **Upgrade `ProjectDetector` (`src/project/`):**
   - Detect Node versions (`.nvmrc`, `.node-version`, `engines.node`), conflicting multiple lockfiles, `yarn`/`pnpm` test/build/lint/typecheck scripts, and monorepo/workspace indicators (`workspaces`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`).
   - Upgrade Python detection: `uv` (`uv.lock`), `poetry.lock`, `Pipfile`, PEP 621 `pyproject.toml`, `.python-version`, `venv`/`.venv`, `unittest`, `ruff`, `mypy`.
2. **Runtime-Appropriate Sandbox Images:**
   - Map detected runtime/version to real Docker images (e.g., `node:20-alpine` / `node:22-alpine` for Node, `python:3.11-slim` or `python:3.12-slim` for Python) instead of hardcoding `node:20-alpine`.
   - Wire `ProjectDetector.inspect()` directly into `devfix fix` so the agent and sandbox get accurate runtime context.

---

### Phase 4 — CLI & Developer Experience
**Goal:** Clean, predictable, automation-friendly CLI.

1. **Fix `devfix doctor`:** Align default provider/model check with `LLMProvider` (`deepseek` / `deepseek-chat`), verify Docker image availability, and check local endpoint reachability for `custom`.
2. **Enhance `devfix fix`:** Add `--dry-run`, `--yes` / interactive approval prompt, `--diff`, `--json`, `--timeout`, `--max-iterations`, `--network`, and clean progress output.
3. **Add New Commands (only when genuinely implemented & tested):**
   - `devfix diff`: Show staged/last repair diff.
   - `devfix rollback`: Restore pre-repair snapshot of a project.
   - `devfix history`: List and inspect past telemetry runs.
4. **Global Install Path Fix:** Store telemetry/snapshots in a proper user state/cache directory (e.g., `~/.devfix/` or XDG state dir, overridable via `--out` / `DEVFIX_HOME`) instead of polluting `process.cwd()/artifacts/`.

---

### Phase 5 — Testing, Benchmarking & CI/CD
**Goal:** Comprehensive offline + Docker test coverage, realistic reliable benchmarks, and automated CI.

1. **Testing:**
   - Add unit/security tests (mocked + real Docker where available) covering: path traversal, symlink escape, shell injection in `read_file`/`patch_file`/`Http.js`, secret redaction (all token types), context truncation with tool calls, local/Ollama provider error handling, timeout & cancellation cleanup, temporary workspace staging & rollback, and `ProjectDetector` monorepo/lockfile/Python cases.
   - Fix `tests/foundation.test.js` and `tests/verifier.test.js` cleanup (`try/finally`) and graceful handling/clear reporting when Docker daemon is unavailable vs CI Docker runs.
2. **Benchmarks:**
   - Preserve all historical `artifacts/phase-3*` and `artifacts/phase-4f` files untouched.
   - Audit and fix broken verifier configs in `DEMO_CASES` (`DEV-01`, `DEV-03`, `DEV-06`, `DEV-10`) and add/improve realistic Node/Python/TS/env/path cases without overfitting.
   - Support repeated runs (`--runs N`), failure-category classification, multi-provider cost estimation, and clean reporting.
3. **CI/CD & Packaging:**
   - Add `.github/workflows/ci.yml` testing supported Node versions (20, 22), `npm ci`, unit tests, linting, `npm pack` tarball validation, and `docs:build`.
   - Remove unused `@google/generative-ai` from runtime `dependencies` (or move/clean unused scratch files carefully) and clean `devfix-1.0.0.tgz` from repo root if appropriate.

---

### Phase 6 — Documentation, Website & Release Readiness
**Goal:** 100% alignment between actual CLI behavior, `README.md`, `docs/` VitePress site, and standard open-source docs.

1. Add/update standard repo docs (`AGENTS.md`, `ARCHITECTURE.md`, `CODING_STANDARDS.md`, `SECURITY.md`, `TESTING.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/PROJECT_EXPLANATION.md`, `docs/ENGINEERING_DECISIONS.md`, `.env.example`) avoiding duplication with `docs/`.
2. Fix all broken links and false claims in `README.md` and `docs/` (`quickstart.md`, `cli-reference.md`, `reproduction.md`, `faq.md`, `index.md`, `benchmarks.md`, `contributing.md`).
3. Verify `npm pack` contents, global install simulation, `npm run docs:build`, and full test suite before any release recommendation.

