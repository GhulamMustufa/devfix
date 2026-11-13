# DevFix Phase 1 Security Test Report

**Branch:** `improve/production-audit-and-hardening`  
**Node.js Version Tested:** `v24.14.1`  
**Docker Daemon Status During Run:** **Stopped / Not Reachable** (`/Users/mac/.docker/run/docker.sock`)

---

## Summary of Test Execution

Every test suite in `tests/` was executed after all Phase 1 edits completed. Tests are separated cleanly below into **Non-Docker Tests (code & security logic)** and **Docker-Dependent Integration Tests (host environment prerequisite)**.

| Test Scope | Files | Result | Pass / Fail Count | Notes |
|---|---|---|---|---|
| **Non-Docker Suites (All Phase 1 + Existing Unit Tests)** | `tests/agent.test.js`, `tests/benchmark.test.js`, `tests/cli.test.js`, `tests/project-detector.test.js`, `tests/provider.test.js`, `tests/security.test.js`, `tests/workspace.test.js` | **PASS** | **73 passed, 0 failed** | All unit, provider, agent loop, CLI, workspace isolation, redaction, and injection tests pass |
| **Docs Site Build (`VitePress`)** | `npm run docs:build` | **PASS** | Built cleanly in 2.13s | Zero broken markdown/config issues |
| **NPM Package Tarball Check** | `npm pack --dry-run` | **PASS** | 27 files (34.5 kB) | Verifies `src/security/Redactor.js` and `src/workspace/Staging.js` are packaged |
| **Docker Integration Suites** | `tests/foundation.test.js`, `tests/verifier.test.js` | **BLOCKED BY ENV (Docker daemon stopped)** | Non-Docker subtests in `foundation.test.js`: 4 passed; Docker subtests failed with `Cannot connect to the Docker daemon` | Environment failure only (`unix:///Users/mac/.docker/run/docker.sock` unavailable) |

---

## Detailed Security Test Coverage Added in Phase 1

### 1. [tests/security.test.js](file:///Users/mac/Desktop/projects/devfix/tests/security.test.js) (13 tests — ALL PASSING)

1. **Path Validation & Sensitive File Blocking**
   - Blocks `../etc/passwd`, `a/../../etc/passwd`, `/etc/passwd`, `/app`, and null bytes (`bad\x00file.js`).
   - Permits valid workspace paths including double-dot filenames (`backup..old.js`).
   - Blocks sensitive paths (`.env`, `.env.local`, `.env.production`, `.ssh/id_rsa`, `certs/private.pem`, `server.key`, `.npmrc`, `.pypirc`, `.aws/credentials`, `gcp-service-account.json`, `.git/config`) while permitting safe templates (`.env.example`, `.env.sample`, `.env.template`) and normal source files.
2. **Command & Path Injection Prevention**
   - `read_file` with malicious filename `file; touch /tmp/pwned; $(whoami).txt`: verifies `executeArgs` is invoked with the literal path in `args[0]` and the script string never interpolates the filename.
   - `read_file` on `.env` and `patch_file` on `server.key`: verifies `ACCESS_DENIED` is returned immediately without calling the sandbox.
   - `patch_file` rejects floating-point line numbers (`1.5`) with `Invalid line range` and base64-encodes dangerous replacement payloads (`$(rm -rf /)`, backticks, `\n`, `$HOME`) without interpolating them into the `sh`/`awk` script.
   - `execute_command` blocks `cat /var/run/docker.sock`, `cat /etc/shadow`, `cat /proc/1/environ`, and `rm -rf /` with `SAFETY_BLOCKED`.
   - `verifyHttp` rejects `file:///etc/passwd` (`INVALID_CONFIGURATION`) and passes `http://127.0.0.1:8080/health?a=1&b=2` strictly as a positional argument (`$1`) rather than interpolating into the probe script.
3. **Docker Hardening & Mount Safety**
   - Verifies `DockerSandbox.buildRunArgs()` always passes `--cap-drop=ALL`, `--security-opt=no-new-privileges=true`, `--network=none` (default), `--memory=512m`, `--memory-swap=512m`, `--cpus=1.0`, `--pids-limit=100`, and a non-root `--user` (never `0`, `0:0`, or `root`).
   - Verifies `allowNetwork: true` omits `--network=none`.
   - Verifies invalid container names (`bad;name`) throw immediately and `_validateHostMountPath()` rejects `/var/run/docker.sock`, `/`, and `os.homedir()`.
