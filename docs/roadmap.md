# Roadmap & Future Scope

DevFix was originally born as a highly successful hackathon project, achieving an 80% autonomous recovery rate on severely broken environments. We are now evolving it into a production-grade developer tool.

## Current Capabilities
- **Language Agnostic Detection:** Full support for Node.js (npm, yarn, pnpm), TypeScript, and Python.
- **Secure Sandboxing:** Automatic Docker containment for all AI shell execution.
- **Autonomous Recovery:** Capable of diagnosing stack traces, patching files, and managing dependencies.

## Coming Soon

We are actively developing the following features. (Want to help? Check out our [Contributing](/contributing) guide!)

- [ ] Support for **Rust**, **Go**, and **Java** environments.
- [ ] **VS Code Extension:** Seamlessly trigger DevFix directly from your editor when a terminal command fails.
- [ ] **Cloud Sandboxing:** Run fixes on remote infrastructure instead of local Docker.
- [ ] **Custom Verifiers:** Allow users to define their own success criteria (e.g., `devfix fix --verify "curl localhost:3000"`).
