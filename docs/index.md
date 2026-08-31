---
layout: home

hero:
  name: "DevFix"
  text: "Autonomous Environment Recovery"
  tagline: Top 1% Hackathon Agent. Automatically detects, diagnoses, and fixes broken local development environments.
  actions:
    - theme: brand
      text: Get Started
      link: /changelog
    - theme: alt
      text: View on GitHub
      link: https://github.com/ghulam-mustafa/devfix

features:
  - title: 80% Success Rate
    details: Achieves top-tier performance on the rigorous 10-case DevFix benchmark.
  - title: Secure & Sandboxed
    details: Runs completely inside isolated Docker containers with restricted network access.
  - title: Language Agnostic
    details: Automatically detects and supports Node.js, TypeScript, and Python out of the box.
---

## What is DevFix?

DevFix is an AI-powered CLI agent designed to solve the "it works on my machine" problem. When a local project refuses to build or start, you simply run `devfix inspect .`, and the agent will:

1. **Observe:** Inspect configurations, package managers, and runtimes using static analysis.
2. **Execute:** Spin up a secure Docker sandbox and attempt to run the project.
3. **Diagnose:** Analyze stack traces, missing dependencies, and build failures.
4. **Fix:** Interactively patch code, install packages, and re-run until the environment is healthy.

## The Benchmark

DevFix was aggressively optimized against a custom deterministic benchmark of common local failures (e.g. missing `node_modules`, broken `package.json`, malformed `tsconfig.json`, syntax errors, and missing system binaries).

Through careful prompt engineering, robust tool design, and context management, the `deepseek-chat` powered agent recovers 8/10 severely broken environments completely autonomously.