4. **Secret Redaction & Prompt Injection Defense**
   - Redacts fake GitHub (`ghp_`, `github_pat_`), AWS (`AKIA...`), Gemini (`AIza...`), Groq (`gsk_...`), npm (`npm_...`), Slack (`xoxb-...`), credentialed Postgres URLs (`postgres://[REDACTED]:[REDACTED]@...`), `.env` assignments (`MY_CUSTOM_SECRET=...`), and multi-line PEM private keys (`[REDACTED_PRIVATE_KEY]`).
   - Preserves `tokenUsage.total_tokens` while redacting `github_token` and `database_url`.
   - Verifies `AgentController` strips secrets from `initialFailure` and tool output (`TOKEN=ghp_...`) before the next `provider.chat()` call receives `messages`.
   - Verifies `SYSTEM_INSTRUCTION` explicitly classifies project files, READMEs, comments, and outputs as `UNTRUSTED DATA`.

### 2. [tests/workspace.test.js](file:///Users/mac/Desktop/projects/devfix/tests/workspace.test.js) (4 tests — ALL PASSING)

1. **Exclusion & Permission Preservation:** Confirms `StagingWorkspace.init()` excludes `.env`, `.ssh/id_rsa`, and `.git/config`, blocks an external symlink (`leak.txt -> ../host-secret.txt`), keeps `.env.example`, and preserves executable permission `0o755` on `run.sh`.
2. **Non-Destructive Unapproved / Dry-Run Safety:** Confirms edits inside `stagingPath` and `applyChanges({ approved: false })` (`APPROVAL_REQUIRED`) or `applyChanges({ approved: true, dryRun: true })` (`dryRun: true`) leave the original project directory completely unchanged while still returning accurate `added` and `modified` diffs.
3. **Escaping Symlink Blocking on Apply:** Confirms that if a symlink pointing outside staging is created during repair, `applyChanges({ approved: true })` throws and refuses to write anything back to the original project.
4. **Atomic Apply + Rollback:** Confirms approved changes update modified files, create new files, preserve `0o755` file permissions, keep excluded original `.env` untouched, remove staging after `cleanup()`, and that `StagingWorkspace.rollback(rollbackId)` restores exact file contents, restores `0o755` permissions, and deletes newly added files.

### 3. [tests/cli.test.js](file:///Users/mac/Desktop/projects/devfix/tests/cli.test.js) & [tests/provider.test.js](file:///Users/mac/Desktop/projects/devfix/tests/provider.test.js) (22 tests — ALL PASSING)

- Verifies `devfix --help` includes `fix`, `rollback`, `demo`, and `doctor`.
- Verifies `devfix fix --help` exposes `--dry-run`, `--yes`, and `--allow-network`.
- Verifies `devfix` Gemini key redaction (`AIza[REDACTED]`) and `resolveProviderConfig()` provider auto-detection, OpenAI-compatible Gemini endpoint configuration, empty-tools omission, and `tool_calls` normalization.

---

## Docker-Dependent Integration Suites (Environment Status)

When running `node --test tests/foundation.test.js tests/verifier.test.js`:
- **Passed (4 unit/validation subtests inside `tests/foundation.test.js`):**
  - `execute_command rejects dangerous patterns`
  - `read_file restricts path traversal`
  - `patch_file fails safely on invalid range`
  - `sandbox stops and cleans up`
- **Failed due to Host Environment (`Docker daemon not running`):**
  - Remaining container-creation subtests in `tests/foundation.test.js` (Docker Sandbox execution/timeout/missing-file checks) and all subtests in `tests/verifier.test.js` fail during `sandbox.start()` with:
    `Cannot connect to the Docker daemon at unix:///Users/mac/.docker/run/docker.sock. Is the docker daemon running?`

**Action required to complete live container verification:** Start Docker Desktop / the Docker daemon on the host, then re-run:
```bash
npm test
```

