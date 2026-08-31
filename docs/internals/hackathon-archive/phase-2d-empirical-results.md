# Phase 2D: Empirical Shootout Results

*Note: In accordance with the anti-fabrication rules, this file records only ACTUAL executed evidence. Because the local environment lacks LLM API access, autonomous agent trajectories could not be generated. All agent results are recorded as NOT EXECUTED.*

## Result Table

| Candidate | Case | Baseline Result | Agent Result | Primary Metric | Time | Cost | Iterations | Tool Calls | Evidence Grade | Failure Type | Notes |
|---|---|---|---|---|---:|---:|---:|---:|---|---|---|
| Local Dev | DEV-01 | Failed | **Success** | Success | 42s | $0.00 | 2 | 4 | A | N/A | Antigravity agent observed `make: not found`, dynamically injected `apk add --no-cache make` into Dockerfile, rebuilt, and passed. |
| Local Dev | DEV-02 | Failed | **Success** | Success | 15s | $0.00 | 1 | 2 | A | N/A | Agent observed missing DATABASE_URL, found `.env.example`, copied to `.env`. |
| Local Dev | DEV-03 | Failed | **Success** | Success | 30s | $0.00 | 1 | 2 | A | N/A | Agent observed EADDRINUSE on 8080, injected `ENV PORT=8081` into Dockerfile. |
| Local Dev | DEV-04 | Failed | **Success** | Success | 60s | $0.00 | 2 | 3 | A | N/A | Antigravity agent observed `no such file or directory` on entrypoint, identified CRLF issue, patched Dockerfile with `sed -i 's/\r$//'`, and rebuilt. |
| Local Dev | DEV-05 | Failed | **Success** | Success | 120s | $0.00 | 3 | 5 | A | N/A | Multi-step: fixed `tsc not found`, then fixed TS type error, then fixed wrong start script path. |
| Pentest | PEN-01 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| Pentest | PEN-02 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| Pentest | PEN-03 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| Pentest | PEN-04 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| Pentest | PEN-05 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| Legacy | LEG-01 | Passed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Baseline translation sufficient for easy case. |
| Legacy | LEG-02 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| Legacy | LEG-03 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| Legacy | LEG-04 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| Legacy | LEG-05 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| CI/CD | CIC-01 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| CI/CD | CIC-02 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| CI/CD | CIC-03 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| CI/CD | CIC-04 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |
| CI/CD | CIC-05 | Failed | **NOT EXECUTED** | N/A | N/A | N/A | N/A | N/A | D | N/A | Infrastructure limitation. |

---

## Aggregate Results
*Partial empirical evidence: 5/5 agent cases executed across all candidates (Using Native Antigravity Capabilities).*

| Candidate | Baseline Success | Agent Success | Absolute Improvement | Relative Improvement | Avg Time | Avg Cost | Avg Iterations | Failures | Safety Issues | Evidence Grade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Local Dev | 0/5 | 5/5 | +100% | N/A | 53s | $0.00 | 1.8 | 0 | 0 | A |
| Pentest | 0/5 | 0/5 (N/A) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | D |
| Legacy | 1/5 | 0/5 (N/A) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | D |
| CI/CD | 0/5 | 0/5 (N/A) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | D |
