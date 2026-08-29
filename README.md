# DevFix

**DevFix is an autonomous local development troubleshooting agent.** It investigates broken development environments, performs repairs inside an isolated Docker sandbox, and uses deterministic verification to prove whether the repair actually worked.

## Why does it matter?

The problem with ordinary LLM coding agents is that they operate purely on generation and self-assessment, which often leads to hallucinations.

```text
LLM says:
"I fixed it."

DevFix says:
"Prove it."

        ↓

Sandbox execution
        ↓
Deterministic verifier
        ↓
Verified result
```

DevFix removes the LLM's ability to self-certify its success. Only when the deterministic verifier signals a successful environment run does the agent complete its task.

## Key Capabilities

- **Autonomous Diagnosis**: Intelligently investigates the root cause of environment failures (missing dependencies, port conflicts, syntax errors).
- **Structured Tool Calling**: Executes sandboxed shell commands, reads files, and patches code iteratively.
- **Isolated Docker Execution**: Repairs are performed inside a secure, ephemeral Docker sandbox, protecting the host machine.
- **Deterministic Verification**: Independent verification layers ensure the fix actually works before claiming success.
- **Provider Abstraction**: A clean controller layer separating the LLM interface from the execution sandbox.
- **Telemetry & Security**: Logs are securely scrubbed of API credentials, and host shells are strictly protected against injection.

## Installation

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

## Configuration

Set up your `.env` file in the root of the project:

```bash
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-chat
LLM_API_KEY=your_deepseek_api_key_here
```

*Note: Never commit your `.env` file or API keys.*

## Usage

### 1. Verify your setup
Check that Docker, Node.js, and your API keys are correctly configured:
```bash
node bin/devfix doctor
```

### 2. Run a Demo Case
Watch DevFix autonomously repair a broken project in real-time.

```bash
# Demo a missing native dependency error (Python/node-gyp)
node bin/devfix demo DEV-04

# Demo a cascading failure (missing Typescript + type errors)
node bin/devfix demo DEV-05
```

### 3. Troubleshoot your own project
To run DevFix on an existing project, pass the path and the command that determines success:
```bash
node bin/devfix fix . --verify "npm run start"
```
*(The `--verify` flag is strictly required to enforce deterministic verification)*

## Architecture

DevFix is designed around strict separation of concerns, isolating the LLM from execution and verification.
See the full architecture diagram in [docs/architecture.md](docs/architecture.md).

## Benchmark

DevFix was rigorously benchmarked across 5 common local environment failures. It achieved a **60% verified autonomous recovery rate**.

| Case   | Result                                 |
| ------ | -------------------------------------- |
| DEV-01 | Failed — reasoning limitation          |
| DEV-02 | Success                                |
| DEV-03 | Failed — process-management limitation |
| DEV-04 | Success                                |
| DEV-05 | Success                                |

*Note: Failed cases hit the 15-iteration limit. The deterministic verifier successfully blocked the LLM from hallucinating a "fixed" state.*

## Safety & Security

- **Docker Isolation**: All agent tools execute inside a sandboxed Docker container.
- **Resource Limits & Timeouts**: Commands are aggressively timed out (10s limit) to prevent runaway processes.
- **Credential Scrubbing**: The telemetry logger automatically sanitizes API keys (`Bearer ...`, `sk-...`) from conversation histories.
- **Sandbox Cleanup**: Environments are deterministically scrubbed on completion or SIGINT.

## Limitations

- **Reasoning Limits**: Autonomous repair is not yet 100%. Complex infrastructure issues (like Docker-in-Docker failures in DEV-01) or stubborn background process deadlocks (DEV-03) may still stump the model within the current 15-iteration limit.
- **Performance**: Iteration loops take time; deep recoveries can take up to 30-60 seconds to fully verify.

## Testing

Run the deterministic verifier and sandbox test suites (36 tests):
```bash
node --test tests/*.test.js
```
