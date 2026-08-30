# DevFix Improvement Changelog

## Executive Summary
DevFix began as a highly experimental LLM troubleshooting script operating directly on the host machine with a crude, self-terminating loop. Over several distinct engineering phases, we learned that providing stronger prompts or switching models is insufficient to guarantee reliable troubleshooting. The LLM must be stripped of its ability to hallucinate success. 

Through rigorous experimentation, we transformed DevFix into a completely deterministic, sandbox-isolated autonomous recovery system. The most material improvement to the system came not from a prompt change, but from the implementation of the **Deterministic Verifier**, which forced the agent to achieve an objectively measured success state before completing its task.

## Improvement Timeline

| Phase | Experiment / Change | Before | After | Result | Evidence |
| ----- | ------------------- | ------ | ----- | ------ | -------- |
| **3F** | Gemini Free Tier experiment | Sandbox baseline | Quota-limited | Inconclusive | `docs/` artifacts; frequent API quota limitations prevented reliable evaluation of model capability. |
| **3G** | OpenAI gpt-4o-mini | No baseline | 1/5 Verified | 20% Recovery | Demonstrated tool-calling reliability but highlighted reasoning bottlenecks in multi-step environment failures. |
| **3H** | Prompt/Controller Discipline | 1/5 Verified | 1/5 Verified | No improvement | Strict OBSERVE → HYPOTHESIZE → VERIFY loop added, but duplicate detection suppressed legitimate inspections. |
| **3I** | DeepSeek Model Swap | 1/5 Verified | 1/5 Verified | Iteration blocked | Swapped to DeepSeek; hit hard DEV-05 iteration budget limits (8 iterations) and DEV-03 verifier constraints. |
| **3J** | Benchmark Calibration | 1/5 Verified | 3/5 Verified | 60% Recovery | MAX_ITERATIONS increased (8 → 15) and DEV-03 verifier corrected. Proved evaluation design materially affects measured performance. |
| **4B** | Async Sandbox & Security | `execSync` execution | Async execution | Hardened | Enforced timeouts, path traversal protection, and permission preservation inside Docker. |
| **4C** | Deterministic Verifier | Heuristic checks | Generic Process/HTTP | Hardened | Host-shell interpolation vulnerability discovered and fixed. LLM fully decoupled from success evaluation. |
| **4D** | Production Agent Controller | Experimental scripts | Provider Abstraction | Stabilized | Clean provider abstraction, dynamic verification, and structured telemetry established. |
| **4E** | Production CLI | Bare Node scripts | Interactive CLI | Polished | `doctor`, `demo`, secret redaction, and a professional production UX completed. |
| **4F** | Production Benchmark | 3/5 (Experimental) | 3/5 (Production) | 60% Recovery | Production bugs (e.g. duplicate action state handling) fixed; validated that architecture refactoring preserved capability. |
| **5A** | 10-Case Benchmark Expansion | 5 cases (3/5) | 10 cases (7/10) | 70% Recovery | 5 new, distinct failure modes added (DEV-06–DEV-10). The generic architecture resolved 4/5 new cases autonomously. |

## Failed Experiments & Lessons Learned

Our engineering progression involved numerous failed hypotheses. Documenting them is critical:

- **Stronger Prompts Do Not Solve Reasoning (Phase 3H)**: Enforcing a strict, structured reasoning loop (OBSERVE → HYPOTHESIZE → INSPECT → ACT → VERIFY) on `gpt-4o-mini` did not improve the verified recovery rate. The model still failed at complex environmental inference.
- **Quota Limits Break Agents (Phase 3F)**: The Gemini Free Tier experiment proved that autonomous agents require significant API bandwidth. Rate limiting fundamentally broke the ReAct loop.
- **Overzealous Duplicate Detection (Phase 3H)**: Attempting to prevent infinite loops by hard-blocking repeated identical tool calls accidentally prevented the agent from re-inspecting files that had legitimately changed state between iterations.
- **False Negative Verifiers (Phase 3I)**: An overly aggressive verifier on DEV-03 returned failures for legitimate HTTP startups. The agent cannot succeed if the ground-truth verifier is flawed.
- **Iteration Budgets (Phase 3I)**: Attempting to cap iterations at 8 to save costs caused cascading failures (like DEV-05) to fail right as the agent was patching the final error.

**Key Lesson**: Do not trust the LLM to self-evaluate, but do trust it to iterate. Provide a long iteration runway (15+ iterations) governed by a flawless, deterministic verifier.

## Measured Improvements

| Metric | Earlier | Later | Change |
| ------ | ------- | ----- | ------ |
| **Verified Recovery Rate (5-case)** | 1/5 (20%) - Phase 3G | 3/5 (60%) - Phase 3J/4F | +40% (via calibration and budget) |
| **Verified Recovery Rate (10-case)**| 3/5 (60%) - Phase 4F | 7/10 (70%) - Phase 5A | Expanded baseline capability |
| **Maximum Iteration Budget** | 8 (Phase 3I) | 15 (Phase 3J) | +7 iterations (enabled cascading fixes) |
| **Safety Violations (Host Leakage)**| Unprotected `execSync` | 0 (Docker + execFile) | Complete isolation achieved |
| **Average Repair Latency** | Not measured | ~5s to 90s (Phase 5A) | Varies heavily by case complexity |
| **Token Usage & Cost** | Not measured | Not measured | Depended entirely on iteration depth |
| **Tool Reliability** | Occasional JSON errors | ~100% | Handled via Controller malformed-recovery |

*(Note: The preservation of the 3/5 recovery rate between the experimental Phase 3J and the production Phase 4F demonstrates that our production security refactoring successfully preserved agent capability without regressions).*

## Primary Metric

**PRIMARY METRIC**: Verified Recovery Rate
*Definition*: The number of benchmark cases where the deterministic verifier independently confirmed the environment was successfully repaired divided by the total number of benchmark cases.

## Secondary Metrics
1. Tool-call reliability (ability to gracefully recover from malformed JSON).
2. Average repair iterations (efficiency of the diagnostic path).
3. Repair latency.
4. Token usage/cost.
5. Safety violations (host isolation).

## Engineering Lessons
Building a reliable troubleshooting agent requires accepting that **LLMs will hallucinate success**. The most critical component of the architecture is not the prompt or the LLM provider, but the **Deterministic Boundary**. When you strip the LLM of its ability to say "I'm done" and instead force it to satisfy a programmatic health-check, the LLM stops guessing and starts engineering. 

Furthermore, robust security (Docker isolation, `execFile` parameterization, credential scrubbing) is non-negotiable. Autonomous agents execute arbitrary commands generated by unpredictable models; they cannot be trusted with raw host access.

## Current State
DevFix is a validated, production-ready autonomous troubleshooting CLI. It relies on a strictly decoupled architecture:
1. **Intelligence**: `deepseek-chat` Provider
2. **Execution**: Secure Docker Sandbox & Tool Registry
3. **Validation**: Generic Deterministic Verifier

It has been rigorously benchmarked against 10 distinct, reproducible local development failures, achieving a validated **70% (7/10) Verified Recovery Rate**. The codebase is fully unit-tested (36/36 passing) and cleanly isolated from host security vulnerabilities. 

All evidence, runs, and artifacts supporting these conclusions are preserved in `artifacts/`, `docs/`, and `tests/`.
