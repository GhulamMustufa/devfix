# DevFix — Phase 3 Remaining Risks & Technical Limitations

**Branch:** `improve/production-audit-and-hardening`  
**Date:** March 2025  

---

## 1. Overview

Phase 3 successfully integrated deep runtime inspection, support for modern package managers (`pnpm`, `bun`, `uv`, `poetry`), monorepos, version constraints, conflict warnings, and dynamic Docker image selection.

However, several technical limitations, trade-offs, and environmental boundaries remain that engineering and open-source maintainers must be aware of prior to Phase 4.

---

## 2. Identified Risks & Architectural Boundaries

### Risk 1: Binary Availability in Lean Base Images
- **Description:** Official base images (`node:*-alpine` and `python:*-slim`) are chosen for minimal attack surface and rapid pull times. However:
  - `node:20-alpine` includes `npm` and `corepack`, but does not have `bun` pre-installed globally. `pnpm` and `yarn` require Corepack activation (`corepack enable`).
  - `python:3.11-slim` includes `pip`, but does not come with `poetry` or `uv` pre-installed globally.
- **Impact:** If a repair step attempts to invoke `bun test` or `poetry run` inside an un-customized standard base image, the command may fail with `command not found`.
- **Mitigation:**
  1. Developers can pass a pre-configured multi-tool image using the new `--image <image>` CLI option (e.g. `--image my-custom-agent-toolchain:latest`).
  2. DevFix can detect tool absence and suggest either enabling network (`--allow-network`) or providing an image override.

---

### Risk 2: Offline Dependency Installation (`--network=none` Default)
- **Description:** By default, DevFix isolates containers with `--network=none` to prevent prompt-injection-driven data exfiltration and untrusted network access.
- **Impact:** If a repair requires fetching new packages from npm or PyPI (rather than repairing code, fixing configs, or utilizing pre-installed packages), the installation will fail unless the user explicitly passes `--allow-network`.
- **Mitigation:** DevFix explicitly documents this behavior in terminal output and CLI help. When a package manager fails due to network unreachability, the agent detects the network failure and advises the user to opt-in with `--allow-network`.

---

### Risk 3: Polyglot (Mixed Node + Python) Repositories
- **Description:** In repositories with both a Python backend and a Node frontend, standard official base images only provide one runtime:
  - `node:20-alpine` has no Python interpreter.
  - `python:3.11-slim` has no Node.js runtime.
- **Impact:** Verifiers requiring simultaneous testing of both stacks (e.g. `npm test && pytest`) cannot succeed in a single-runtime container.
- **Mitigation:**
  1. DevFix detects and flags `Language: Mixed` and `Runtime: Mixed` in both the terminal and agent context.
  2. Developers can supply a polyglot container image containing both runtimes using `--image <image>`.

---

### Risk 4: Host UID/GID Mapping on Linux
- **Description:** DevFix runs containers non-root using `--user 1000:1000` (or host UID/GID on Linux).
- **Impact:** On certain host systems where files are owned by a different UID (e.g. root or UID 1001), non-root staging mounts might experience permission-denied errors on file writes.
- **Mitigation:** `StagingWorkspace` creates temporary staging files under the current executing user's ownership, which aligns with host UID mapping.

---

### Risk 5: Complex Monorepo Subpackage Execution
- **Description:** Large monorepos with multiple nested packages (e.g. `packages/api`, `packages/client`, `apps/web`) may have different scripts and configurations per subpackage.
- **Impact:** Running verifier commands at the root directory may fail if the root `package.json` lacks delegating scripts or if flags like `-w` / `--filter` are omitted.
- **Mitigation:** DevFix passes detected workspace globs into the agent context (`Monorepo: yes (packages/*, apps/*)`), enabling the AI agent to inspect subdirectories and target appropriate workspace paths.

---

### Risk 6: Docker Daemon Availability
- **Description:** Containerized execution requires an active Docker daemon.
- **Impact:** While all 121 unit, security, and detection tests run independently of Docker, integration tests (`tests/foundation.test.js`, `tests/verifier.test.js`) and actual `devfix fix` container runs require a live Docker daemon.
- **Status:** Integration tests remain reported as **BLOCKED** until verified against a running Docker daemon.

---

## 3. Recommended Next Actions for Phase 4

1. **Phase 4: Developer UX, Telemetry & Documentation:**
   - Enhance CLI progress indicators, error messages, and interactive diff viewers.
   - Refactor documentation site (`docs/`) to highlight new multi-language support, `--image` overrides, and security best practices.
   - Provide pre-built Dockerfiles or image recommendations for common multi-tool environments (e.g. Python + Node polyglot, Bun, Poetry).
2. **Phase 5: Production Readiness & Release Preparation:**
   - Final end-to-end integration verification with a live Docker daemon.
   - Benchmark verification against historical benchmarks (`artifacts/phase-3e` through `artifacts/phase-4f`) to guarantee zero performance or evidence regression.

