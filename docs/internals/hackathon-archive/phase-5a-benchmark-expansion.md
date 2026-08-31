# Phase 5A: Benchmark Expansion

## Objective
To expand the DevFix autonomous recovery evaluation benchmark from 5 cases to 10 distinct, non-overlapping cases, ensuring a robust test of the agent's diagnostic logic.

## Methodology
Five new cases were engineered with precise deterministic verifier integration. Each case required the agent to investigate a broken `node_modules` structure, missing configuration, syntax errors, or failing build pipelines inside an isolated Docker sandbox.

## Case Details

### DEV-06 — Dependency / Package Configuration Failure
- **Category**: Dependency Issue
- **Difficulty**: Easy
- **Setup**: `package.json` contains `express` but lacks `cors`. `index.js` imports `cors`.
- **Expected Repair**: `npm install cors`
- **Verifier**: Process (exit code 0).
- **Result**: **SUCCESS** (13 iterations)
- **Differentiation**: Tests if the agent can manually correlate an imported but missing package against `package.json` dependencies.

### DEV-07 — Environment / Runtime Configuration Failure
- **Category**: Missing Configuration
- **Difficulty**: Medium
- **Setup**: Project expects an `API_KEY` in `.env`. Only `.env.test` is provided.
- **Expected Repair**: Create `.env` containing `API_KEY`.
- **Verifier**: Process (exit code 0).
- **Result**: **SUCCESS** (7 iterations)
- **Differentiation**: Tests environmental context awareness rather than just package installation.

### DEV-08 — File / Module Integration Failure
- **Category**: Code/Module Path Mismatch
- **Difficulty**: Medium
- **Setup**: A named export in `math.js` uses `Add`, but the importer expects `add`.
- **Expected Repair**: Patch `math.js` or `index.js` to align the export/import structure.
- **Verifier**: Process (exit code 0).
- **Result**: **SUCCESS** (4 iterations)
- **Differentiation**: Requires reading across multiple files and patching code logic rather than shell-level fixes.

### DEV-09 — Build / Configuration Failure
- **Category**: Build Configuration
- **Difficulty**: Hard
- **Setup**: `webpack.config.js` incorrectly points to `src/app.js` instead of the actual `src/index.js`.
- **Expected Repair**: Patch `webpack.config.js` entrypoint.
- **Verifier**: Process (`npm run build` exits 0).
- **Result**: **SUCCESS** (4 iterations)
- **Differentiation**: Tests interaction with toolchain configurations (Webpack) instead of runtime node configurations.

### DEV-10 — Multi-Step Cascading Failure
- **Category**: Cascading Diagnostic Flow
- **Difficulty**: Hard
- **Setup**: `server.js` contains a syntax error, requires an uninstalled `express` package, AND requires a missing `config.json` containing a port number.
- **Expected Repair**: Fix syntax -> `npm i express` -> Create `config.json`.
- **Verifier**: Process (exit code 0).
- **Result**: **FAILED** (MAX_ITERATIONS - 15)
- **Differentiation**: The hardest case in the suite, intentionally designed to require a deep diagnostic loop.

## Conclusion
The benchmark has been successfully expanded to 10 cases.
- **Overall Recovery Rate**: 7/10 (70%)
- **New Case Recovery Rate**: 4/5 (80%)

**No architectural code in `src/agent/`, `src/verifier/`, or `src/sandbox/` required modification.** The system cleanly handled the new diagnostic profiles using its existing ReAct loop and deterministic verifier layers.
