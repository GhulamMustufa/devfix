# DevFix Phase 1 Migration Notes

**Target Audience:** DevFix users, contributors, and CI/benchmark operators upgrading from `main` (`1.0.2`) to Phase 1 on `improve/production-audit-and-hardening`.

---

## What Changed for Users & Operators

### 1. `devfix fix` No Longer Modifies Your Project Directly During Repair
- **Previous behavior:** `devfix fix <project> --verify "<cmd>"` mounted `<project>` directly into `/app` inside Docker. Every LLM experiment happened live on your files.
- **New behavior:** DevFix copies your project into an isolated temporary staging directory (`os.tmpdir()/devfix-stage-*`), runs the agent and verifier inside staging, prints a `STAGING DIFF`, and only applies verified changes back after explicit approval.
- **CLI flags added to `fix`:**
  - `--dry-run`: Run inspection and verification in staging and display the diff without touching the original directory.
  - `-y, --yes`: Skip interactive confirmation and apply verified staging changes automatically (required in non-interactive/CI scripts if you want changes written back).
  - `--allow-network`: Re-enable container network access (off by default).

### 2. New `devfix rollback` Command
Whenever verified changes are applied to your original project, DevFix saves a rollback snapshot under `~/.devfix/rollbacks/<rollbackId>/` (or `$DEVFIX_ROLLBACK_DIR` if set).
- List snapshots:
  ```bash
  devfix rollback --list
  ```
- Undo the most recent repair (or a specific repair ID):
  ```bash
  devfix rollback --project ./my-app
  devfix rollback <rollbackId>
  ```

### 3. Docker Containers Are Network-Isolated and Non-Root by Default
- **Breaking behavior if a broken project needs internet (`npm install`, `pip install`, API calls):**  
  Containers now start with `--network=none`, `--cap-drop=ALL`, `--security-opt=no-new-privileges=true`, and non-root `--user`.
  - If your repair requires downloading packages, explicitly opt in:
    ```bash
    devfix fix ./my-app --verify "npm test" --allow-network
    devfix demo DEV-01 --allow-network
    devfix benchmark --allow-network
    ```
  - **Root / global system package caveat:** Because containers no longer run as `uid 0` (`root`), global installs such as `npm install -g ...` or `apk add ...` inside `devfix fix` will fail with permission errors. Application-level local fixes (`package.json`, local config, app source, user-writable `/tmp`) work normally.

### 4. Sensitive Files Excluded from Staging & Blocked from File Tools
The following are automatically excluded when copying your project to staging and blocked from `read_file` / `patch_file`:
- `.git/`, `.ssh/`, `.aws/`, `.gnupg/`, `.gcp/`, `.docker/`
- `.env` and `.env.*` (safe templates `.env.example`, `.env.sample`, `.env.template`, `.env.dist` **are** included)
- `.npmrc`, `.pypirc`, `.netrc`, `.dockercfg`
- Private keys (`id_rsa`, `id_ed25519`, `id_dsa`, `id_ecdsa`, `*.pem`, `*.key`, `*.p12`, `*.pfx`)
- Cloud credential JSONs (`credentials.json`, `*service-account*.json`, `*service_account*.json`, `*credentials*.json`)

**Impact:** Your original `.env` and `.git` history remain untouched on your machine. If a broken test suite needs environment variables while running inside staging, use safe test defaults or template files rather than production `.env` secrets.

### 5. Environment & Provider Configuration Updates (Gemini Support + `doctor`)
- `GEMINI_API_KEY` is now natively supported alongside `LLM_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, and `OPENROUTER_API_KEY`.
- `devfix doctor` now reads `resolveProviderConfig()` dynamically instead of checking a hardcoded `openai`/`gpt-4o-mini` fallback. See [.env.example](file:///Users/mac/Desktop/projects/devfix/.env.example).

### 6. Internal API Notes for Test Authors & Contributors
- `DockerSandbox` adds `executeArgs(script, args, timeoutMs)` and `executeHostCommand(cmd, { asRoot: true })` (needed only when test fixtures deliberately run privileged root setup inside an ephemeral test container, such as simulating missing `wget` binaries in `tests/verifier.test.js`).
- `ToolRegistry` now forwards optional configuration (such as `{ allowSensitiveFiles }`) to `read_file` and `patch_file`.
- `StagingWorkspace` supports `DEVFIX_ROLLBACK_DIR` or `rollbackRootDir` constructor option so automated tests can isolate rollback storage.

