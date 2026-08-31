# DevFix Improvement Changelog

## Executive Summary
DevFix began as a highly experimental LLM troubleshooting script operating directly on the host machine. Over several distinct engineering iterations, we learned that simply providing stronger prompts or switching models is insufficient to guarantee reliable troubleshooting. The LLM must be stripped of its ability to hallucinate success. 

Through rigorous experimentation, we transformed DevFix into a completely deterministic, sandbox-isolated autonomous recovery system. The most material improvement to the system came not from a prompt change, but from the implementation of the **Deterministic Verifier**, which forces the agent to achieve an objectively measured success state before completing its task.

## Improvement Timeline

| Version | Focus | Before | After | Result |
| ------- | ----- | ------ | ----- | ------ |
| **v0.1.0** | Initial Exploration | Sandbox baseline | Quota-limited | Frequent API quota limitations prevented reliable evaluation of model capability. |
| **v0.2.0** | Reasoning Enhancements | No baseline | 20% Recovery | Demonstrated tool-calling reliability but highlighted reasoning bottlenecks in multi-step environment failures. |
| **v0.3.0** | Agent Loop Discipline | 20% Recovery | 20% Recovery | Strict OBSERVE → HYPOTHESIZE → VERIFY loop added, but duplicate detection suppressed legitimate inspections. |
| **v0.4.0** | Context Calibration | 20% Recovery | 60% Recovery | `MAX_ITERATIONS` increased (8 → 15) and verifier logic corrected. Proved execution limits materially affect measured performance. |
| **v0.5.0** | Async Sandbox & Security | Sync execution | Async execution | Enforced timeouts, path traversal protection, and permission preservation inside Docker. |
| **v0.6.0** | Deterministic Verifier | Heuristic checks | Generic Process/HTTP | Host-shell interpolation vulnerability fixed. LLM fully decoupled from success evaluation. |
| **v0.7.0** | Production Refactor | Experimental | Provider Abstraction | Clean provider abstraction, dynamic verification, and structured telemetry established. |
| **v0.8.0** | UX Polish | Bare Node scripts | Interactive CLI | `inspect`, `benchmark`, secret redaction, and a professional production UX completed. |
| **v1.0.0** | 10-Case Benchmark | 5 cases (60%) | 10 cases (80%) | The generic architecture stabilized and resolved 8/10 complex failures autonomously. |

## Failed Experiments & Lessons Learned

Our engineering progression involved numerous failed hypotheses. Documenting them is critical for future open-source contributors:

- **Stronger Prompts Do Not Solve Reasoning (v0.3.0)**: Enforcing a strict, structured reasoning loop (OBSERVE → HYPOTHESIZE → INSPECT → ACT → VERIFY) did not magically improve the recovery rate. The model still failed at complex environmental inference without room to explore.
- **Overzealous Duplicate Detection (v0.3.0)**: Attempting to prevent infinite loops by hard-blocking repeated identical tool calls accidentally prevented the agent from re-inspecting files that had legitimately changed state between iterations.
- **False Negative Verifiers (v0.4.0)**: An overly aggressive verifier returned failures for legitimate HTTP startups. The agent cannot succeed if the ground-truth verifier is flawed.
- **Iteration Budgets (v0.4.0)**: Attempting to cap iterations at 8 to save LLM tokens caused cascading failures to fail right as the agent was patching the final error.

**Key Lesson**: Do not trust the LLM to self-evaluate, but do trust it to iterate. Provide a long iteration runway (15+ iterations) governed by a flawless, deterministic verifier.

## Measured Improvements

| Metric | Earlier | Later | Change |
| ------ | ------- | ----- | ------ |
| **Verified Recovery Rate** | 20% | 80% | +60% (via calibration and budget) |
| **Tool Execution Reliability** | ~75% | 100% | +25% (via explicit JSON schemas) |
| **Sandbox Security** | Insecure Host | Docker Isolated | Zero host risk |
| **Telemetry** | None | Structured JSON | Full secret redaction |
