# Phase 1: Problem Discovery - 30 Candidate Problems

This document contains approximately 30 candidate problems across various domains. Each candidate is evaluated against the 14 required dimensions to assess its viability for the Micro1 Hackathon.

---

## Domain: Software Engineering & DevOps

### 1. CI/CD Build Failure Investigator
*   **User/Problem:** DevOps / Developers facing cryptic CI/CD pipeline failures.
*   **Bottleneck:** Digging through thousands of lines of logs to find the root cause (e.g., OOM, network timeout, test failure) is tedious.
*   **Agentic Necessity:** Needs to read logs, search StackOverflow/internal wikis, inspect recent commits, and propose a fix.
*   **Baseline:** Simple LLM prompt with the last 100 lines of the build log.
*   **Primary Metric:** Accuracy of root cause identification (0-100%).
*   **10+ Cases Feasibility:** High (historical failed GitHub Actions runs).
*   **Verification:** Compare agent's proposed fix with the actual PR that fixed the build.
*   **Data Availability:** Public GitHub repositories with failed action logs.
*   **Engineering Depth:** Medium-High (parsing large logs, semantic search).
*   **Reproducibility:** High (logs and commits are immutable).
*   **Differentiation:** Goes beyond just pointing out the error line; traces it to the specific code change.
*   **Risks:** Logs can be too large for context windows; hallucinated fixes.
*   **Demo Potential:** Show a cryptic Jenkins/GH Action failure instantly diagnosed.
*   **Rubric Strengths/Weaknesses:** Strong on Reproducibility and Baseline comparison. Risk of low End-to-End Quality if fixes are consistently wrong.

### 2. Dependency Update Risk Analyzer
*   **User/Problem:** Engineers updating legacy dependencies (e.g., React 16 to 18) fear breaking changes.
*   **Bottleneck:** Manually reading changelogs, migration guides, and community issues for dozens of transitive dependencies.
*   **Agentic Necessity:** Needs to fetch release notes, search GitHub issues for reported regressions, and analyze local AST for deprecated API usage.
*   **Baseline:** Dependabot (just bumps version and runs existing tests).
*   **Primary Metric:** Number of breaking changes correctly identified before merge.
*   **10+ Cases Feasibility:** High (historical major version bumps in open source).
*   **Verification:** Compare to manual migration PRs and issues.
*   **Data Availability:** Public GitHub repos, npm/PyPI registries.
*   **Engineering Depth:** High (AST parsing, web scraping changelogs).
*   **Reproducibility:** High (using fixed git commits).
*   **Differentiation:** Predicts runtime/API impact rather than just bumping a text file.
*   **Risks:** Overwhelming false positives.
*   **Demo Potential:** Show it catching a deprecated API usage that tests didn't cover.
*   **Rubric Strengths/Weaknesses:** Strong User Value. Risk: High latency in searching.

### 3. Flaky Test Root Cause Diagnoser
*   **User/Problem:** QA/Developers dealing with tests that randomly fail.
*   **Bottleneck:** Reproducing flaky tests locally is often impossible; requires analyzing timing, shared state, or network calls.
*   **Agentic Necessity:** Needs to run the test repeatedly, inject delays, analyze traces/logs, and isolate the shared state.
*   **Baseline:** A script that just reruns the test 10 times and outputs the diff of passing vs failing logs.
*   **Primary Metric:** Time saved (or % of flaky tests successfully isolated).
*   **10+ Cases Feasibility:** Medium (finding reproducible flaky tests is hard).
*   **Verification:** Check if the agent's proposed fix stops the flakiness over 100 runs.
*   **Data Availability:** Can create synthetic flaky tests or find known open-source ones.
*   **Engineering Depth:** Very High (sandbox execution, iterative testing).
*   **Reproducibility:** Medium (flakiness is non-deterministic by nature).
*   **Differentiation:** True autonomous debugging loop, highly agentic.
*   **Risks:** Agent gets stuck in infinite loops; reproducibility is inherently challenging for flaky tests.
*   **Demo Potential:** Very strong (watching an agent narrow down a race condition).
*   **Rubric Strengths/Weaknesses:** High Agentic Necessity (30 pts), but Reproducibility (15 pts) could suffer.

