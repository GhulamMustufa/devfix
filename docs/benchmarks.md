# Benchmarks & Cases

DevFix ships with an integrated benchmark suite to evaluate the agent's ability to autonomously resolve highly diverse, broken development environments.

## Official Benchmark Report

Below is a snapshot of the DevFix agent successfully diagnosing and repairing a local environment without any human intervention. The system provides a detailed report on iterations, time, tool reliability, and token usage.

<div style="margin-top: 2rem; margin-bottom: 2rem; display: flex; flex-direction: column; align-items: center;">
  <img src="/benchmark.png" alt="DevFix Terminal Benchmark Output" style="border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 100%; border: 1px solid var(--vp-c-divider);" />
  <p style="font-size: 0.85em; font-style: italic; color: var(--vp-c-text-2); margin-top: 0.5rem; text-align: center;">An automated run of the DevFix benchmark showing a 100% verified recovery rate on the DEV-02 case.</p>
</div>

> [!NOTE]
> *Disclaimer: Because DevFix utilizes non-deterministic LLMs and tests hypotheses iteratively, execution time, total iterations, and API token consumption will vary depending on the complexity of the broken environment.*

## The 10 Core Benchmark Cases

To ensure DevFix is robust and language-agnostic, the benchmark suite evaluates the agent against a highly diverse set of scenarios ranging from simple typos to complex cascading compiler errors.

| Case ID | Name | Complexity | Description |
|---|---|---|---|
| **DEV-01** | Missing OS Dependency | High | A Dockerfile is missing critical system-level dependencies (like `make`). Tests the agent's ability to use package managers like `apk`/`apt`. |
| **DEV-02** | Missing Configuration | Medium | Application crashes due to missing `.env` variables. Tests the agent's ability to read code requirements and scaffold configuration files. |
| **DEV-03** | Service Port Conflict | Low | App fails to start with an `EADDRINUSE` error because the port is already bound. Tests the agent's ability to kill zombie processes or modify port bindings. |
| **DEV-04** | Hidden CRLF Entrypoint | Low | A bash script fails with a `bad interpreter` error due to Windows line endings. Tests the agent's awareness of cross-platform file formatting. |
| **DEV-05** | Cascading TS Failure | High | A complex TypeScript project is missing compiler dependencies and configuration. Tests multi-step reasoning (install `tsc`, init `tsconfig`, compile). |
| **DEV-06** | Dependency Missing | Low | Code imports a package (e.g., `cors`) that isn't in `package.json`. Tests standard package manager resolution. |
| **DEV-07** | Runtime Configuration | Medium | Deeply nested runtime configuration is missing or incorrectly formatted. Tests code-reading and environment injection. |
| **DEV-08** | Module Integration | Low | A CommonJS module exports with a typo (`Add` instead of `add`). Tests fine-grained code editing tools. |
| **DEV-09** | Build Configuration | High | Webpack/bundler configuration is broken or points to missing entry files. Tests the agent's understanding of modern frontend build pipelines. |
| **DEV-10** | Cascading Syntax Error | High | Code contains raw syntax errors and missing imports. Tests the agent's ability to parse runtime crash logs and apply sequential code patches. |

### How DevFix Handles Complexity

For simple cases like **DEV-08**, the agent generally solves the problem in 1-3 iterations using fewer than 5,000 tokens. 

For complex cascading failures like **DEV-05** or **DEV-10**, the agent acts like a real developer: it installs a tool, attempts a build, reads the *new* error, fixes the configuration, and repeats. This iterative hypothesis-testing is what makes DevFix so powerful, even if it requires more LLM cycles!
