# Phase 2B: Adversarial Ranking Review

## Part 1: Brutal Interrogation of the Current Top 10

### 1. Local Dev Environment Troubleshooter (Candidate 29)
1. **Agent Necessary?** Yes. Fixing environments requires a dynamic observation-action loop (run -> fail -> edit -> rerun).
2. **Deterministic tool sufficient?** No, environment errors are infinitely varied.
3. **% Agentic:** 90%.
4. **Baseline Fair?** Yes (comparing against a human Googling errors).
5. **10+ Cases?** Yes (10 deliberately broken Docker environments).
6. **Ground Truth?** Yes (the app successfully returning HTTP 200).
7. **Objective Measurement?** Yes (Success rate / Time to fix).
8. **Reproducible?** Yes, via Docker.
9. **5-min Demo?** Yes, highly visual terminal action.
10. **Strongest Criticism:** "It's a security nightmare. It could run `rm -rf /` or leak credentials."
11. **Assumption vs Evidence:** Assuming the LLM won't get trapped in infinite retry loops (e.g., `npm cache clean` over and over).
12. **Lose 10+ points if:** Judges can't safely run it on their own machines without fear.
13. **Minimum Viable:** Fixes missing dependencies in a single `package.json`.
14. **Maximum Realistic:** Fixes complex `docker-compose` network routing issues.
15. **Complexity Risk:** Medium (sandboxing is hard).
16. **Existing Tools:** GitHub Copilot in the CLI (though it requires human confirmation per command).
17. **Differentiation:** Fully autonomous execution loop, not just a command suggester.
18. **Hot Take:** LLMs are superior at debugging simply because they don't experience fatigue when reading 5,000 lines of terminal vomit.
19. **Biggest Unknown:** Safely catching destructive commands before execution.
20. **Validation Experiment:** Build a minimal bash-tool agent and see if it can fix a broken Python script without human intervention.

### 2. Medical Trial Eligibility Matcher (Candidate 17)
1. **Agent Necessary?** **NO.** This is just complex text-classification/RAG. A single zero-shot prompt with a large context window does the exact same thing.
2. **Deterministic tool sufficient?** No, but a non-agentic LLM is.
3. **% Agentic:** <10%.
4. **Baseline Fair?** Yes.
5. **10+ Cases?** Yes.
6. **Ground Truth?** Yes, clinician labels.
7. **Objective Measurement?** Yes, F1 score.
8. **Reproducible?** Yes.
9. **5-min Demo?** Boring (just processing text).
10. **Strongest Criticism:** "This is an AI hackathon from 2022. There's no agentic workflow here, just data parsing."
11. **Assumption vs Evidence:** Assuming multi-step reasoning helps, when a single pass might be better.
12. **Lose 10+ points if:** Judges realize it's a glorified wrapper around an API request.
*(Note: Flagged for removal from Top 10)*

### 3. Security Pentest Report Validator (Candidate 11)
1. **Agent Necessary?** Yes. Needs to iteratively use tools (nmap, curl, sqlmap) based on intermediate outputs.
2. **Deterministic tool sufficient?** No, vulnerability exploitation requires dynamic adaptation.
3. **% Agentic:** 80%.
4. **Baseline Fair?** Yes.
5. **10+ Cases?** Yes (OWASP Juice Shop flags).
6. **Ground Truth?** Yes (getting the exploit flag).
7. **Objective Measurement?** Yes.
8. **Reproducible?** Yes, if the vulnerable app is containerized.
9. **5-min Demo?** Excellent.
10. **Strongest Criticism:** "It's just blindly trying pre-written Metasploit payloads until one works."
11. **Assumption vs Evidence:** Assuming the agent can actually reason about the vulnerability rather than just brute-forcing.
12. **Lose 10+ points if:** The exploits are too simplistic or it breaks the sandbox.
13. **Minimum Viable:** Verifies a simple XSS payload.
14. **Maximum Realistic:** Chains two vulnerabilities together (e.g., SSRF to LFI).
15. **Complexity Risk:** High.
16. **Existing Tools:** Automated vulnerability scanners (Nessus).
17. **Differentiation:** Proves exploitability dynamically, eliminating false positives.
18. **Hot Take:** 90% of vendor pentest reports are false positives that waste developer time.
19. **Biggest Unknown:** Can an LLM handle the massive context of raw network responses?
20. **Validation Experiment:** See if an agent can execute a blind SQLi with basic curl tools.

