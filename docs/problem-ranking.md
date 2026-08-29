# Phase 2: Problem Ranking & Scoring

This document evaluates all 30 candidate problems against the official Micro1 Agentic Workflows Hackathon judging rubric and strategic dimensions.

**Scoring Rubric (100 pts total):**
Problem (15) | Agent Eng (30) | Quality (20) | Improvement (15) | Reproducibility (15) | Insights (5)

## Complete Candidate Rankings

| ID | Problem | Rubric Score /100 | Agent Necessity | Evaluation Feasibility | Reproducibility | Differentiation | Risk | Scope | Overall Confidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | CI/CD Build Failure Investigator | 85 | High | High | High | Medium | Low | Medium | High |
| 2 | Dependency Update Risk Analyzer | 82 | High | High | High | High | Medium | High | Medium |
| 3 | Flaky Test Root Cause Diagnoser | 90 | Very High | Medium | Medium | Very High | High | Very High | High |
| 4 | ADR Generator | 70 | Low | Medium | High | Low | Low | Low | Low |
| 5 | API Breaking Change Detector | 88 | High | High | High | High | Low | Medium | High |
| 6 | Cloud Cost Anomaly Investigator | 75 | Medium | Low | Low | High | Medium | High | Low |
| 7 | Legacy Code Translator & Verifier | 92 | Very High | High | High | Very High | Low | High | Very High |
| 8 | Database Schema Migration Reviewer | 91 | High | High | High | High | Low | Medium | Very High |
| 9 | Accessibility (a11y) Web Auditor | 89 | High | High | Medium | High | Low | Medium | High |
| 10 | Open Source License Checker | 72 | Low | High | High | Low | Low | Low | Low |
| 11 | Pentest Report Validator | 93 | Very High | High | High | Very High | High | Medium | Very High |
| 12 | Legal Contract Clause Extractor | 68 | Low | High | High | Low | Low | Low | Low |
| 13 | Privacy Policy vs. Code Tracker | 86 | High | Medium | High | High | Low | Medium | High |
| 14 | Terraform/IaC Security Auditor | 88 | High | High | High | High | Low | Medium | High |
| 15 | Incident Post-Mortem Drafter | 60 | Medium | Low | Very Low | Low | High (Data) | High | Very Low |
| 16 | Scientific Paper Fact-Checker | 85 | High | High | High | Medium | Medium | Medium | Medium |
| 17 | Medical Trial Eligibility Matcher | 94 | Very High | High | High | Very High | Low | Medium | Very High |
| 18 | Grant Application Compliance Checker| 78 | Medium | Medium | Medium | Medium | Low | Medium | Low |
| 19 | Invoice Reconciliation Agent | 82 | Medium | High | High | Medium | Low | Low | Medium |
| 20 | Supply Chain Risk Monitor | 65 | High | Low | Very Low | Low | High (Live) | High | Very Low |
| 21 | E-commerce Catalog Normalizer | 85 | Medium | High | High | Medium | Low | Low | High |
| 22 | SEO Content Gap Analyzer | 70 | Medium | Medium | Low | Low | Low | Low | Low |
| 23 | CS Ticket Escalation Predictor | 65 | Low | High | High | Low | Low | Low | Low |
| 24 | SEC Risk Factor Analyzer | 75 | Low | High | High | Low | Low | Low | Low |
| 25 | Podcast Localization Reviewer | 80 | Medium | High | High | Medium | Low | Medium | Medium |
| 26 | HR Resume vs JD Bias Checker | 70 | Low | High | High | Low | Medium | Low | Low |
| 27 | Meeting Action Item Orchestrator | 55 | High | Low | Very Low | Low | High (Time) | High | Very Low |
| 28 | Real Estate Zoning Analyzer | 87 | High | Medium | High | High | Low | Medium | High |
| 29 | Local Dev Environment Troubleshooter| 95 | Very High | High | High | Very High | Low | Medium | Very High |
| 30 | UX/UI Consistency Auditor | 92 | Very High | High | High | Very High | Low | Medium | Very High |

---

## Strategic Categorization

### 🏆 Top 10 Candidates (Post-Adversarial Review)
*Note: This list was aggressively filtered during Phase 2B. Projects lacking true iterative agentic loops (e.g., pure RAG or single-pass LLM scripts) were removed.*
1. **Local Dev Environment Troubleshooter (29)** - Unbeatable reproducibility and high agentic necessity.
2. **Security Pentest Report Validator (11)** - Isolated sandboxing with dynamic, reactive exploitation paths.
3. **Legacy Code Translator & Verifier (7)** - True Write-Test-Fix compiler feedback loop.
4. **Flaky Test Root Cause Diagnoser (3)** - Deep engineering depth requiring iterative execution.
5. **CI/CD Build Investigator (1)** - Highly agentic if configured to edit code and push fixes locally.
6. **Dependency Update Risk Analyzer (2)** - Differentiates via active compilation and runtime testing.
7. **Scientific Paper Fact-Checker (16)** - True agentic traversal of citation graphs across external APIs.
8. **Real Estate Zoning Analyzer (28)** - Complex spatial/logical reasoning across GIS and PDFs.
9. **E-commerce Catalog Normalizer (21)** - Uses active web search to disambiguate poorly named products.
10. **API Breaking Change Detector (5)** - Fuzz-tests endpoints dynamically based on previous responses.

