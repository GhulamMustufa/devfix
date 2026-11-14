# Contributing to DevFix

Thank you for your interest in improving DevFix! We welcome contributions from developers, security researchers, and open-source enthusiasts.

---

## 1. Development Prerequisites

- **Node.js:** Node.js 18.0.0 or later (Node 20+ recommended).
- **Package Manager:** npm 9+ (or Corepack).
- **Docker:** Docker Desktop or Docker Engine (required for end-to-end container integration).
- **Git:** Git 2.30+ installed.

---

## 2. Setting Up Your Development Environment

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/devfix.git
   cd devfix
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your local environment:
   ```bash
   cp .env.example .env
   # Add your GEMINI_API_KEY, LLM_API_KEY, or configure a local Ollama endpoint
   ```

4. Verify your environment setup:
   ```bash
   node bin/devfix doctor
   ```

---

## 3. Running Tests & Verifications

DevFix maintains strict unit, adversarial, security, and integration test suites using the Node.js built-in test runner:

- **Run all unit & security tests:**
  ```bash
  node --test tests/*.test.js
  ```

- **Run specific test suites:**
  ```bash
  node --test tests/project-detector.test.js
  node --test tests/adversarial.test.js
  node --test tests/security.test.js
  node --test tests/workspace.test.js
  ```

- **Build documentation:**
  ```bash
  npm run docs:build
  ```

- **Preview documentation locally:**
  ```bash
  npm run docs:dev
  ```

---

## 4. Architectural & Security Rules for Contributors

When submitting pull requests, you must uphold the following core principles:

1. **Non-Destructive Repairs:** Never mount the user's project directory as a writable Docker volume. All file edits must be performed in `StagingWorkspace` and reviewed by the user.
2. **Hardened Containers:** Never weaken Docker container security (`--user 1000:1000`, `--cap-drop=ALL`, `--network=none`).
3. **No Shell String Concatenation:** Never interpolate untrusted user inputs, file paths, or commands into shell strings. Use argument-based execution (`execFile`, `executeArgs`).
4. **Secret Scrubbing:** Never log or send credentials or raw environment files to LLM prompts or telemetry files.
5. **Deterministic Verification:** Ensure verifiers return deterministic exit codes and provide actionable feedback.
6. **Preserve Benchmark Evidence:** Never modify, delete, or rewrite historical benchmark files in `artifacts/phase-3e` through `artifacts/phase-4f`.

---

## 5. Pull Request Guidelines

1. Create a feature branch with a clear name (`feat/add-ruby-support` or `fix/pnpm-symlink-resolution`).
2. Include comprehensive unit tests for all new functionality or bug fixes.
3. Verify that all existing unit tests pass:
   ```bash
   npm test
   ```
4. Update relevant documentation in `docs/` and add an entry to [CHANGELOG.md](file:///Users/mac/Desktop/projects/devfix/CHANGELOG.md).
5. Submit your PR with a clear description of the problem, solution, and test evidence.

