# Judge Quickstart Guide

This guide is designed to get you from zero to a live, verifiable DevFix autonomous recovery in under 3 minutes.

## 1. Prerequisites
- **Node.js**: v20 or higher.
- **Docker**: The Docker daemon must be running.
- **DeepSeek API Key**: A valid `deepseek-chat` API key.

## 2. Setup
Clone the repository and install dependencies:

```bash
git clone https://github.com/GhulamMustufa/devfix.git
cd devfix
npm install
```

Create a `.env` file in the root of the project with your API key:
```bash
echo "LLM_PROVIDER=deepseek" > .env
echo "LLM_MODEL=deepseek-chat" >> .env
echo "LLM_API_KEY=your_actual_key_here" >> .env
```

## 3. Verify Environment
Run the DevFix diagnostic to ensure everything is wired up correctly:
```bash
node bin/devfix doctor
```
You should see checkmarks for Node.js, Docker CLI, Docker Daemon, and API credentials.

## 4. Run the Demos

### Demo 1: Missing Native Dependencies (DEV-04)
Run:
```bash
node bin/devfix demo DEV-04
```
**What you should see:** 
The agent will spin up a sandbox with a broken Node.js project. It will autonomously discover that `python` is missing for `node-gyp`, install the missing package via `pip` or `apk add`, and then wait for the external Deterministic Verifier to run the build. You should see `✓ Repair successful`.

### Demo 2: Cascading Type Failures (DEV-05)
Run:
```bash
node bin/devfix demo DEV-05
```
**What you should see:** 
The project fails to start because `tsc` (TypeScript) isn't installed. The agent installs it, but the compilation fails due to a strict-mode type mismatch (`string` vs `number`). The verifier bounces the failure back to the LLM, which patches the code, tries again, and eventually succeeds. You should see `✓ Repair successful`.

## 5. Explore Evidence
Want to see exactly what the agent did during those runs? 
Open `artifacts/runs/` and view the latest JSON telemetry files. They contain the fully scrubbed, structured tool-call history proving the agent's autonomous workflow.
