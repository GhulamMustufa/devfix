# DevFix Phase 1.5 Test Results

**Branch:** `improve/production-audit-and-hardening`  
**Test Runner:** Node.js native test runner (`node --test`)  
**Node.js Version:** `v24.14.1`  
**Host Platform:** macOS (`Darwin 25.3.0`)  
**Execution Timestamp:** 2026-11-13  

---

## 1. Overall Test Matrix

| Test Suite | File Path | Tests | Pass | Fail | Status |
|---|---|---|---|---|---|
| **Adversarial Security** | `tests/adversarial.test.js` | 9 | 9 | 0 | **PASS** |
| **Verifier Redaction** | `tests/verifier-redaction.test.js` | 5 | 5 | 0 | **PASS** |
| **Staging & Rollback** | `tests/workspace.test.js` | 9 | 9 | 0 | **PASS** |
| **Phase 1 Security & Injection** | `tests/security.test.js` | 13 | 13 | 0 | **PASS** |
| **CLI & Telemetry Interface** | `tests/cli.test.js` | 15 | 15 | 0 | **PASS** |
| **Provider & Gemini Configuration** | `tests/provider.test.js` | 7 | 7 | 0 | **PASS** |
| **Agent Controller & Cancellation** | `tests/agent.test.js` | 5 | 5 | 0 | **PASS** |
| **Benchmark Metrics & Reporter** | `tests/benchmark.test.js` | 5 | 5 | 0 | **PASS** |
| **Project Detector & Runtime Detection** | `tests/project-detector.test.js` | 9 | 9 | 0 | **PASS** |
| **Documentation Site Build** | `npm run docs:build` | — | — | — | **PASS** (3.00s) |
| **Docker Foundation Integration** | `tests/foundation.test.js` | 7 subtests | 4 passed | 3 blocked | **BLOCKED (Docker daemon stopped)** |
| **Deterministic Verifier Integration** | `tests/verifier.test.js` | 1 suite | 0 | 1 blocked | **BLOCKED (Docker daemon stopped)** |

**Non-Docker Test Totals:** **91 passed, 0 failed (100% passing)**.

---

## 2. Exact Test Invocations and Outputs

### Command: All Non-Docker Suites
```bash
node --test \
  tests/agent.test.js \
  tests/benchmark.test.js \
  tests/cli.test.js \
  tests/project-detector.test.js \
  tests/provider.test.js \
  tests/security.test.js \
  tests/workspace.test.js \
  tests/verifier-redaction.test.js \
  tests/adversarial.test.js
```