### 🚫 Demoted from Top 10 (High Scores, Low Agentic Necessity)
*These candidates scored 90+ but were rejected because they can be solved with a single zero-shot prompt or static pipeline.*
- **Medical Trial Eligibility Matcher (17)** - It's just complex RAG on EHR data.
- **UX/UI Consistency Auditor (30)** - It's just a single multimodal API call comparing a DOM screenshot to a Figma node.
- **Database Schema Migration Reviewer (8)** - It's just passing `EXPLAIN` text to an LLM.

### 🐎 5 Most Promising Dark Horses
Niche problems that could score extremely well if executed carefully.
1. **Privacy Policy vs. Code Tracker (13)** - Novel cross-modal reasoning (legal text vs. AST).
2. **Real Estate Zoning & Permit Analyzer (28)** - Spatial and logical reasoning on massive PDFs.
3. **CI/CD Build Failure Investigator (1)** - Extremely relatable bottleneck for the judges.
4. **Dependency Update Risk Analyzer (2)** - Differentiates from standard bots by checking runtime issues.
5. **E-commerce Product Catalog Normalizer (21)** - Uses web search to resolve ambiguity; highly measurable baseline.

### ⚠️ 5 Candidates That Look Impressive But Are Actually Weak
These sound great as startup pitches but are terrible for a 5-minute, reproducible hackathon judging environment.
1. **Incident Post-Mortem Drafter (15)** - Impossible to reproduce without live Datadog/Slack API keys.
2. **Supply Chain Risk Monitor (20)** - Relies on unpredictable, real-time news and weather data.
3. **Meeting Action Item Orchestrator (27)** - Requires asynchronous waiting (days) and multiple live user interactions; untestable in 5 minutes.
4. **Architectural Decision Record Generator (4)** - Just basic RAG (Retrieval-Augmented Generation); zero "agentic" necessity.
5. **Cloud Cost Anomaly Investigator (6)** - Difficult to obtain and package realistic, anonymized billing data for 10 evaluation cases.

### 📊 3 Candidates with the Strongest Evidence Potential
These have brutally objective evaluation metrics where the baseline is guaranteed to fail, making the "Measured Improvement" (15 points) easy to prove.
1. **Legacy Code Translator & Verifier (7)** - Metric: % of test cases passing.
2. **Invoice Reconciliation Agent (19)** - Metric: Absolute mathematical accounting accuracy.
3. **API Breaking Change Detector (5)** - Metric: Number of failing endpoints caught before deployment.

### 🍿 3 Candidates with the Strongest Demo Potential
These provide highly visual, "wow-factor" moments perfect for a 5-minute video.
1. **Local Dev Environment Troubleshooter (29)** - Watching an agent type commands in a terminal, read the output, and fix a Docker container is highly engaging.
2. **UX/UI Consistency Auditor (30)** - Side-by-side comparison of a Figma design and a coded app with visual bounding boxes drawn over discrepancies.
3. **Security Pentest Validator (11)** - Seeing the agent autonomously execute safe exploits (like SQLi or XSS) against a sandbox app to verify a vulnerability.

---

## Phase 2C: Final Risk-Adjusted Scoring (The Surviving 3)

*Note: After the Phase 2C Falsification Tournament, 7 of the Top 10 were killed due to reproducibility failures, lack of objective ground truth, or insufficient agentic necessity. The remaining 3 finalists were rescored with Evidence Confidence applied.*

| Candidate | Problem /15 | Agent Eng /30 | Quality /20 | Improvement /15 | Repro /15 | Insights /5 | Raw Score | Evidence Confidence | Risk-Adjusted Potential | Decision |
| --------- | ----------: | ------------: | ----------: | --------------: | --------: | ----------: | --------: | ------------------: | ----------------------: | -------- |
| #29 Dev Troubleshooter | 15 | 30 | 18 | 15 | 15 | 5 | **98** | 90% | **88.2** | 🥇 **FINALIST 1** |
| #11 Pentest Validator | 15 | 28 | 15 | 15 | 15 | 5 | **93** | 80% | **74.4** | 🥈 **FINALIST 2** |
| #7 Legacy Translator | 10 | 25 | 15 | 15 | 15 | 3 | **83** | 85% | **70.5** | 🥉 **FINALIST 3** |

**Score Change Explanations:**
*   **#29 Dev Troubleshooter:** Raw score increased to 98. Upon adversarial review, this is the most mathematically perfect fit for the rubric. It solves a massive pain point (15/15), requires deep agentic loops in the terminal (30/30), guarantees reproducibility via Docker (15/15), and is wildly entertaining for a demo. Evidence confidence is extremely high (90%) because pass/fail is binary (the container starts or it doesn't).
*   **#11 Pentest Validator:** Remained at 93. While the engineering and problem space are excellent, Evidence Confidence is slightly lower (80%) due to the risk of the LLM context window becoming overwhelmed by massive raw `nmap` or `curl` dumps, potentially leading to hallucinated exploits.
*   **#7 Legacy Translator:** Raw score dropped from 92 to 83. The Problem score dropped because legacy migration is a niche enterprise problem, not a universal developer pain. Quality dropped because of the "Ground Truth" problem: if the user doesn't provide the legacy tests, the agent will hallucinate tests that pass its own broken code. Evidence Confidence is 85% conditional on the user providing a perfect test suite.
