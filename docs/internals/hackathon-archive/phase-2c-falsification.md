# Phase 2C: Falsification Tournament Results

## 1. Decision Matrix

| Candidate | Experiment / Focus | Hypothesis | Success Criterion | Primary Metric | Ground Truth | Baseline | Result | Evidence Grade | Agent Necessity | Reproducibility | Demo | Risk | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| #29 Dev Troubleshooter | Broken Dockerfile | Agent can fix env errors via terminal | App runs successfully | Time to fix / success rate | HTTP 200 OK | Google Search | SURVIVED | A | Very High | High (Docker) | 10 | Med | **🥇 FINALIST** |
| #11 Pentest Validator | Sandbox SQLi | Agent dynamically exploits custom vuln | Flag extracted | Verification rate | Known flag | Nessus/sqlmap | SURVIVED | A | High | High (Local VM) | 9 | Med | **🥈 FINALIST** |
| #7 Legacy Translator | Python -> JS | Agent uses compiler feedback to fix code | Code passes tests | Test pass rate | Human test suite | Zero-shot LLM | SURVIVED | B | High | High | 7 | Low | **🥉 FINALIST** |
| #3 Flaky Test Diagnoser| Race condition | Agent isolates non-deterministic failure | Root cause found | Accuracy | Known bug | 10x retry diff | FAILED | E | Very High | **Very Low** | 2 | High | **KILL** |
| #2 Dependency Analyzer | Breaking bump | Agent finds unlisted breaking change | Fix proposed | Correctness | Manual PR | Dependabot | FAILED | D | High | Low | 4 | High | **KILL** |
| #1 CI/CD Investigator | GH Actions break | Agent edits and pushes fix | Green build | Build status | CI Green | Log parser | FAILED | C | High | Low (Time) | 3 | High | **KILL** |

---

## 2. Candidates We Killed (The Kill Report)

### ☠️ Candidate #3: Flaky Test Root Cause Diagnoser
1. **Original Appeal:** Huge engineering pain point, massive agentic necessity (requires running tests iteratively).
2. **Falsification Experiment:** Attempt to create a synthetic flaky test that fails exactly 50% of the time for judging.
3. **What Happened:** Creating a "reliably flaky" test is an oxymoron. Environmental differences on a judge's machine mean the test might pass 100% of the time or fail 100% of the time, ruining the demonstration of the agent isolating non-determinism.
4. **Why it Failed:** It fails the Reproducibility test completely.
5. **Threatened Category:** Reproducibility (15 pts), Demo Potential.
6. **Fixable?** No. Flakiness is inherently tied to underlying host hardware/timing.

### ☠️ Candidate #2: Dependency Update Risk Analyzer
1. **Original Appeal:** Better than Dependabot; prevents runtime breaks.
2. **Falsification Experiment:** Feed the agent a breaking change that is *not* documented in the changelog, forcing it to write tests to find the break.
3. **What Happened:** Writing comprehensive regression tests for third-party libraries without human context is beyond the scope of a 5-minute hackathon agent.
4. **Why it Failed:** We cannot establish objective Ground Truth. If the agent says "It's safe", we have no quick way to prove it's wrong in a demo.
5. **Threatened Category:** Measured Improvement (15 pts), End-to-End Quality (20 pts).
6. **Fixable?** Too complex for a 5-minute demonstration.

### ☠️ Candidate #1: CI/CD Build Failure Investigator
1. **Original Appeal:** Solves a huge DevOps pain point.
2. **Falsification Experiment:** Have the agent fix a GitHub Action and wait for the remote CI to pass.
3. **What Happened:** Remote CI/CD takes 2-5 minutes per run. An iterative loop (e.g., 3 attempts) will take 15 minutes.
4. **Why it Failed:** Kills the 5-minute demo rule entirely. We would have to heavily edit the video, looking suspicious.
5. **Threatened Category:** Reproducibility (15 pts).
6. **Fixable?** Only by running a local mock CI runner (e.g., `act`), which adds massive dependency overhead for the judges.

---

## 3. The Survivors (Top 3 Finalists)

### 🥇 Finalist 1: Local Dev Environment Troubleshooter (Candidate #29)
1. **Why it survived:** Unbeatable reproducibility (runs entirely inside a local Docker sandbox). Highest possible agentic necessity (terminal loops).
2. **Strongest evidence:** Pass/Fail is binary. Either the Docker container starts and returns HTTP 200, or it doesn't.
3. **Biggest remaining uncertainty:** Preventing the LLM from getting trapped in an infinite `npm cache clean` loop.
4. **Most dangerous criticism:** "It's a security nightmare that will `rm -rf` my machine."
5. **Next experiment:** Build a strict command-whitelist sandbox wrapper.

### 🥈 Finalist 2: Security Pentest Report Validator (Candidate #11)
1. **Why it survived:** Huge "wow factor" demo. Highly objective ground truth (capturing a flag).
2. **Strongest evidence:** The agent successfully finding a flag in a custom vulnerable local app that automated tools like Nessus might miss.
3. **Biggest remaining uncertainty:** LLM context windows overflowing with huge Nmap/Curl outputs.
4. **Most dangerous criticism:** "It's just a slow, expensive version of sqlmap."
5. **Next experiment:** Prove the agent can dynamically bypass a simple WAF that blocks sqlmap.

### 🥉 Finalist 3: Legacy Code Translator & Verifier (Candidate #7)
1. **Why it survived:** Iterative compiler feedback loop is the textbook definition of agentic workflows.
2. **Strongest evidence:** 100% test pass rate on the translated code.
3. **Biggest remaining uncertainty:** Where does the ground truth (the test suite) come from?
4. **Most dangerous criticism:** "If the agent writes its own tests, it will just write tests that pass its broken translation."
5. **Next experiment:** Determine if the user MUST supply the legacy test suite (which makes the product slightly less magical, but perfectly reproducible).
