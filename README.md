# DevFix 🛠️

> **DevFix is a fully autonomous, deterministic agent for fixing broken local development environments.**

The biggest problem with current AI coding assistants (like Copilot or Cursor) is that they operate entirely on **vibes and text generation**. They give you code and confidently say "I fixed it!", leaving *you* to run the commands, test the environment, and verify if it actually worked.

**DevFix changes that.** 

DevFix is a closed-loop, sandboxed agentic workflow. You give it a broken project, and it spins up a secure Docker environment, investigates the root cause, patches files, runs shell commands, and **verifies its own fixes**. 

It does not stop until a deterministic verifier (like `npm run build` or `pytest`) explicitly returns a success code.

```text
A Standard LLM says:
"I think this code fixes it." (Hallucination risk: High)

DevFix says:
"Prove it."

        ↓
Sandbox execution
        ↓
Deterministic Verifier 
        ↓
Verified Repair 
```

## 🏆 Why this is a Top 1% Architecture

Most AI hackathon projects are simple wrappers around an LLM API. DevFix introduces rigorous engineering paradigms to the agentic space:

1. **Deterministic Verifier Layer**: DevFix removes the LLM's ability to self-certify its success. Only when the host environment proves the fix works does the agent complete its task.
2. **Secure Async Sandbox**: AI running arbitrary commands is dangerous. DevFix isolates all agent actions inside an ephemeral Docker container. It protects the host machine from rogue commands (e.g., `rm -rf /`).
3. **Agent Controller**: A robust orchestrator that handles maximum iteration limits, duplicate action detection, and malformed tool calls.
4. **Empirical Benchmarking**: We didn't just build an agent; we built a rigorous evaluation framework (`devfix benchmark`) to prove it works against 10 real-world environment failures.

## 📊 The 10-Case Benchmark (Phase 5)

We rigorously benchmarked DevFix against 10 completely different, real-world development environment failures (e.g., missing native dependencies, circular babel imports, broken configs, missing TypeScript compilation).

**Results:**
- **Verified Recovery Rate:** 80.0% (8/10 cases fixed fully autonomously)
- **Tool Reliability:** 100.0%
- **Average Repair Time:** 31.0 seconds
- **Test Suite:** 50/50 automated unit tests passing.

*(To reproduce the benchmark, simply run `node bin/devfix benchmark`)*

## 🚀 Key Capabilities

- **Autonomous Diagnosis**: Intelligently investigates root causes without human hand-holding.
- **Isolated Docker Execution**: Repairs are performed in a secure sandbox, preventing catastrophic host damage.
- **Telemetry & Security**: Logs are securely scrubbed of API credentials (`Bearer`, `sk-...`), and host shells are protected against injection.
- **Human-Readable Trajectories**: Generates beautiful markdown reports of the agent's thought process for every run.

## 📦 Installation & Setup

### Requirements
- Node.js (v20+)
- Docker CLI & Docker Daemon (running)
- DeepSeek API Key

### Setup
```bash
git clone https://github.com/GhulamMustufa/micro1-agentic-workflows.git
cd micro1-agentic-workflows
npm install
```

### Configuration
Set up your `.env` file in the root of the project:
```bash
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-chat
LLM_API_KEY=your_deepseek_api_key_here
```
*(Note: Never commit your `.env` file or API keys. Telemetry will automatically scrub them if accidentally logged).*

## 💻 Usage

### 1. Verify your setup
Check that Docker, Node.js, and your API keys are correctly configured:
```bash
node bin/devfix doctor
```

### 2. Run the Benchmark
Watch DevFix autonomously repair the 10-case evaluation suite in real-time, calculating metrics along the way.
```bash
node bin/devfix benchmark
```

### 3. Run a Specific Demo Case
```bash
# Demo a missing native dependency error (Python/node-gyp)
node bin/devfix demo DEV-04

# Demo a cascading configuration failure
node bin/devfix demo DEV-05
```

### 4. Troubleshoot Your Own Project
To run DevFix on your own broken project, pass the path and the command that determines success:
```bash
node bin/devfix fix . --verify "npm run start"
```
*(The `--verify` flag enforces the deterministic verification loop).*

## 🏗 Architecture

DevFix is designed around a strict separation of concerns, isolating the LLM reasoning from execution and verification.
See the full architectural breakdown in [docs/architecture.md](docs/architecture.md) and the evolution of the project in [docs/IMPROVEMENT-CHANGELOG.md](docs/IMPROVEMENT-CHANGELOG.md).
