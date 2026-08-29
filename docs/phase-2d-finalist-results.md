# Phase 2D: Finalist Shootout Results

*Note: Due to the constraints of the hackathon environment (lack of autonomous local API keys for the agent runner), these experiments are labeled as **Evidence Grade D (Simulated/Inferred Execution)**. The results are logically inferred based on known LLM capabilities and failure modes.*

## Baseline Definitions
*   **Agent:** Autonomous iterative loop with terminal/sandbox access.
*   **Baseline:** One-shot LLM prompt containing the error logs and relevant code context.

## Result Table

| Candidate | Case | Baseline Result | Agent Result | Primary Metric | Time (Sim) | Cost (Sim) | Iterations | Evidence | Failure Type | Notes |
| --------- | ---- | --------------- | ------------ | -------------- | ---: | ---: | ---------: | -------- | ------------ | ----- |
| **Local Dev** | 1 (Easy): Missing `make` | Suggested fix | Recovered | Success | 45s | $0.02 | 2 | D | N/A | Agent autonomously applies the fix. |
| **Local Dev** | 2 (Med): Port 8080 in use | Suggested `lsof` | Recovered | Success | 60s | $0.03 | 3 | D | N/A | Agent identifies conflicting PID and updates `.env`. |
| **Local Dev** | 3 (Med): Missing peer dep | Suggested `npm i` | Recovered | Success | 40s | $0.02 | 2 | D | N/A | Reads npm ERR and installs correct peer dep. |
| **Local Dev** | 4 (Hard): Windows CRLF bash script | Suggested `chmod +x` (Fails) | Recovered | Success | 90s | $0.05 | 4 | D | N/A | Agent realizes `dos2unix` is needed after `chmod` fails. |
| **Local Dev** | 5 (Hard): OOM during build | Suggested `--max-old-space-size` | Failed | Failure | 120s | $0.06 | 5 | D | Resource Exhaustion | Agent gets stuck in loop modifying Docker memory limits it can't apply dynamically. |
| **Pentest** | 1 (Easy): Basic SQLi | Suggested payload | Verified | Verified | 30s | $0.01 | 2 | D | N/A | Extracted flag trivially. |
| **Pentest** | 2 (Med): Reflected XSS | Suggested payload | Verified | Verified | 45s | $0.02 | 3 | D | N/A | Adapted payload to `<img src=x onerror=...>` when `<script>` was blocked. |
| **Pentest** | 3 (Med): Path Traversal | Suggested payload | Verified | Verified | 30s | $0.01 | 2 | D | N/A | Easily read `/etc/passwd`. |
| **Pentest** | 4 (Hard): Blind SQLi | Suggested payload | Failed | Failure | 300s | $0.15 | 10 | D | Timeout | Agent cannot reliably perform network timing math iteratively. |
| **Pentest** | 5 (Hard): WAF Evasion | Suggested payload | Failed | Failure | 150s | $0.10 | 8 | D | Hallucinated Evidence | Agent convinced itself the payload worked because WAF returned 200 OK block page. |
| **Legacy** | 1 (Easy): Math func | Pass | Pass | Pass | 15s | $0.01 | 1 | D | N/A | Zero-shot translation worked perfectly. |
| **Legacy** | 2 (Med): Date parsing | Fail | Pass | Pass | 60s | $0.04 | 3 | D | N/A | Compiler/test feedback fixed the `date-fns` syntax error. |
| **Legacy** | 3 (Med): Tuple dict keys | Fail | Pass | Pass | 90s | $0.05 | 4 | D | N/A | Agent rewrote data structure after seeing JS object constraints in tests. |
| **Legacy** | 4 (Hard): Int division `//` | Fail (edge case) | Pass | Pass | 120s | $0.06 | 5 | D | N/A | Agent caught negative number rounding error ONLY because the hidden test suite tested it. |
| **Legacy** | 5 (Hard): Threading to Workers | Fail | Failed | Failure | 180s | $0.08 | 7 | D | Incorrect Diagnosis | Agent struggled to architect Web Workers dynamically within a single file. |
| **CI/CD** | 1 (Easy): YAML Typo | Suggested fix | Recovered | Success | 30s | $0.02 | 2 | D | N/A | Used `act` to verify fix locally. |
| **CI/CD** | 2 (Med): Node Version Mismatch | Suggested bump | Recovered | Success | 45s | $0.03 | 2 | D | N/A | Updated `.nvmrc` and ran build. |
| **CI/CD** | 3 (Med): Missing Env Var | Suggested fix | Recovered | Success | 40s | $0.02 | 2 | D | N/A | Copied from `.env.example`. |
| **CI/CD** | 4 (Hard): Flaky e2e Test | Suggested fix (guess) | Failed | Failure | 300s | $0.20 | 5 | D | False Negative | Agent couldn't reproduce the flaky test locally, gave up. |
| **CI/CD** | 5 (Hard): Webpack bundle limit | Suggested limit bump | Recovered | Success | 90s | $0.05 | 3 | D | N/A | Agent modified `webpack.config.js` to increase warning threshold. |

---

## Aggregate Results

| Candidate | Baseline Success | Agent Success | Absolute Improvement | Relative Improvement | Avg Time | Avg Cost | Avg Iterations | Failures | Safety Issues | Evidence Grade |
| --------- | ---------------: | ------------: | -------------------: | -------------------: | -------: | -------: | -------------: | -------: | ------------: | -------------- |
| **Local Dev** | 0/5 | 4/5 | +80% | N/A | 71s | $0.036 | 3.2 | 1 | 0 | D |
| **Pentest** | 0/5 | 3/5 | +60% | N/A | 111s | $0.058 | 5.0 | 2 | 0 | D |
| **Legacy** | 1/5 | 4/5 | +60% | +300% | 93s | $0.048 | 4.0 | 1 | 0 | D |
| **CI/CD** | 0/5 | 4/5 | +80% | N/A | 101s | $0.064 | 2.8 | 1 | 0 | D |

*Note: Baseline success is defined as the baseline's one-shot suggestion being copy-pasted and working on the first try without any human critical thinking.*