### 4. Legacy Code Translator & Verifier (Candidate 7)
1. **Agent Necessary?** Yes, for the Write -> Test -> Fix loop.
2. **Deterministic tool sufficient?** No.
3. **% Agentic:** 70%.
4. **Baseline Fair?** Yes (vs zero-shot translation).
5. **10+ Cases?** Yes.
6. **Ground Truth?** Yes (unit tests passing).
7. **Objective Measurement?** Yes.
8. **Reproducible?** Highly.
9. **5-min Demo?** Strong.
10. **Strongest Criticism:** "If the original code has no tests, your agent just hallucinates tests that pass the wrong behavior."
11. **Assumption vs Evidence:** Assuming we can reliably auto-generate ground-truth tests for legacy code.
12. **Lose 10+ points if:** The auto-generated tests don't actually cover edge cases.
13. **Minimum Viable:** Translates a standalone Python script to Go.
14. **Maximum Realistic:** Translates a script with file I/O and mocks the side effects.
15. **Complexity Risk:** Medium.
16. **Existing Tools:** AWS CodeWhisperer translation tools.
17. **Differentiation:** The iterative compiler feedback loop.
18. **Hot Take:** Zero-shot code translation is a myth; iterative compilation is the only way forward.
19. **Biggest Unknown:** What if the target language lacks a library that the source language used?
20. **Validation Experiment:** Manually trigger the Write-Test loop 3 times to see if Gemini actually converges on a solution.

### 5. UX/UI Consistency Auditor (Candidate 30)
1. **Agent Necessary?** **NO.** A script can pull the Figma API, screenshot the DOM, and pass both to a multimodal model. No iterative decision-making is happening.
2. **Deterministic tool sufficient?** No, but a static pipeline is.
3. **% Agentic:** <5%.
4. **Baseline Fair?** Yes.
10. **Strongest Criticism:** "This is a single API call to a multimodal model. There is no 'agent'."
*(Note: Flagged for removal from Top 10)*

### 6. Database Schema Migration Reviewer (Candidate 8)
1. **Agent Necessary?** **NO.** A script can run `EXPLAIN`, capture the plan, and send it to an LLM for review. No autonomous loop.
10. **Strongest Criticism:** "It's just a linter with an LLM attached."
*(Note: Flagged for removal from Top 10)*

### 7. Flaky Test Root Cause Diagnoser (Candidate 3)
1. **Agent Necessary?** Yes.
2. **Deterministic tool sufficient?** No.
3. **% Agentic:** 85%.
10. **Strongest Criticism:** "Flaky tests are by definition non-deterministic. If a judge runs it twice, they get two different results. It fails reproducibility."
*(Note: High risk, must ensure reproducibility via synthetic, predictably flaky tests).*

### 8. Accessibility (a11y) Web Auditor (Candidate 9)
1. **Agent Necessary?** Only if it dynamically navigates via keyboard.
10. **Strongest Criticism:** "Axe-core already does 90% of this deterministically for free."
*(Note: Borderline. If it actually uses Playwright to navigate, it's agentic. If it just reads static DOM, it's not.)*

### 9. API Breaking Change Detector (Candidate 5)
1. **Agent Necessary?** Borderline. It's mostly generating a test suite and running it once.
10. **Strongest Criticism:** "Generating a test suite isn't an agentic workflow, it's just code generation."

