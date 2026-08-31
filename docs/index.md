---
layout: home

hero:
  name: "DevFix"
  text: "Autonomous Environment Recovery"
  tagline: The open-source AI agent that detects, diagnoses, and fixes broken local development environments.
  actions:
    - theme: brand
      text: Quick Start
      link: /quickstart
    - theme: alt
      text: View on GitHub
      link: https://github.com/ghulam-mustafa/devfix

features:
  - title: Self-Verifying Fixes
    details: Doesn't just guess. It actively runs your tests (like npm run build) to mathematically prove the environment is fixed.
  - title: Secure & Sandboxed
    details: AI shell access is dangerous. DevFix isolates all actions inside a secure Docker container, protecting your laptop.
  - title: Language Agnostic
    details: Automatically detects and supports Node.js, TypeScript, and Python without complex configuration.
---

<div style="margin-top: 4rem; margin-bottom: 2rem; display: flex; flex-direction: column; align-items: center;">
  <img src="/ascii-banner.png" alt="DevFix Terminal Banner" style="border-radius: 8px; max-width: 100%;" />
  <p style="font-size: 0.85em; font-style: italic; color: var(--vp-c-text-2); margin-top: 0.5rem; text-align: center;">The DevFix command-line interface.</p>
</div>

## The "It Works on My Machine" Solver

<div style="display: flex; gap: 1rem; margin-top: 2rem; margin-bottom: 2rem; justify-content: center;">
  <div style="width: 48%; display: flex; flex-direction: column; align-items: center;">
    <img src="/demo-02.gif" alt="DevFix resolving missing environment configurations" style="border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 100%;" />
    <p style="font-size: 0.85em; font-style: italic; color: var(--vp-c-text-2); margin-top: 0.5rem; text-align: center;">Case DEV-02: Diagnosing missing environment variables and creating .env configuration</p>
  </div>
  <div style="width: 48%; display: flex; flex-direction: column; align-items: center;">
    <img src="/demo-08.gif" alt="DevFix fixing case-sensitive export typos automatically" style="border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 100%;" />
    <p style="font-size: 0.85em; font-style: italic; color: var(--vp-c-text-2); margin-top: 0.5rem; text-align: center;">Case DEV-08: Automatically detecting and fixing a Javascript export typo</p>
  </div>
</div>

DevFix is an AI-powered CLI tool designed to solve the headache of broken local environments. 

<div style="margin-top: 2rem; margin-bottom: 2rem; display: flex; flex-direction: column; align-items: center;">
  <img src="/inspect-command.png" alt="DevFix Inspect Command Output" style="border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 70%; border: 1px solid var(--vp-c-divider);" />
  <p style="font-size: 0.85em; font-style: italic; color: var(--vp-c-text-2); margin-top: 0.5rem; text-align: center;">The <code>devfix inspect .</code> command instantly analyzing a broken project's runtime, package manager, and sandbox requirements.</p>
</div>

When a project refuses to build, dependencies conflict, or native binaries are missing, you shouldn't have to spend hours Googling cryptic stack traces. You simply run `devfix inspect .`, and the agent will:

1. **Observe:** Inspect configurations, package managers, and runtimes without executing code.
2. **Execute:** Spin up a secure Docker sandbox and attempt to build the project.
3. **Diagnose:** Analyze stack traces and missing dependencies deeply.
4. **Fix:** Interactively patch code, install missing packages, and re-run until the environment is healthy.

## Open Source & Evolving

DevFix started as an experiment to see if LLMs could reliably troubleshoot broken configurations without human intervention. We succeeded in building a framework that achieves high recovery rates on severely broken projects.

Today, DevFix is evolving into a serious, everyday developer tool. 

We are actively designing a VS Code Extension, adding support for Rust and Go, and building custom verifier integrations. **We are looking for contributors!** Check out our Roadmap and jump into our GitHub repository to submit your first Pull Request.
