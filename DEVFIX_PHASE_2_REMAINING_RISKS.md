# DevFix Phase 2 Remaining Risks & Pre-Phase 3 Register

**Branch:** `improve/production-audit-and-hardening`  
**Date:** 2026-11-13  
**Status:** Pre-Phase 3 Review

---

## 1. High-Priority Operational Constraints

### A. Live Container Verification Blocked by Host Docker Daemon
- **Condition:** The host Docker daemon (`/Users/mac/.docker/run/docker.sock`) is currently stopped. All unit, security, workspace isolation, rollback, and argument-builder tests pass 100%, but live Docker container end-to-end tests (`tests/foundation.test.js`, `tests/verifier.test.js`) are blocked until Docker Desktop is started.
- **Impact:** Code changes are verified by mock sandboxes and unit tests; final release readiness requires running `npm test` once Docker Desktop is running.
- **Status:** Documented as **BLOCKED**; never reported as passed.

### B. Local Small Model Tool-Calling Precision
- **Condition:** DevFix now supports `ollama` and local endpoints out of the box without requiring API keys. However, open-weights small models (e.g. 7B/8B parameters) can occasionally generate slightly malformed tool-call arguments or hallucinate non-existent filenames.
- **Mitigation:** DevFix's `AgentController` already includes malformed tool call recovery, duplicate action blocking, and strict JSON schema normalization.
- **Severity:** Low.

---

## 2. Planned Scope for Phase 3 (Project Detection & Multi-Language Sandboxes)

### C. Wiring `ProjectDetector` into `devfix fix` Default Verifiers
- **Condition:** `devfix inspect` inspects projects, lockfiles, and runtimes. However, `devfix fix` still requires an explicit `--verify` command rather than auto-suggesting default verifiers based on detected runtimes (e.g. `npm test` for Node, `pytest` for Python).
- **Scheduled Phase:** Phase 3.

### D. Multi-Runtime Docker Container Images
- **Condition:** `DockerSandbox` currently defaults to `node:20-alpine`. Pure Python projects or mixed stacks requiring Python standard libraries need an appropriate base image (e.g. `python:3.11-slim` or multi-runtime images).
- **Scheduled Phase:** Phase 3.

### E. Large Directory Copy Optimization in Staging
- **Condition:** `StagingWorkspace` copies all non-sensitive directories recursively into `/tmp`. In massive repositories with gigabyte `node_modules` or `.venv` folders, this can take a few seconds and consume disk space.
- **Scheduled Phase:** Phase 3 (`.devfixignore` and smart dependency caching).

---

## 3. Approval Gate for Phase 3

All 6 objectives of **Phase 2** have been completed, tested, and documented.

**Before proceeding to Phase 3, the user should:**
1. Review the Phase 2 reports:
   - [DEVFIX_PHASE_2_IMPLEMENTATION_REPORT.md](file:///Users/mac/Desktop/projects/devfix/DEVFIX_PHASE_2_IMPLEMENTATION_REPORT.md)
   - [DEVFIX_PHASE_2_TEST_REPORT.md](file:///Users/mac/Desktop/projects/devfix/DEVFIX_PHASE_2_TEST_REPORT.md)
   - [DEVFIX_PHASE_2_REMAINING_RISKS.md](file:///Users/mac/Desktop/projects/devfix/DEVFIX_PHASE_2_REMAINING_RISKS.md)
2. Confirm readiness on branch `improve/production-audit-and-hardening`.
3. Provide explicit authorization before starting **Phase 3: Multi-Language & Runtime Support**.

