# DevFix System Architecture

DevFix is an autonomous, deterministic local development troubleshooting system. It detects, diagnoses, and repairs broken environments by combining autonomous LLM reasoning with deterministic verification and strict container isolation.

---

## 1. High-Level Architecture

The architecture enforces strict boundaries between:
1. **Developer Workspace:** Protected host filesystem.
2. **Staging & Isolation Boundary:** Ephemeral workspace where repairs are staged and diffs are computed.
3. **Execution Sandbox:** Hardened Docker container where commands run non-root with dropped capabilities and no network.
4. **Agent Reasoning & Tools:** LLM controller operating through structured, injection-proof tools.
5. **Deterministic Verifier:** Objective validation layer where exit codes and HTTP probes determine success.

```mermaid
graph TD
    User([Developer]) -->|devfix fix ./project --verify 'npm test'| CLI[DevFix CLI]
    
    subgraph Pre-Execution
        CLI --> Detector[ProjectDetector<br/>Node, Python, Monorepos, Conflicts]
        Detector --> ImageSelect[Dynamic Docker Image Selection<br/>node:18/20/22, python:3.10/3.11/3.12]
        CLI --> Staging[StagingWorkspace<br/>Sensitive files excluded, symlinks checked]
    end

    subgraph Sandboxed Agent Loop
        Staging --> Sandbox[Hardened DockerSandbox<br/>non-root, --cap-drop=ALL, --network=none]
        Controller[Agent Controller] <-->|Atomic Turn Pruning| LLM[LLM Provider<br/>Gemini / DeepSeek / Ollama / OpenAI]
        Controller -->|read_file / patch_file / execute| Tools[Tool Registry]
        Tools <--> Sandbox
        Sandbox --> Verifier[Deterministic Verifier<br/>Process & Multi-Check & HTTP]
        Verifier -->|Redacted Outcome| Controller
    end

    subgraph Post-Execution & Safety
        Controller --> Telemetry[TelemetryLogger<br/>Redacted Trajectories & Opt-Out]
        Staging --> DiffCalc[Staging Diff Computation]
        DiffCalc --> PromptApproval{User Approval [y/N]}
        PromptApproval -->|Approved| Snapshot[Pre-Commit Rollback Snapshot]
        Snapshot --> WriteBack[Atomic Write-Back to Project]
        PromptApproval -->|Rejected / Dry-Run| Untouched[Original Project Untouched]
    end
```

---

## 2. Core Modules & Responsibilities

### CLI Layer (`src/cli/index.js`)
- Single command-line entrypoint built with Commander.js.
- Coordinates commands: `fix`, `rollback`, `history`, `diff`, `inspect`, `doctor`, `demo`, `benchmark`.
- Manages user prompts, `--dry-run`, `--yes`, `--json` machine-readable output, and graceful SIGINT cleanup.

### Environment Intelligence (`src/project/`)
- **`Detector.js`:** Deeply inspects repository metadata:
  - **Node.js:** Identifies npm, pnpm, yarn, bun, Corepack (`packageManager` field), `.nvmrc`, `.node-version`, `engines.node`, and monorepos (`pnpm-workspace.yaml`, `lerna.json`, `workspaces` arrays).
  - **Python:** Identifies pip, uv, Poetry, Pipenv, Conda, `.python-version`, `runtime.txt`, `pyproject.toml` (`requires-python`), and virtual environments (`.venv`, `venv`).
  - **Precedence & Conflicts:** Detects conflicting lockfiles and mismatches between declarations and lockfiles.
  - **Dynamic Docker Selection:** Resolves runtime versions to official pinned container images (`node:20-alpine`, `python:3.11-slim`, etc.).
- **`Formatter.js`:** Renders rich terminal summaries of project metadata, runtime versions, package managers, and conflict warnings.

### Staging & Rollback Engine (`src/workspace/Staging.js`)
- Duplicates project files into a disposable staging workspace inside `os.tmpdir()`.
- Excludes sensitive files (`.git`, `.env*`, private keys, cloud tokens) while preserving `.env.example`.
- Enforces strict symlink boundary checks.
- Computes unified diffs (`computeDiff`).
- Writes pre-commit rollback snapshots (`~/.devfix/rollbacks/<id>`) and records post-repair file hashes to detect subsequent user modifications.
- Implements atomic write-back with automatic rollback on partial failures.
- Provides `rollback()`, `getHistory()`, and `getRollbackDiff()`.

### Sandboxed Execution (`src/sandbox/Docker.js`)
- Runs containers with `--user 1000:1000`, `--cap-drop=ALL`, `--security-opt=no-new-privileges=true`.
- Disables network by default (`--network=none`).
- Enforces CPU, memory (512MB), swap (512MB), process (100 pids), and timeout limits.
- Blocks Docker socket, `/`, and `$HOME` mounts.
- Executes commands safely using `executeArgs` with positional parameters.

### Agent Controller & Reasoning (`src/agent/`)
- **`Controller.js`:** Drives the autonomous repair loop with configurable iteration caps.
- **`context.js` (`pruneMessages`):** Implements turn-based atomic context truncation. Prunes old turns as complete conversation units, ensuring assistant `tool_calls` are never orphaned from their tool results.
- **`stateChange.js` (`isStateChangingCommand`):** Multi-ecosystem mutation heuristic detecting file and package manager modifications across Node.js (`npm`, `pnpm`, `yarn`, `bun`), Python (`pip`, `poetry`, `uv`, `conda`, `pipenv`), and shell operations.
- **`Prompts.js`:** Enforces strict untrusted data and security guardrails in the system prompt.

### Deterministic Verifier Layer (`src/verifier/`)
- **`Process.js`:** Executes process verification commands and evaluates return codes.
- **`Http.js`:** Executes background server startup commands and probes HTTP endpoints.
- **`index.js` (`verifyMulti`):** Orchestrates multi-check verification pipelines (`--verify "npm run build" --verify "npm test"`), halting on first failure.
- Verifier outputs are sanitized with `Redactor.js` before reaching the LLM or telemetry.

### Telemetry & Redaction (`src/telemetry/` & `src/security/`)
- **`Redactor.js`:** Universal credential scrubbing (API keys, bearer tokens, passwords, private keys, `.env` assignments).
- **`Logger.js`:** Records run telemetry and markdown trajectories to disk. Honors `DEVFIX_TELEMETRY=0`, `DO_NOT_TRACK=1`, and `--no-telemetry`. Fails gracefully without breaking repairs.
- **`Trajectory.js`:** Generates clean, human-readable markdown summaries of investigation steps.