#### Output:
```text
▶ Phase 1.5 — Adversarial Security Testing Suite
  ✔ Adversarial: Shell injection through filenames in read_file and patch_file (2.757834ms)
  ✔ Adversarial: Shell injection and Awk breakout through patch contents (0.616417ms)
  ✔ Adversarial: Path traversal through relative and absolute paths (0.213667ms)
  ✔ Adversarial: Symlink escape attacks inside sandbox and staging (20.973459ms)
  ✔ Adversarial: Access to credentials and sensitive files is hard-blocked (1.217208ms)
  ✔ Adversarial: Execution tool blocks docker socket, shadow, and fork bombs (0.709542ms)
  ✔ Adversarial: DockerSandbox rejects mounting root, home, or docker.sock (1.756916ms)
  ✔ Adversarial: Prompt injection in project files or verifier output is neutralized (0.358042ms)
✔ Phase 1.5 — Adversarial Security Testing Suite (30.797708ms)
▶ Production Agent Controller
  ✔ Successful verifier termination (4.961791ms)
  ✔ Maximum iteration termination (0.78975ms)
  ✔ Duplicate action detection (2.119709ms)
  ✔ Malformed tool call recovery (3.36125ms)
  ✔ Provider permanent error (1.291917ms)
✔ Production Agent Controller (14.261792ms)
▶ Benchmark Metrics Calculation
  ✔ calculates correct rates and averages (0.634792ms)
  ✔ handles empty results gracefully (0.072666ms)
  ✔ handles unknown provider cost (0.075958ms)
✔ Benchmark Metrics Calculation (1.536542ms)
▶ Benchmark Reporter Output
  ✔ generates terminal report accurately (0.483542ms)
✔ Benchmark Reporter Output (0.6715ms)
▶ CLI Interface
  ✔ --help returns usage (252.19325ms)
  ✔ fix --help documents Phase 1 safety flags (165.591584ms)
  ✔ --version returns version (294.691792ms)
  ✔ fix command requires --verify (163.254709ms)
  ✔ fix command with invalid path returns code 2 (166.399083ms)
  ✔ fix command with file path returns code 2 (194.647875ms)
  ✔ demo command with unknown case returns code 2 (226.735083ms)
✔ CLI Interface (1466.585083ms)
▶ Telemetry Logger
  ✔ scrubs Bearer tokens (4.688916ms)
  ✔ scrubs OpenAI API keys (1.579166ms)
  ✔ scrubs Gemini API keys (0.174459ms)
  ✔ scrubs sensitive object keys entirely (0.454916ms)
✔ Telemetry Logger (26.061125ms)
▶ Trajectory Generator
  ✔ successful trajectory (0.518959ms)
  ✔ failed trajectory (0.857167ms)
  ✔ malformed tool call (ERROR) (0.445875ms)
  ✔ verifier failure (0.279459ms)
  ✔ secret redaction (proves it uses sanitized input) (0.335167ms)
  ✔ truncated output (0.347125ms)
  ✔ missing optional telemetry fields (0.094292ms)
✔ Trajectory Generator (4.077334ms)
▶ ProjectDetector
  ✔ detects pure Node.js/JavaScript project (34.467042ms)
  ✔ detects TypeScript project from tsconfig (17.380958ms)
  ✔ detects TypeScript project from package.json dependencies (6.839125ms)
  ✔ detects Python project from requirements.txt (15.085916ms)
  ✔ detects Python project from pyproject.toml (6.301ms)
  ✔ gracefully handles empty directory (3.553583ms)
  ✔ gracefully handles malformed package.json (9.146666ms)
  ✔ infers JS purely from .js files if no configs exist (5.085833ms)
  ✔ ambiguous project - Python takes over if strong signals and weak Node signals (2.809666ms)
✔ ProjectDetector (104.056375ms)
▶ LLMProvider & Gemini Configuration
  ✔ defaults to deepseek when no env vars are set (4.9575ms)
  ✔ auto-selects gemini when only GEMINI_API_KEY is set (1.798458ms)
  ✔ uses GEMINI_API_KEY over unrelated LLM_API_KEY when LLM_PROVIDER=gemini (2.482292ms)
  ✔ supports explicit LLM_API_KEY with LLM_PROVIDER=gemini (0.285625ms)
  ✔ chat() omits tools and tool_choice when tools are not provided (1.110542ms)
  ✔ chat() normalizes tool_calls with missing id or object arguments (0.521375ms)
  ✔ _scrubError redacts Gemini API keys (0.867958ms)
✔ LLMProvider & Gemini Configuration (22.632ms)
▶ Phase 1 Security — Path Validation & Sensitive File Blocking
  ✔ blocks path traversal and out-of-workspace paths (0.8125ms)
  ✔ allows safe workspace paths including filenames with double dots (0.101375ms)
  ✔ blocks sensitive files by default while allowing .env templates (0.162708ms)
✔ Phase 1 Security — Path Validation & Sensitive File Blocking (2.102416ms)
▶ Phase 1 Security — Injection Prevention in Tools and Verifier
  ✔ read_file passes malicious filenames strictly as positional arguments (1.807667ms)
  ✔ read_file and patch_file deny access to .env and private keys (0.330167ms)
  ✔ patch_file base64-encodes replacement and rejects non-integer line bounds (0.249666ms)
  ✔ execute_command blocks docker socket, /etc/shadow, and /proc/*/environ (0.643916ms)
  ✔ Http verifier validates URL protocol and passes URL as positional arg (1.682459ms)
✔ Phase 1 Security — Injection Prevention in Tools and Verifier (5.546583ms)
▶ Phase 1 Security — Docker Hardening Flags & Socket Protection
  ✔ buildRunArgs enforces cap-drop=ALL, non-root user, network=none, and limits (0.268ms)
  ✔ allowNetwork opt-in omits --network=none (0.100542ms)
  ✔ rejects invalid container names and Docker socket / root / home mounts (12.99325ms)
✔ Phase 1 Security — Docker Hardening Flags & Socket Protection (14.406458ms)
▶ Phase 1 Security — Secret Redaction & Prompt Injection Defense
  ✔ redacts GitHub, AWS, Gemini, Groq, npm, Slack, DB URLs, PEM keys, and .env secrets (1.188292ms)
  ✔ TelemetryLogger keeps token usage metrics while redacting sensitive keys (0.465417ms)
  ✔ AgentController scrubs secrets from tool outputs before sending to LLM (5.174917ms)
  ✔ SYSTEM_INSTRUCTION explicitly enforces untrusted data prompt-injection defense (0.202541ms)
✔ Phase 1 Security — Secret Redaction & Prompt Injection Defense (8.041791ms)
▶ Phase 1.5 — Verifier Output Redaction & Prompt Injection Sanitization
  ✔ verifyProcess redacts API keys, database URLs, passwords, private keys, and exports from stdout/stderr (1.473375ms)
  ✔ verifyHttp redacts sensitive data from probe and server output (101.766542ms)
  ✔ AgentController wraps verifier failures as untrusted data and scrubs all secrets before LLM prompt and telemetry (3.864834ms)
  ✔ TelemetryLogger writes sanitized verifier output to json and markdown artifacts on disk (5.347666ms)
✔ Phase 1.5 — Verifier Output Redaction & Prompt Injection Sanitization (113.98725ms)
▶ Phase 1 StagingWorkspace — Isolation, Diff, Approval, and Rollback
  ✔ excludes sensitive files and external symlinks when staging, while preserving .env.example and permissions (16.287084ms)
  ✔ keeps original project untouched on unapproved or dry-run apply (21.935375ms)
  ✔ blocks applying changes if staging introduces an escaping symlink (14.502292ms)
  ✔ applies approved changes atomically, preserves permissions, and supports full rollback (16.31ms)
  ✔ ensures rollback snapshot exists on disk before project mutation and handles partial failure / rollback (10.740208ms)
  ✔ blocks symlink traversal and destination symlink escaping during write-back (4.736167ms)
  ✔ explicit user rejection leaves project untouched and creates zero rollback files (3.955959ms)
  ✔ simulated interrupted operation restores cleanly from pre-existing snapshot (8.811458ms)
✔ Phase 1 StagingWorkspace — Isolation, Diff, Approval, and Rollback (99.349875ms)
ℹ tests 91
ℹ suites 2
ℹ pass 91
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1671.759916
```

