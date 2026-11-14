# Frequently Asked Questions (FAQ)

### How is DevFix different from Cursor, ChatGPT, or GitHub Copilot?
Standard LLMs and AI code editors generate code suggestions and *hope* that they work, leaving you to manually run the code, hit a compilation error, and paste the traceback back to the chat. 

**DevFix is a deterministic autonomous verifier.** It doesn't just guess; it spins up a secure, isolated staging sandbox, inspects the codebase, applies targeted edits, executes your actual build/test commands, and proves that the fix works before completing its work.

---

### Is DevFix safe to run on my local machine?
**Yes.** DevFix enforces strict defense-in-depth security:
1. **Isolated Staging:** DevFix **never** mounts your real project directory as a writable Docker volume. Repairs happen inside a temporary staging copy.
2. **Explicit Approval:** You are presented with a unified diff and must explicitly approve changes (`[y/N]` or `--yes`) before anything is written back to your project.
3. **Rollback Snapshots:** Before touching any file, DevFix saves a rollback snapshot (`devfix rollback`).
4. **Hardened Docker Containers:** Containers execute as a non-root user (`--user 1000:1000`), drop all Linux capabilities (`--cap-drop=ALL`), disable network by default (`--network=none`), and enforce strict CPU and memory limits.

---

### What languages and package managers are supported?
DevFix features deep environment detection for:
- **Node.js:** npm, pnpm, yarn, bun, Corepack (`packageManager` declarations in `package.json`), TypeScript (`tsconfig.json`), and monorepos (`pnpm-workspace.yaml`, `lerna.json`, `workspaces` arrays).
- **Python:** pip, uv, Poetry, Pipenv, Conda, and virtual environments (`.venv`, `venv`).
- **Mixed / Polyglot:** Detects repositories containing both frontend and backend stacks.

---

### Can DevFix fix my project if it requires downloading new dependencies?
By default, DevFix disables container networking (`--network=none`) to protect you from untrusted data exfiltration. If your project genuinely needs to fetch new packages from npm or PyPI, simply provide the `--allow-network` flag:

```bash
devfix fix . --verify "npm test" --allow-network
```

---

### What happens if I don't like the changes DevFix made?
You can revert them immediately! Every approved repair creates a rollback snapshot. To restore your project to its exact pre-repair state:

```bash
# Restore latest repair
devfix rollback

# Or view history and restore a specific repair
devfix history
devfix rollback <rollbackId>
```

DevFix also checks if files were edited after the repair before rolling back, preventing accidental overwriting of recent work.

---

### What LLM providers can I use?
DevFix supports:
- **Google Gemini:** `LLM_PROVIDER="gemini"` with `gemini-3.8-flash` (recommended).
- **DeepSeek:** `LLM_PROVIDER="deepseek"` with `deepseek-chat`.
- **OpenAI:** `LLM_PROVIDER="openai"` with `gpt-4o` or `gpt-4o-mini`.
- **Groq:** `LLM_PROVIDER="groq"` with `llama-3.3-70b-versatile`.
- **Ollama (Free / Local):** `LLM_PROVIDER="ollama"` with local models like `llama3.2` — no API key needed!
- **Custom Local Endpoints:** Any OpenAI-compatible server (vLLM, LM Studio, LocalAI).

---

### What does DevFix NOT currently support?
To maintain transparency and trust:
1. **Windows Native Containers:** DevFix requires Docker Desktop with Linux containers (WSL2 on Windows).
2. **GUI / Desktop Applications:** DevFix is optimized for headless backend, web, CLI, library, and microservice builds, not native desktop UI frameworks.
3. **Unbounded Code Generation:** DevFix is designed to diagnose and repair broken environments and configuration errors, not write entire application features from scratch.
4. **Offline Package Installation without `--allow-network`:** If a missing package is not cached locally, network access must be explicitly permitted.

---

### Can I opt out of telemetry?
**Yes.** DevFix only records local trajectory logs to help you review the agent's work. It never transmits telemetry to external analytics servers. You can completely disable local run recording by passing `--no-telemetry` or setting `DEVFIX_TELEMETRY=0` or `DO_NOT_TRACK=1`.

---

### What happens if the AI gets stuck in an infinite loop?
DevFix enforces strict limits:
- Maximum 15 iterations per repair run.
- Loop and duplicate action detection (halts if the agent repeats identical tool calls).
- Command-level execution timeouts.
- Signal cancellation: pressing `Ctrl+C` cleanly aborts the agent immediately without corrupting your files.
