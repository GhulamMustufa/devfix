<div align="center">
  <img src="https://raw.githubusercontent.com/GhulamMustufa/devfix/main/docs/public/ascii-banner.png" alt="DevFix Terminal Banner" width="400" />
</div>

# DevFix 🛠️

**The open-source autonomous agent that detects, diagnoses, and fixes broken local development environments.**

📚 **[Read the Official Documentation & Quick Start Guide](https://devfix.ghulam-mustafa.com)**


<div align="center">
  <img src="https://raw.githubusercontent.com/GhulamMustufa/devfix/main/docs/public/demo-02.gif" alt="DevFix diagnosing missing environment variables" width="48%" style="border-radius: 8px;" />
  <img src="https://raw.githubusercontent.com/GhulamMustufa/devfix/main/docs/public/demo-08.gif" alt="DevFix fixing case-sensitive export typos automatically" width="48%" style="border-radius: 8px;" />
  <p><i>DevFix autonomously resolving missing configurations and code typos.</i></p>
</div>

## 🚨 The Problem & Bottleneck
**Who has this problem?** Every software developer, DevOps engineer, and open-source contributor.
**What is the bottleneck?** The dreaded *"It works on my machine"* syndrome. When a developer clones a repository and the build fails (due to missing global binaries, silent Node version mismatches, or conflicting lockfiles), they spend hours Googling cryptic stack traces. Existing AI assistants (like Copilot) fail here because they simply guess the fix via text generation, leaving the human to manually test if the guess actually compiled.

**DevFix changes that.** 

DevFix is a sandboxed agentic workflow. You give it a broken project, and it spins up a secure Docker environment, investigates the root cause, patches files, runs shell commands, and **verifies its own fixes**. 

It does not stop until your build scripts actually succeed.

## ✨ Why DevFix?

Most AI tools guess. DevFix proves it. 

1. **Self-Verifying (Deterministic Verifier Layer):** DevFix removes the AI's ability to "hallucinate" a success. It actively runs your test suite (`npm run build`, `pytest`, etc.). Only when the environment proves the fix works does the agent complete its task.
2. **Highly Secure (Sandboxed Execution):** Giving an AI access to run arbitrary bash commands on your laptop is dangerous. DevFix isolates all actions inside a secure, ephemeral Docker container. It cannot harm your host machine.
3. **Language Agnostic Detection:** Point DevFix at any directory. It automatically reads your lockfiles, `package.json`, or `requirements.txt` to figure out if you're running Node, Python, or TypeScript without you needing to configure anything.

## 🚀 Quick Start

### Installation

DevFix is available globally via NPM:

```bash
npm install -g devfix
```

### Usage

**1. Inspect your project**
Curious what DevFix sees? Run this in your project root. It performs a read-only scan to detect your environment:
```bash
devfix inspect .
```

**2. Fix your project (Coming Soon)**
The core fix loop is currently optimized for our internal 10-case benchmark. The global `devfix fix .` command is actively being stabilized for public release.

### Run the Benchmark
If you want to see DevFix in action immediately, you can run our rigorous 10-case failure benchmark locally:
```bash
devfix benchmark
```

## 🗺️ Roadmap & Future Scope

DevFix was originally born as a highly successful hackathon project, achieving an 80% autonomous recovery rate on severely broken environments. We are now evolving it into a production-grade developer tool.

**Current Capabilities:**
- Full support for Node.js (npm, yarn, pnpm), TypeScript, and Python.
- Secure Docker sandboxing.
- Autonomous file patching and shell execution.

**Coming Soon (We need your help!):**
- [ ] Support for **Rust**, **Go**, and **Java**.
- [ ] **VS Code Extension:** Seamlessly trigger DevFix directly from your editor when a terminal command fails.
- [ ] **Cloud Sandboxing:** Run fixes on remote infrastructure instead of local Docker.
- [ ] **Custom Verifiers:** Allow users to define their own success criteria (e.g., `devfix fix --verify "curl localhost:3000"`).

## 🧠 Hackathon Insights & Hot Take
DevFix was heavily refined during the micro1 Agentic Workflows Hackathon. During our experiments, we observed a massive failure mode: LLMs fundamentally fail at debugging environments when they rely entirely on text generation and assumed context. 

**Our Hot Take:** Giving an AI a massive 1 Million token context window is practically useless for debugging local dependencies. The LLM doesn't need more context—it needs **a bash shell to verify its own assumptions**. Verification is infinitely more important than generation. 

*To see our full journey, read our [Improvement Changelog](https://devfix.ghulam-mustafa.com/changelog).*
*Judges: Please see our **[Reproduction Guide](https://devfix.ghulam-mustafa.com/reproduction)** to easily reproduce our benchmark results.*

## 🤝 Contributing (Awaiting PRs!)

DevFix is in active, early-stage development, and we are heavily awaiting Pull Requests from the community! 

Whether you want to add support for a new language (like Go or Rust), improve the AI prompts, or help build the upcoming VS Code extension, your contributions are welcome.

1. Fork the repository.
2. Run `npm install` to install dependencies.
3. Run `npm run test` to ensure the core engine is stable.
4. Submit a Pull Request!

Please read our [Documentation](https://devfix.ghulam-mustafa.com) for a deep dive into the architecture and system design.

## 📄 License

MIT License. Copyright © 2024-present Ghulam Mustafa.
