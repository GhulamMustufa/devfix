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
      link: https://github.com/GhulamMustufa/devfix

features:
  - title: Deterministic Verification
    details: Doesn't just guess. It executes your actual test suites and build commands (npm test, pytest) to prove the fix works before completing.
  - title: Non-Destructive Staging
    details: Repairs take place in an isolated staging workspace. You review a unified diff and explicitly approve changes before anything touches your project.
  - title: Multi-Runtime & Monorepo Support
    details: Automatically detects Node.js (npm, pnpm, yarn, bun), Python (pip, uv, poetry), version constraints, and monorepo workspaces.
---

<div style="margin-top: 4rem; margin-bottom: 2rem; display: flex; flex-direction: column; align-items: center;">
  <img src="/ascii-banner.png" alt="DevFix Terminal Banner" style="border-radius: 8px; max-width: 100%;" />
  <p style="font-size: 0.85em; font-style: italic; color: var(--vp-c-text-2); margin-top: 0.5rem; text-align: center;">Autonomous Local Development Troubleshooter.</p>
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

DevFix is an AI-powered developer tool designed to eliminate the headache of broken local development environments.

```bash
# Diagnose and fix a project with deterministic verification
devfix fix . --verify "npm test"

# Or run multi-step verification in dry-run mode
devfix fix . --verify "npm run build" --verify "npm test" --dry-run
```

When a project refuses to build, dependencies conflict, or native configurations fail:

1. **Detect:** DevFix scans runtime versions, package managers, lockfiles, and monorepos in read-only mode (`devfix inspect .`).
2. **Stage:** Duplicates project files into a disposable staging workspace, strictly excluding secrets and private keys.
3. **Isolate:** Spawns a hardened Docker container (`--user 1000:1000`, `--cap-drop=ALL`, `--network=none`).
4. **Repair:** The AI agent diagnoses errors, patches files, and tests hypotheses.
5. **Verify:** External verifiers prove success before declaring the issue resolved.
6. **Review & Rollback:** Presents a unified diff for developer confirmation and creates pre-commit snapshots for instant rollback (`devfix rollback`).

## Open Source & Evolving

DevFix started as an experiment to see if LLMs could reliably troubleshoot broken configurations without human intervention. We succeeded in building a framework that achieves high recovery rates on severely broken projects.

Today, DevFix is evolving into a serious, everyday developer tool. 

We are actively designing a VS Code Extension, adding support for Rust and Go, and building custom verifier integrations. **We are looking for contributors!** Check out our Roadmap and jump into our GitHub repository to submit your first Pull Request.
