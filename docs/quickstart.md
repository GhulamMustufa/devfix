# Quick Start

Get up and running with DevFix in just a few minutes.

---

## 1. Prerequisites

Before installing DevFix, make sure you have:
- **Node.js:** v18.0.0 or higher.
- **Docker:** Docker Desktop or Docker Engine running locally.
- **API Key:** An API key for an LLM provider (Gemini, DeepSeek, OpenAI, Groq) or a local Ollama instance.

---

## 2. Installation

Install DevFix globally using npm:

```bash
npm install -g devfix
```

Verify your installation:

```bash
devfix --version
```

---

## 3. System Health Check

Run `devfix doctor` to check your environment, Docker status, and LLM configuration:

```bash
devfix doctor
```

```text
DEVFIX DOCTOR

✓ Node.js (v20.14.0)
✓ Docker CLI (Docker version 26.1.0)
✓ Docker daemon running
✓ Git (git version 2.44.0)
✓ LLM_PROVIDER=gemini
✓ LLM_MODEL=gemini-3.8-flash
✓ API credentials configured
✓ Rollback storage ready (/Users/.../.devfix/rollbacks)
✓ Local telemetry recording enabled

Ready. All system checks passed.
```

---

## 4. Configuring LLM Providers

DevFix supports leading cloud providers and local models. Set credentials in your `.env` file or export them in your shell:

### Google Gemini (Recommended)
```bash
export LLM_PROVIDER="gemini"
export GEMINI_API_KEY="AIzaSy..."
# Default model: gemini-3.8-flash
```

### DeepSeek
```bash
export LLM_PROVIDER="deepseek"
export LLM_API_KEY="sk-..."
# Default model: deepseek-chat
```

### OpenAI
```bash
export LLM_PROVIDER="openai"
export LLM_MODEL="gpt-4o"
export LLM_API_KEY="sk-..."
```

### Groq
```bash
export LLM_PROVIDER="groq"
export LLM_MODEL="llama-3.3-70b-versatile"
export LLM_API_KEY="gsk_..."
```

### Local Models via Ollama (Completely Free & Keyless)
```bash
export LLM_PROVIDER="ollama"
# Default endpoint: http://127.0.0.1:11434/v1
# Default model: llama3.2
# No API key required!
```

---

## 5. Inspecting a Project

Before repairing an environment, DevFix can inspect any project directory in read-only mode to detect its language, runtime version, package manager, and configuration:

```bash
devfix inspect .
```

To get machine-readable output for scripts:

```bash
devfix inspect . --json
```

---

## 6. Repairing a Broken Project (`devfix fix`)

To repair a broken project, specify the target directory and a verification command that proves the repair worked:

### Basic Repair:
```bash
devfix fix . --verify "npm test"
```

### Multi-Step Verification:
Ensure the project builds AND tests pass:
```bash
devfix fix . --verify "npm run build" --verify "npm test"
```

### Python Project with Custom Base Image:
```bash
devfix fix ./backend --verify "pytest" --image python:3.11-slim
```

### Dry-Run Mode (Preview Only):
Run diagnosis and verification in staging without modifying the host project:
```bash
devfix fix . --verify "npm test" --dry-run
```

### Allow Network for Missing Packages:
By default, network is disabled (`--network=none`). If your project needs to download packages from npm or PyPI:
```bash
devfix fix . --verify "npm test" --allow-network
```

### Automatic Approval (CI / Non-Interactive):
```bash
devfix fix . --verify "npm test" --yes
```

---

## 7. Reviewing Diffs & Repair History

### View Repair History:
```bash
devfix history
```

### Inspect File Changes from Previous Repairs:
```bash
devfix diff
```

---

## 8. Rolling Back Changes

If you ever need to revert a repair, DevFix makes it simple. Every approved repair generates a pre-commit snapshot:

```bash
# List available rollback snapshots
devfix rollback --list

# Restore the most recent repair for the current project
devfix rollback

# Restore a specific repair by ID
devfix rollback devfix-rollback-a1b2c3d4
```

DevFix verifies that files haven't been modified since the repair was applied before rolling back, preventing accidental overwrites. Pass `--force` if you wish to overwrite post-repair edits.