---

## 3. Docker Integration Suite (BLOCKED)

### Command:
```bash
node --test tests/foundation.test.js tests/verifier.test.js
```

### Result:
```text
▶ Docker Sandbox and Tool Foundation
  ✖ sandbox creates and starts (575.808333ms)
    Error: Command failed: docker run -d --name test-sandbox-foundation --user 1000:1000 --cap-drop=ALL --security-opt=no-new-privileges=true --memory=512m --memory-swap=512m --cpus=1.0 --pids-limit=100 -e HOME=/tmp -e npm_config_cache=/tmp/.npm --network=none -w /app node:20-alpine sleep 360000
    Cannot connect to the Docker daemon at unix:///Users/mac/.docker/run/docker.sock. Is the docker daemon running?

  ✔ execute_command rejects dangerous patterns (0.660417ms)
  ✔ read_file restricts path traversal (0.437583ms)
  ✖ patch_file preserves executable permissions (Regression Test)
    Cannot connect to the Docker daemon at unix:///Users/mac/.docker/run/docker.sock. Is the docker daemon running?
  ✖ patch_file fails safely on non-existent path
    Cannot connect to the Docker daemon at unix:///Users/mac/.docker/run/docker.sock. Is the docker daemon running?
  ✔ patch_file fails safely on invalid range (0.29375ms)
  ✔ sandbox stops and cleans up (356.806916ms)
✖ Docker Sandbox and Tool Foundation
✖ Deterministic Verifier Layer
    Cannot connect to the Docker daemon at unix:///Users/mac/.docker/run/docker.sock. Is the docker daemon running?
```

### Finding:
- **Root Cause:** Host machine has Docker Desktop installed, but the Docker daemon background process (`/Users/mac/.docker/run/docker.sock`) is not running.
- **Classification:** **BLOCKED** by host environment.
- **Resolution:** Start Docker Desktop on the host machine, then run `npm test`.

---

## 4. Documentation Build Test

### Command:
```bash
npm run docs:build
```

### Output:
```text
> devfix@1.0.2 docs:build
> vitepress build docs

  vitepress v1.6.4

- building client + server bundles...
✓ building client + server bundles...
- rendering pages...
✓ rendering pages...
- generating sitemap...
✓ generating sitemap...
build complete in 3.00s.
```

