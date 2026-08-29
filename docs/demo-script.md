# DevFix Demo Script

This script is designed for a 3-5 minute live presentation of DevFix for hackathon judging.

## 0:00–0:30 — Problem
**Speaker:**
> "Local development failures are incredibly common and almost always environment-specific. When developers run into these issues, they often turn to LLM coding agents. But LLMs only *suggest* fixes—they don't prove they work, which often leads to time wasted on hallucinations."

## 0:30–1:00 — Architecture
**Speaker:**
> "DevFix solves this by replacing blind suggestions with **Verified Autonomous Recovery**. The agent investigates the broken codebase, applies repairs using structured tools inside a secure, isolated Docker sandbox. The critical piece is the **Deterministic Verifier**—the LLM has no authority to say 'I fixed it'. It has to mathematically prove to the verifier that the environment boots successfully before it stops."

*(Show `docs/architecture.md` diagram briefly if applicable)*

## 1:00–2:30 — Live DEV-04 (Missing Native Dependency)
**Speaker:**
> "Let's run a live demo. We'll use benchmark case `DEV-04`, where a Node.js project fails to build because it relies on a native dependency that requires Python, which isn't installed."

**Action:** Run the command in terminal:
```bash
node bin/devfix demo DEV-04
```

**Speaker:**
> "Watch the output. The agent investigates the Dockerfile and `package.json`. It realizes the build script relies on `node-gyp`. It patches the dependencies, runs the build, and then the external Verifier takes over. The Verifier runs the script, confirms a 0 exit code, and explicitly flags the repair as successful."

*(Wait for the command to finish and show the ✓ Repair successful screen)*

## 2:30–3:30 — Live DEV-05 (Cascading Failure)
**Speaker:**
> "Now let's look at `DEV-05`, a multi-step cascading failure. Here, we are missing the `typescript` compiler entirely, and once that's fixed, we will hit a strict-mode compilation type error in the code."

**Action:** Run the command in terminal:
```bash
node bin/devfix demo DEV-05
```

**Speaker:**
> "Notice how DevFix handles this iterative process. It will first install typescript, but when it attempts to start the server again, the Deterministic Verifier blocks it and kicks it back with the exact compilation error. DevFix reads the error, patches the code, and passes the verifier on the second try."

*(Wait for the command to finish)*

## 3:30–4:00 — Evidence & Benchmarks
**Speaker:**
> "We've run this system against a rigorous benchmark of 5 diverse local development failure profiles. We achieved a **60% verified recovery rate (3/5)**. Crucially, the 2 failures hit the iteration limits—our deterministic verifier perfectly protected the system from claiming false successes."

**Action:** Briefly show `artifacts/example-run.json` to highlight the scrubbed, perfectly structured telemetry that records the tool executions.

## Final Message
**Speaker:**
> "The key idea isn't that the LLM always gets the answer right on the first try. The key idea is that DevFix creates a controlled environment where the agent can investigate, act, and then has to *prove* that its repair actually worked."
