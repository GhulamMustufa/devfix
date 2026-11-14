# CLI Reference

DevFix provides a clean, single-binary CLI interface for analyzing, repairing, inspecting, and rolling back local development environments.

---

## Command Overview

| Command | Summary |
|---|---|
| [`devfix fix <project>`](#devfix-fix-project) | Diagnose and repair a local project inside an isolated staging sandbox |
| [`devfix rollback [rollbackId]`](#devfix-rollback-rollbackid) | Restore project files from a previously applied DevFix snapshot |
| [`devfix history [project]`](#devfix-history-project) | View past repair runs and rollback snapshot status |
| [`devfix diff [project]`](#devfix-diff-project) | Inspect file changes made during a previous repair |
| [`devfix inspect [dir]`](#devfix-inspect-dir) | Scan and report project language, runtime, package manager, and conflicts |
| [`devfix doctor`](#devfix-doctor) | Verify system requirements (Docker, Git, Node, LLM API keys) |
| [`devfix demo <case>`](#devfix-demo-case) | Run a visual demonstration of a specific benchmark case |
| [`devfix benchmark`](#devfix-benchmark) | Run the 10-case evaluation benchmark |

---

## Command Specifications

### `devfix fix <project>`
Troubleshoot and fix a local project directory.

```bash
devfix fix ./my-app --verify "npm test"
```

#### Options:
- `--verify <command>` *(Required, Repeatable)*: Command to deterministically verify that the environment is fixed. Specify multiple times to run sequential verification steps (e.g. `--verify "npm run build" --verify "npm test"`).
- `--dry-run`: Runs full diagnosis, repairs, and verification inside staging, displaying the diff without modifying the host project.
- `-y, --yes`: Automatically approves applying verified staging changes back to the original project without an interactive prompt.
- `--allow-network`: Enables container network access during repair. (Default: disabled via `--network=none`).
- `--image <image>`: Overrides the automatically detected Docker base image (e.g. `--image python:3.12-slim` or `--image node:22-alpine`).
- `--diff`: Forces printing the complete staging diff.
- `--no-telemetry`: Disables telemetry logging for the run.
- `--json`: Outputs repair results, diff summary, and metrics as machine-readable JSON.

---

### `devfix rollback [rollbackId]`
Restore original project files from a previously applied repair snapshot.

```bash
devfix rollback devfix-rollback-3f9b1c2d
```

#### Options:
- `--list`: List all available rollback snapshots.
- `--project <dir>`: Filter the latest rollback by project directory.
- `--force`: Force restoration even if project files were modified after the repair was applied.
- `--json`: Output rollback status and restored file list as JSON.

---

### `devfix history [project]`
View previous repair runs, statuses, diff summaries, and rollback availability.

```bash
devfix history
devfix history ./my-app --limit 5
```

#### Options:
- `--limit <n>`: Maximum number of entries to display (default: `10`).
- `--project <dir>`: Filter history by project path.
- `--json`: Output history entries as a JSON array.

---

### `devfix diff [project]`
Inspect file changes made in previous DevFix repairs.

```bash
devfix diff
devfix diff --rollback devfix-rollback-3f9b1c2d
```

#### Options:
- `--rollback <id>`: Specific rollback ID to inspect (defaults to latest repair).
- `--json`: Output file diff metadata as JSON.

---

### `devfix inspect [dir]`
Scan and report project language, runtime, package manager, and conflicts in read-only mode.

```bash
devfix inspect .
devfix inspect ./backend --json
```

#### Options:
- `--json`: Output inspection context as JSON.

---

### `devfix doctor`
Check system requirements, Docker daemon connectivity, Git installation, and LLM configuration.

```bash
devfix doctor
devfix doctor --json
```

#### Options:
- `--json`: Output health check results as JSON (exits with code `0` on success, `3` on error).

---

### `devfix demo <case>`
Run a visual demonstration of a specific benchmark case (e.g. `DEV-01` to `DEV-10`).

```bash
devfix demo DEV-04
```

#### Options:
- `--allow-network`: Allow network access during demo case.

---

### `devfix benchmark`
Run the complete 10-case evaluation benchmark.

```bash
devfix benchmark
devfix benchmark --case DEV-02
```

#### Options:
- `--case <id>`: Run a specific benchmark case.
- `--allow-network`: Allow container network access during benchmark runs.