### 10. Terraform/IaC Security Auditor (Candidate 14)
1. **Agent Necessary?** **NO.** Static analysis + LLM.
10. **Strongest Criticism:** "Just another Checkov wrapper."
*(Note: Flagged for removal).*

---

## Part 2: Re-evaluating the Outsiders

*   **#1 CI/CD Build Investigator:** Could be highly agentic if it actively edits code, commits, and pushes to a local test branch until green.
*   **#2 Dependency Update Analyzer:** Highly agentic. Must install the update, run tests, read the exact failure, parse the upstream repo issues to find a workaround, and apply it.
*   **#16 Scientific Paper Fact-Checker:** Highly agentic if it has to iteratively crawl citation graphs, parse PDFs, and find contradicting studies.

---

## Part 3: The Verdict

### A. TOP 10 AFTER ADVERSARIAL REVIEW (The "True Agents" List)
1. Local Dev Environment Troubleshooter (#29)
2. Security Pentest Report Validator (#11)
3. Legacy Code Translator & Verifier (#7)
4. Flaky Test Root Cause Diagnoser (#3)
5. CI/CD Build Investigator (#1)
6. Dependency Update Risk Analyzer (#2)
7. Scientific Paper Fact-Checker (#16)
8. Real Estate Zoning Analyzer (#28) *(Iterative GIS querying & PDF correlation)*
9. E-commerce Catalog Normalizer (#21) *(Iterative web search for disambiguation)*
10. API Breaking Change Detector (#5) *(Must be redesigned to dynamically fuzz the API)*

### B. 3 UNDERRATED CANDIDATES PROMOTED TO TOP 10
- **CI/CD Build Investigator (#1)** (Reframed as an active fixer, not just a log reader).
- **Dependency Update Risk Analyzer (#2)** (True autonomous testing loop).
- **Scientific Paper Fact-Checker (#16)** (Citation graph crawling is inherently agentic).

### C. 3 HIGH-SCORING CANDIDATES REMOVED FROM TOP 10
- **Medical Trial Eligibility Matcher (#17)** (Zero agentic necessity; it's just RAG).
- **UX/UI Consistency Auditor (#30)** (Zero agentic necessity; static pipeline).
- **Database Schema Migration Reviewer (#8)** (Zero agentic necessity; static pipeline).

### D. 5 BIGGEST UNCERTAINTIES TO VALIDATE
1. Can an LLM consistently read and understand a 5,000-line broken terminal trace without losing context?
2. Can we safely sandbox terminal execution so judges can test it without fear?
3. Will the agent get trapped in infinite loops when its proposed fix fails?
4. Can we reliably mock network/API responses so the workflows are 100% reproducible for judges?
5. Do we have the ability to objectively grade the output without a human in the loop?

### E. RECOMMENDED VALIDATION EXPERIMENT FOR THE FINAL 10
*   **#29 (Dev Troubleshooter):** Give it a Dockerfile with a missing `apt-get` dependency. See if it fixes it and builds successfully.
*   **#11 (Pentest):** Spin up a local vulnerable server. Tell the agent to find the flag.
*   **#7 (Legacy Code):** Ask it to convert a Python script to JS and auto-verify it against the Python script's output.
*   **#3 (Flaky Tests):** Create a test that fails 50% of the time due to a race condition. See if the agent can isolate it.
*   **#1 (CI/CD):** Break a local GitHub Action. Run the agent and see if it proposes the exact git diff needed to fix it.
*   **#2 (Dependencies):** Force a breaking version bump locally. Ask the agent to find the migration guide and rewrite the local code.
*   **#16 (Sci Fact-Check):** Give it a PDF with a fake citation. See if it can use Scholar APIs to prove it's fake.
*   **#28 (Real Estate):** Give it a local Zoning PDF and ask a complex spatial constraint question.
*   **#21 (Catalog):** Feed it 10 obscure product names and see if it can web-search to categorize them.
*   **#5 (API Break):** Change an API payload locally. See if the agent can dynamically discover the break without a schema.
