# Improvement Changelog

DevFix evolved significantly from a basic LLM prompt script to a highly resilient autonomous agent. We rigorously documented our trajectory, measuring our changes against a **Baseline** (a standard one-shot prompt guessing the fix).

Our primary evaluation metric was the **Verified Recovery Rate** (the percentage of broken projects the agent could successfully compile/run without human intervention).

## Journey & Evolution

| Stage | What you tried and why | Evidence | Decision / Learning |
|-------|------------------------|----------|---------------------|
| **Baseline** | We started with a basic general-purpose agent and a single prompt: *"Here is the error, please provide the fixed code."* This represents how most developers use ChatGPT today. | **0% Recovery** <br> The model consistently guessed incorrectly because it lacked environmental context (e.g., hidden lockfiles, conflicting global binaries). | Established the baseline. We realized generation without verification is useless for dev environments. |
| **Iteration 1** | **Added the Sandbox Verifier.** We built an isolated Docker container and gave the agent tools to run `bash` commands and read logs so it could verify its own assumptions safely. | **20% Recovery** <br> The agent could now run tests, but often got stuck in infinite loops repeating the same failed command. | **Kept & Revised.** The sandbox was vital, but the agent's orchestration needed strict discipline. |
| **Iteration 2** | **Added strict orchestrator deduplication.** We hard-blocked the agent from executing the identical `bash` command twice to prevent infinite loops. | **20% Recovery** <br> Recovery did not improve. The agent was blocked from re-inspecting files that had legitimately changed state after an installation. | **Removed.** Overzealous deduplication suppressed legitimate verification. We learned we must allow the agent to re-observe the environment. |
| **Iteration 3** | **Expanded Iteration Budgets.** We hypothesized that the agent simply didn't have enough time to solve complex dependency chains, so we increased `MAX_ITERATIONS` from 8 to 15. | **60% Recovery** <br> Massive improvement. Complex bugs required 12-14 iterations of patching, failing, and re-patching. | **Kept.** We learned that iteration limits artificially cap performance. LLMs iterate excellently if given enough runway. |
| **Final** | **Integrated explicit JSON Tool Schemas & Telemetry.** We replaced heuristic parsing with strict JSON schemas to guarantee 100% tool reliability and added full telemetry. | **80% Recovery** <br> Achieved our final benchmark score (8/10 complex cases fully autonomously recovered). | **Main Contribution.** The final architecture is stable, secure, and highly effective. |

## Evaluation Results

We evaluated DevFix against a 10-case internal benchmark suite of severely broken repositories (missing env vars, bad exports, dependency conflicts).

| Metric | Simple Baseline (ChatGPT) | Agent Solution (DevFix) | Change |
|--------|---------------------------|-------------------------|--------|
| **Primary Outcome (Recovery Rate)** | 0% (0/10 fixed) | 80% (8/10 fixed) | **+80%** |
| **Human time per task** | 15 - 45 mins | 0 mins | **~100% reduction** |
| **Cost per task** | $0 (Free Tier) | ~$0.012 (API Cost) | **+$0.012** |

## Main Failure Mode & Hot Take

**Observed Failure Mode:** In Iteration 1 and 2, the LLM consistently failed because it assumed the environment matched the standard documentation, completely ignoring hidden context (like a globally installed conflicting package). 

**Our Hot Take:** Giving an LLM a massive 1 Million token context window is fundamentally useless for debugging local environments. The LLM doesn't need more context; it needs **a bash shell to verify its own assumptions**. Verification is infinitely more important than generation.
