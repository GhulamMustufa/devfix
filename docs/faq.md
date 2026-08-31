# Frequently Asked Questions (FAQ)

### How is DevFix different from Cursor, ChatGPT, or Claude?
Standard LLMs and AI code editors generate text and *hope* that it works, leaving you to manually run the code and paste the errors back to them. **DevFix is a deterministic verifier.** It doesn't just guess; it spins up a secure Docker container, runs your actual build commands, analyzes the terminal output, and mathematically proves the fix works before it stops iterating.

### Is it safe to run on my local machine?
**Yes.** Security is our highest priority. The LLM agent is not allowed to run bash commands directly on your laptop. Instead, every command (like `npm install` or `python main.py`) is executed inside an ephemeral, strictly isolated Docker sandbox with `no-new-privileges` enabled. Your host filesystem and global binaries are never touched.

### What languages and frameworks does it support?
Currently, the `ProjectDetector` natively recognizes and configures sandboxes for **Node.js** and **Python** environments. However, the core verification architecture is entirely language-agnostic. As long as the error can be reproduced in a Docker container via bash, the agent can troubleshoot it.

### Do I have to pay to use DevFix?
The DevFix CLI itself is 100% free and open-source (MIT License). However, because it relies on a Large Language Model to power its reasoning engine, you must provide your own API key. You will only pay the standard token costs to your chosen provider (e.g., OpenAI, DeepSeek, or Groq). 

### What if I don't use OpenAI?
DevFix uses a flexible LLM Provider architecture. By default, it supports DeepSeek, OpenAI, Groq, and OpenRouter. You can easily switch providers by setting environment variables in your terminal:
```bash
export LLM_PROVIDER="groq"
export LLM_MODEL="llama3-70b-8192"
export LLM_API_KEY="gsk_..."
```

### Can it fix logic bugs in my application code?
While the agent *can* use its `patch` tool to rewrite source code files, DevFix is primarily optimized for **Environment and Configuration failures** (e.g., missing `.env` variables, port conflicts, missing system dependencies, broken `package.json` scripts, and module resolution errors). It is designed to solve the *"It works on my machine"* syndrome, not necessarily to write your business logic.

### How does the Docker sandboxing actually work?
DevFix creates an ephemeral container based on the runtime detected in your project (e.g., `node:20-alpine` or `python:3.9-slim`). It mounts your project directory as a read-write volume, but drops all root privileges using Docker's `--security-opt no-new-privileges` flag. When the agent is finished verifying the fix, the container is instantly destroyed, leaving your host machine safe and untainted.

### Will it delete my code or ruin my project?
No. DevFix is designed with extreme safety in mind. It cannot execute destructive system commands on your host filesystem. If it modifies a file using its internal patch tool, you can easily review the changes using `git diff` before committing them, as DevFix runs locally in your workspace.

### How long does a typical repair take?
Repair times vary based on the complexity of the issue and the speed of your chosen LLM. On average, a simple configuration fix (like a missing environment variable or port conflict) takes around **5–15 seconds** and 1 to 2 iterations. Complex cascading failures may take up to 60 seconds.

### Can I use my own local LLM (like Ollama)?
Yes! Because DevFix supports a `custom` LLM provider, you can point it to any OpenAI-compatible local API endpoint. Simply set `export LLM_PROVIDER="custom"` and `export LLM_BASE_URL="http://localhost:11434/v1"` (for Ollama) along with your local model name. This allows you to run DevFix entirely offline and for free!

### What happens if the AI gets stuck in an infinite loop?
DevFix has built-in loop prevention and strict token limits. It caps the maximum number of iterations the agent is allowed to make (the default is 10). If the agent cannot mathematically prove that the issue is fixed within that limit, it gracefully halts and returns a `MAX_ITERATIONS_EXCEEDED` error, preserving your API credits and time.