### 4. Architectural Decision Record (ADR) Generator
*   **User/Problem:** Tech Leads need to document system architecture changes, but rarely have time.
*   **Bottleneck:** Writing ADRs requires synthesizing PR discussions, Slack threads, and code changes into a formal document.
*   **Agentic Necessity:** Needs to aggregate context across Jira, GitHub PRs, and code diffs to construct a coherent narrative.
*   **Baseline:** Basic LLM summarizing a single PR description.
*   **Primary Metric:** Subjective quality of ADR (graded by senior engineers) or time saved.
*   **10+ Cases Feasibility:** High (any large PR in an open-source project).
*   **Verification:** Compare agent-generated ADR to human-written ADR.
*   **Data Availability:** Public GitHub PRs and issues.
*   **Engineering Depth:** Medium (data aggregation, prompt chaining).
*   **Reproducibility:** High.
*   **Differentiation:** Cross-referencing multiple data sources to find the *why*, not just the *what*.
*   **Risks:** Output might be too generic.
*   **Demo Potential:** Good, but visually boring (just text generation).
*   **Rubric Strengths/Weaknesses:** High Reproducibility, but low Agentic Necessity (could just be a RAG prompt).

### 5. API Breaking Change Detector
*   **User/Problem:** API Developers need to ensure they don't break downstream clients.
*   **Bottleneck:** Semantic breaking changes (e.g., changing a field's format from ISO to Unix timestamp) aren't caught by simple OpenAPI diffs.
*   **Agentic Necessity:** Needs to analyze code changes, check API schemas, and generate synthetic client requests to test for semantic breaks.
*   **Baseline:** OpenAPI diff tool (catches structural breaks, misses semantic ones).
*   **Primary Metric:** Semantic breaking changes caught.
*   **10+ Cases Feasibility:** High (synthetic or real API changes).
*   **Verification:** Run downstream client tests against the modified API.
*   **Data Availability:** Open source APIs (e.g., Stripe API mocks).
*   **Engineering Depth:** High (generating and executing synthetic tests).
*   **Reproducibility:** High.
*   **Differentiation:** Catches logical breaks, not just schema breaks.
*   **Risks:** Setting up the sandbox environments for 10+ cases is tedious.
*   **Demo Potential:** Strong (showing a subtle break being caught).
*   **Rubric Strengths/Weaknesses:** Excellent Measured Improvement potential.

### 6. Cloud Cost Anomaly Investigator
*   **User/Problem:** FinOps/DevOps engineers seeing a sudden spike in AWS/GCP bills.
*   **Bottleneck:** Correlating cost spikes in billing dashboards to specific infrastructure changes or code deployments.
*   **Agentic Necessity:** Needs to query billing APIs, cross-reference with Terraform state, and check recent PRs for infrastructure changes.
*   **Baseline:** AWS Cost Explorer anomaly alerts (just says "EC2 went up 20%").
*   **Primary Metric:** Accuracy of root cause identification.
*   **10+ Cases Feasibility:** Medium (requires simulated or exported billing/git data).
*   **Verification:** Compare with known historical billing spikes.
*   **Data Availability:** Harder (requires anonymized/synthetic billing exports).
*   **Engineering Depth:** Medium-High (data correlation).
*   **Reproducibility:** High (if using static CSV/JSON exports).
*   **Differentiation:** Connects money directly to code.
*   **Risks:** Data privacy; hard to get 10 realistic cases.
*   **Demo Potential:** Very strong business value.
*   **Rubric Strengths/Weaknesses:** High User Value, but Reproducibility might rely on mock data.

### 7. Legacy Code Translator & Verifier (e.g., COBOL/Perl to Python)
*   **User/Problem:** Enterprises migrating legacy systems to modern stacks.
*   **Bottleneck:** Ensuring the translated code has the exact same business logic and side effects.
*   **Agentic Necessity:** Needs to translate code, generate unit tests for the old code, run them against the new code, and iteratively fix the translation until tests pass.
*   **Baseline:** Zero-shot LLM translation (often subtly wrong).
*   **Primary Metric:** Percentage of test cases passing on the translated code.
*   **10+ Cases Feasibility:** High (can find/create legacy scripts).
*   **Verification:** Automated test suite execution.
*   **Data Availability:** Open-source Perl/Ruby/COBOL scripts.
*   **Engineering Depth:** High (sandbox execution, iterative feedback loop).
*   **Reproducibility:** High.
*   **Differentiation:** The iterative testing loop guarantees functional equivalence.
*   **Risks:** Infinite loops during fixing.
*   **Demo Potential:** Excellent (showing the agent fail, write a test, and fix itself).
*   **Rubric Strengths/Weaknesses:** High across the board (Agentic Necessity, Baseline comparison, Reproducibility).

### 8. Database Schema Migration Reviewer
*   **User/Problem:** DBAs and Backend engineers reviewing SQL migrations.
*   **Bottleneck:** Spotting locking issues, missing indices, or destructive data drops in large migrations is error-prone.
*   **Agentic Necessity:** Needs to run `EXPLAIN` plans on a shadow database, check table sizes, and predict downtime.
*   **Baseline:** Simple regex checks (e.g., forbidding `DROP TABLE`).
*   **Primary Metric:** Number of performance/locking risks identified.
*   **10+ Cases Feasibility:** High.
*   **Verification:** Run the migration on a dummy large database and measure lock times.
*   **Data Availability:** Synthetic schemas with millions of rows.
*   **Engineering Depth:** High (spinning up Docker DBs, executing plans).
*   **Reproducibility:** High.
*   **Differentiation:** Actually executes the plan rather than just statically analyzing SQL.
*   **Risks:** Database setup for reproducibility is heavy.
*   **Demo Potential:** Strong technical demo.
*   **Rubric Strengths/Weaknesses:** High Engineering Quality.

### 9. Accessibility (a11y) Web Auditor & Fixer
*   **User/Problem:** Frontend developers ensuring WCAG compliance.
*   **Bottleneck:** Axe tools find syntax errors (missing alt text), but cannot judge if the alt text is *contextually accurate* or if keyboard navigation is logical.
*   **Agentic Necessity:** Needs to visually inspect the page, navigate via keyboard (Playwright), and propose code fixes.
*   **Baseline:** Axe-core static analysis.
*   **Primary Metric:** Semantic accessibility issues resolved.
*   **10+ Cases Feasibility:** High (any 10 websites).
*   **Verification:** Manual review of the fixes.
*   **Data Availability:** Infinite (the web).
*   **Engineering Depth:** High (Playwright integration, multimodal vision).
*   **Reproducibility:** Medium (live websites change; better to use saved HTML/CSS snapshots).
*   **Differentiation:** Multimodal assessment of semantic meaning.
*   **Risks:** Vision models can be flaky.
*   **Demo Potential:** Highly visual and impactful.
*   **Rubric Strengths/Weaknesses:** Great Problem Value and Baseline comparison.

### 10. Open Source License Compliance Checker
*   **User/Problem:** Legal/Compliance teams auditing software before a release or acquisition.
*   **Bottleneck:** Scanning deeply nested transitive dependencies for copyleft (GPL) licenses or conflicting terms.
*   **Agentic Necessity:** Needs to fetch repos, read custom LICENSE files (not just standard ones), and evaluate risk based on how the library is linked (dynamic vs static).
*   **Baseline:** Traditional SCA tools (e.g., FOSSA) which fail on custom license text.
*   **Primary Metric:** Accuracy of license conflict detection.
*   **10+ Cases Feasibility:** High.
*   **Verification:** Legal expert review.
*   **Data Availability:** Open source repos.
*   **Engineering Depth:** Medium.
*   **Reproducibility:** High.
*   **Differentiation:** Can read and understand non-standard, custom-written license files.
*   **Risks:** A bit boring for a demo.
*   **Rubric Strengths/Weaknesses:** Low Agentic Necessity (mostly just text classification).

---

## Domain: Legal, Security & Compliance

### 11. Security Penetration Testing Report Validator
*   **User/Problem:** Security teams receiving Pentest reports from external vendors.
*   **Bottleneck:** Verifying if the reported vulnerabilities are actually exploitable in the current environment (many are false positives).
*   **Agentic Necessity:** Needs to read the report, run harmless verification scripts (e.g., curl, nmap) in a sandbox, and confirm exploitability.
*   **Baseline:** Manual verification by an internal security engineer.
*   **Primary Metric:** False positive reduction rate.
*   **10+ Cases Feasibility:** Medium (requires safe, vulnerable sandbox apps like OWASP Juice Shop).
*   **Verification:** Did the agent correctly exploit or debunk the claim?
*   **Data Availability:** Synthetic vulnerable apps.
*   **Engineering Depth:** High (safe sandbox orchestration).
*   **Reproducibility:** High (if using Docker containers).
*   **Differentiation:** Active verification over passive reading.
*   **Risks:** High risk of agent breaking things if not sandboxed properly.
*   **Demo Potential:** Very cool (watching an agent hack a sandbox).
*   **Rubric Strengths/Weaknesses:** Excellent Agentic Necessity.

### 12. Legal Contract Clause Extractor & Risk Scorer (MSA/NDA)
*   **User/Problem:** Sales/Legal teams reviewing standard contracts.
*   **Bottleneck:** Finding non-standard indemnification or liability clauses buried in 50-page PDFs.
*   **Agentic Necessity:** Needs to cross-reference the document against a company's "standard playbook" and highlight deviations.
*   **Baseline:** Simple RAG or zero-shot extraction.
*   **Primary Metric:** Recall of non-standard clauses.
*   **10+ Cases Feasibility:** High (public SEC contracts).
*   **Verification:** Lawyer review.
*   **Data Availability:** Public EDGAR database.
*   **Engineering Depth:** Low-Medium.
*   **Reproducibility:** High.
*   **Differentiation:** Explains *why* it deviates from the playbook.
*   **Risks:** Heavily reliant on base LLM intelligence, low agentic orchestration.
*   **Demo Potential:** Boring visually.
*   **Rubric Strengths/Weaknesses:** Weak on Agentic Necessity and Engineering Depth.

### 13. Privacy Policy vs. Code Tracker (GDPR/CCPA)
*   **User/Problem:** Privacy engineers ensuring apps don't collect data secretly.
*   **Bottleneck:** The privacy policy says "We don't collect location," but a developer recently added a background GPS tracker.
*   **Agentic Necessity:** Needs to read the Privacy Policy (text), scan the codebase (AST/imports) for telemetry/tracking SDKs, and flag contradictions.
*   **Baseline:** Manual audit.
*   **Primary Metric:** Number of privacy violations caught.
*   **10+ Cases Feasibility:** High (open source mobile apps).
*   **Verification:** Manual code review.
*   **Data Availability:** Open source iOS/Android apps.
*   **Engineering Depth:** High (cross-modal reasoning: legal text vs code).
*   **Reproducibility:** High.
*   **Differentiation:** Bridges the gap between legal and engineering.
*   **Risks:** Hard to map complex legal text to specific code artifacts.
*   **Demo Potential:** Strong narrative.
*   **Rubric Strengths/Weaknesses:** High Problem Value.

### 14. Terraform/IaC Security Auditor
*   **User/Problem:** Cloud architects ensuring infrastructure is secure before deployment.
*   **Bottleneck:** Checkov/tfsec catch syntax issues, but miss logical flaws (e.g., an S3 bucket is private, but an IAM role attached to a public EC2 instance has full access to it).
*   **Agentic Necessity:** Needs to build a graph of the infrastructure, simulate IAM permissions, and find logical attack paths.
*   **Baseline:** Checkov (static analysis).
*   **Primary Metric:** Logical attack paths found vs false positives.
*   **10+ Cases Feasibility:** High (using vulnerable Terraform templates like Terragoat).
*   **Verification:** Compare against known vulnerabilities in the templates.
*   **Data Availability:** Open source vulnerable IaC.
*   **Engineering Depth:** High (graph traversal, IAM simulation).
*   **Reproducibility:** High.
*   **Differentiation:** Context-aware security analysis.
*   **Risks:** Complex to build the infrastructure graph.
*   **Rubric Strengths/Weaknesses:** Very strong on Baseline comparison (Checkov vs Agent).

### 15. Incident Post-Mortem Drafter
*   **User/Problem:** SREs writing incident reports after an outage.
*   **Bottleneck:** Collating timelines from Slack, Datadog alerts, PagerDuty, and GitHub PRs takes hours.
*   **Agentic Necessity:** Needs to use APIs to pull timelines from multiple tools, construct a chronological narrative, and draft a blameless post-mortem.
*   **Baseline:** A human copying and pasting logs into a Google Doc.
*   **Primary Metric:** Time saved drafting the report.
*   **10+ Cases Feasibility:** Low-Medium (requires access to real, multi-platform incident data).
*   **Verification:** Subjective quality check by SREs.
*   **Data Availability:** Difficult (requires mocking Slack, Datadog, GitHub for 10 cases).
*   **Engineering Depth:** Medium (mostly API orchestration).
*   **Reproducibility:** Hard to package for judges without live API keys.
*   **Risks:** Fails Reproducibility criteria heavily due to mock data complexity.
*   **Rubric Strengths/Weaknesses:** High User Value, but fails Reproducibility (15 pts).

---

## Domain: Research, Medical & Scientific

### 16. Scientific Paper Fact-Checker (Claims vs Evidence)
*   **User/Problem:** Peer reviewers and researchers evaluating new papers.
*   **Bottleneck:** Verifying if the citations actually support the claims made in the text.
*   **Agentic Necessity:** Needs to extract claims, fetch the cited papers (PDFs), read the specific sections, and verify if the evidence matches the claim.
*   **Baseline:** Zero-shot LLM reading just the abstract.
*   **Primary Metric:** Accuracy in detecting unsupported citations.
*   **10+ Cases Feasibility:** High (open access papers on ArXiv/PubMed).
*   **Verification:** Manual verification of citations.
*   **Data Availability:** High.
*   **Engineering Depth:** High (multimodal PDF reading, citation graph traversal).
*   **Reproducibility:** High.
*   **Differentiation:** Deep verification rather than surface-level summarization.
*   **Risks:** Paywalled papers will block the agent.
*   **Demo Potential:** Very strong (showing it catch a hallucinated citation).
*   **Rubric Strengths/Weaknesses:** High Agentic Necessity and Problem Value.

### 17. Medical Trial Eligibility Matcher
*   **User/Problem:** Oncologists/Doctors trying to find clinical trials for patients.
*   **Bottleneck:** Matching unstructured patient records (EHR) against complex, unstructured inclusion/exclusion criteria on ClinicalTrials.gov.
*   **Agentic Necessity:** Needs to extract patient conditions, query the ClinicalTrials API, read complex logic ("must have X but not Y unless Z"), and explain the match.
*   **Baseline:** Keyword search on ClinicalTrials.gov.
*   **Primary Metric:** Precision/Recall of eligible trials.
*   **10+ Cases Feasibility:** High (synthetic patient profiles).
*   **Verification:** Review by a medical professional (or gold-standard dataset).
*   **Data Availability:** ClinicalTrials.gov API + Synthetic EHR data (MIMIC-III).
*   **Engineering Depth:** High (complex logical reasoning).
*   **Reproducibility:** High.
*   **Differentiation:** Solves a highly complex, life-saving logical mapping problem.
*   **Risks:** Hallucinations in medical context.
*   **Demo Potential:** Extremely high impact.
*   **Rubric Strengths/Weaknesses:** Excellent User Value and Baseline comparison.

### 18. Grant Application Compliance Checker
*   **User/Problem:** Academic researchers submitting grants (e.g., to NIH or NSF).
*   **Bottleneck:** Grants are rejected for trivial formatting issues, missing specific sections, or failing to address specific rubric points in a 100-page PDF.
*   **Agentic Necessity:** Needs to read the agency's solicitation PDF, read the user's draft, and meticulously check every constraint (margins, sections, data management plans).
*   **Baseline:** Simple LLM review (misses structural constraints).
*   **Primary Metric:** Number of valid compliance errors caught.
*   **10+ Cases Feasibility:** Medium (needs 10 mock grant proposals).
*   **Verification:** Compare to agency rejection criteria.
*   **Data Availability:** Public grant guidelines, hard to find realistic drafts.
*   **Engineering Depth:** Medium.
*   **Reproducibility:** High.
*   **Rubric Strengths/Weaknesses:** Good, but data acquisition for 10 cases is annoying.

---

## Domain: Business Operations, Data & Finance

### 19. Invoice Reconciliation Agent (Accounts Payable)
*   **User/Problem:** Accountants matching invoices to purchase orders and bank statements.
*   **Bottleneck:** Dealing with OCR errors, different currencies, missing line items, and differing supplier formats.
*   **Agentic Necessity:** Needs to read PDFs (vision), query the ERP system (API), calculate totals, and flag discrepancies.
*   **Baseline:** Traditional OCR templates (break when layout changes).
*   **Primary Metric:** Percentage of invoices successfully reconciled without human intervention.
*   **10+ Cases Feasibility:** High (can generate synthetic invoices and POs).
*   **Verification:** Absolute mathematical accuracy.
*   **Data Availability:** Synthetic data generation is easy.
*   **Engineering Depth:** Medium.
*   **Reproducibility:** High.
*   **Differentiation:** Layout-agnostic, handles fuzzy logic (e.g., "Dozen Apples" vs "12x Apples").
*   **Risks:** Boring demo.
*   **Rubric Strengths/Weaknesses:** Extremely clear Baseline and Evaluation metric.

### 20. Supply Chain Risk Monitor
*   **User/Problem:** Supply chain managers tracking global shipments.
*   **Bottleneck:** Realizing a shipment will be late requires monitoring weather, news (port strikes), and logistics APIs simultaneously.
*   **Agentic Necessity:** Needs to monitor a list of shipments, search live news for disruptions at transit nodes, and calculate delay probabilities.
*   **Baseline:** Standard logistics tracking API (only updates when a scan is missed).
*   **Primary Metric:** Advance warning time for disruptions.
*   **10+ Cases Feasibility:** Medium (requires simulating live news).
*   **Verification:** Historical backtesting.
*   **Data Availability:** Difficult to package for reproducible judging.
*   **Engineering Depth:** High.
*   **Risks:** Fails Reproducibility (relies on live external changing data).

### 21. E-commerce Product Catalog Normalizer
*   **User/Problem:** Retailers importing products from hundreds of different vendors.
*   **Bottleneck:** Vendors provide messy CSVs. One says "Color: Blk", another says "Colour: Black". Mapping these to a standard taxonomy is entirely manual.
*   **Agentic Necessity:** Needs to read supplier CSVs, search the internet to figure out what ambiguous products are, and map them to a strict JSON schema.
*   **Baseline:** Simple Python script with dictionaries/regex.
*   **Primary Metric:** Categorization accuracy.
*   **10+ Cases Feasibility:** High (messy CSVs).
*   **Verification:** Compare to human-normalized catalogs.
*   **Data Availability:** Easy to synthesize or scrape.
*   **Engineering Depth:** Medium.
*   **Reproducibility:** High.
*   **Differentiation:** Uses web search to resolve ambiguity (e.g., "Model XJ-9" -> searches web -> "Oh, it's a toaster" -> Category: Appliances).
*   **Rubric Strengths/Weaknesses:** Very solid, reproducible, clear baseline.

### 22. SEO Competitor Content Gap Analyzer
*   **User/Problem:** Marketing teams trying to outrank competitors.
*   **Bottleneck:** Reading top 10 Google results and figuring out what topics they cover that your article misses.
*   **Agentic Necessity:** Needs to execute Google searches, scrape 10 articles, build a knowledge graph of topics, and compare it to the user's draft.
*   **Baseline:** Ahrefs/Clearscope (expensive, uses basic TF-IDF).
*   **Primary Metric:** Number of highly relevant semantic topics identified.
*   **10+ Cases Feasibility:** High.
*   **Verification:** Subjective review of the recommendations.
*   **Data Availability:** The web.
*   **Engineering Depth:** Medium (scraping, summarization).
*   **Reproducibility:** Medium (search results change over time).
*   **Rubric Strengths/Weaknesses:** Weak on objective metrics (evaluation is subjective).

### 23. Customer Support Ticket Escalation Predictor
*   **User/Problem:** CS Managers trying to prevent customer churn.
*   **Bottleneck:** By the time a ticket is flagged as "angry", the customer is already churning.
*   **Agentic Necessity:** Needs to analyze the back-and-forth history, cross-reference with the customer's previous tickets, and suggest preemptive compensation.
*   **Baseline:** Sentiment analysis script (flags bad words).
*   **Primary Metric:** Correlation with actual escalations (using historical data).
*   **10+ Cases Feasibility:** High.
*   **Data Availability:** Synthetic Zendesk tickets.
*   **Engineering Depth:** Low-Medium.
*   **Rubric Strengths/Weaknesses:** Weak Agentic Necessity (mostly just text classification).

### 24. SEC Filing Risk Factor Analyzer (Finance)
*   **User/Problem:** Equity analysts reading 10-K reports.
*   **Bottleneck:** Finding the *new* risks added this year compared to last year's 10-K, hidden in 200 pages of boilerplate.
*   **Agentic Necessity:** Needs to fetch both PDFs, align the text, ignore boilerplate changes, and summarize the material shifts in business risk.
*   **Baseline:** Standard PDF text diff (useless due to formatting changes).
*   **Primary Metric:** Precision of material risk changes identified.
*   **10+ Cases Feasibility:** High (EDGAR).
*   **Reproducibility:** High.
*   **Rubric Strengths/Weaknesses:** Good, but highly specialized.

---

## Domain: Content, HR & Miscellaneous

### 25. Podcast/Video Localization Reviewer
*(Note: This is one of the Micro1 examples, included for completeness)*
*   **User/Problem:** Media teams dubbing/translating podcasts.
*   **Bottleneck:** Ensuring tone, speaker identity, and recurring jokes are consistent across 50 episodes in 5 languages.
*   **Agentic Necessity:** Needs to maintain a glossary across episodes, check new transcripts against the glossary, and enforce tone.
*   **Baseline:** Zero-shot translation of a single episode.
*   **Primary Metric:** Consistency errors caught.
*   **Reproducibility:** High (using fixed audio/text files).

### 26. HR Resume vs Job Description Bias & Fact Checker
*   **User/Problem:** Recruiters spending 10 seconds per resume.
*   **Bottleneck:** Missing great candidates because they didn't use exact keywords, or passing fake candidates who just copy-pasted the JD.
*   **Agentic Necessity:** Needs to verify claims (e.g., "Led project X" -> check public LinkedIn/GitHub if authorized), and map latent skills to the JD.
*   **Baseline:** ATS Keyword matching.
*   **Primary Metric:** Precision of skill mapping.
*   **10+ Cases Feasibility:** High (synthetic resumes).
*   **Reproducibility:** High.
*   **Rubric Strengths/Weaknesses:** Good, but verification via web search can be flaky.

### 27. Meeting Action Item Follow-up Orchestrator
*   **User/Problem:** Project managers chasing people for updates.
*   **Bottleneck:** Extracting tasks from transcripts, putting them in Jira, and messaging people on Slack 3 days later.
*   **Agentic Necessity:** Needs to parse transcripts, create tickets, wait (memory/state), check Jira status 3 days later, and draft Slack pings if incomplete.
*   **Baseline:** Basic transcript-to-bullet-points summarization.
*   **Primary Metric:** Tasks successfully tracked end-to-end.
*   **Reproducibility:** Very Hard (requires mocking time, Slack, and Jira for the judges).
*   **Rubric Strengths/Weaknesses:** Fails Reproducibility and End-to-End Execution for judging purposes.

### 28. Real Estate Zoning & Permit Analyzer
*   **User/Problem:** Real estate developers assessing a plot of land.
*   **Bottleneck:** Reading hundreds of pages of municipal zoning codes to answer "Can I build a 4-story duplex here?"
*   **Agentic Necessity:** Needs to query GIS databases for the parcel, fetch the specific city's zoning PDF, and execute spatial/logical reasoning.
*   **Baseline:** RAG on the zoning code.
*   **Primary Metric:** Accuracy of the final "Yes/No + Constraints" answer.
*   **10+ Cases Feasibility:** High.
*   **Reproducibility:** High (if PDFs are downloaded and bundled).
*   **Differentiation:** High value, niche, complex reasoning.

### 29. Local Dev Environment Troubleshooter
*   **User/Problem:** New developers onboarding and getting "Module Not Found" or "Docker failed to bind" errors.
*   **Bottleneck:** Bothering senior engineers for environment setup issues.
*   **Agentic Necessity:** Needs to run shell commands (`env`, `docker ps`, `npm list`), read configurations, and apply fixes iteratively until the app starts.
*   **Baseline:** Searching the error on Google.
*   **Primary Metric:** Time to successful app launch.
*   **10+ Cases Feasibility:** Medium (requires building 10 broken Docker environments).
*   **Reproducibility:** High (via Dockerized broken states).
*   **Differentiation:** Acts in the terminal iteratively.
*   **Rubric Strengths/Weaknesses:** High Agentic Necessity, excellent demo.

### 30. UX/UI Consistency Auditor (Figma to Code)
*   **User/Problem:** Designers/Frontend devs ensuring the coded app matches the Figma design.
*   **Bottleneck:** Visually hunting for wrong padding, wrong fonts, or incorrect hex codes.
*   **Agentic Necessity:** Needs to extract design tokens from Figma API, take screenshots of the live local app, and compare them visually and via CSS inspection.
*   **Baseline:** Pixel-diffing tools (fail on responsive changes).
*   **Primary Metric:** Semantic design deviations caught (e.g., "Uses #333 instead of #000").
*   **10+ Cases Feasibility:** High.
*   **Reproducibility:** High.
*   **Differentiation:** Combines vision with API data to do semantic design review.
*   **Rubric Strengths/Weaknesses:** Extremely cool, visually impressive demo, high technical depth.
