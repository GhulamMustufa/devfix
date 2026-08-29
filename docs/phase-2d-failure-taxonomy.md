# Phase 2D: Empirical Failure Taxonomy

*Note: As autonomous agent execution was NOT EXECUTED due to infrastructure limitations, this taxonomy records only actual Baseline failures.*

## Actual Baseline Failures

1. **Incorrect Diagnosis / Premature Conclusion**
   *   **Candidate:** Local Dev (All cases), CI/CD (All cases except typo)
   *   **Cause:** The baseline one-shot LLM approach frequently guesses the wrong root cause based on limited initial stack traces, because it lacks the ability to run exploratory commands (`ls`, `lsof`, `cat package.json`) to confirm its hypothesis before suggesting a fix.

2. **Tool Misuse / Context Loss**
   *   **Candidate:** Legacy Translator (Cases 2-5)
   *   **Cause:** One-shot translation fails on language-specific edge cases (e.g., Python `//` vs JS `/`). Without the compiler and test feedback loop to catch these errors, the baseline silently outputs broken code.

3. **Missing Evidence / False Negatives**
   *   **Candidate:** Pentest Validator (All cases)
   *   **Cause:** A conventional static scanner or one-shot prompt cannot dynamically adapt to WAF blocks or parse DOM structure changes iteratively, leading to false negatives on slightly obfuscated targets.

## Simulated/Inferred Agent Failures
*(These failures were hypothesized during the Phase 2D simulation but remain empirically unverified).*

1. **Resource Exhaustion Loop (Local Dev):** The agent repeatedly tries to modify memory limits inside a Docker container restricted by host memory.
2. **Timeout on Timing Attacks (Pentest):** The agent burns through tokens and time trying to orchestrate precise `sleep(5)` SQL injections over a jittery network.
3. **Hallucinated Evidence (Pentest):** The agent misinterprets a WAF 200 OK block page as a successful exploit.
4. **Incorrect Diagnosis (Legacy):** The agent attempts to map synchronous Threading directly into Web Workers without architectural refactoring.
5. **False Negative (CI/CD):** The agent fails to reproduce a flaky race condition locally and assumes the build is fixed.
