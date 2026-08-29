# Micro1 Agentic Workflows Hackathon - Competition Rules

This document extracts and organizes the rules, requirements, and principles strictly from the official competition PDF.

## A. OFFICIAL COMPETITION REQUIREMENTS

### 1. Challenge Objective
Choose a problem worth solving and use agents to create something people would genuinely find useful. Keep it practical, share what you learn and have fun.

### 2. Four Central Questions
1. Who has this problem?
2. What bottleneck makes it worth solving?
3. Does the agent solve it well?
4. Can another person reproduce the result?

### 3. Problem Requirements
Pick a specific and meaningful problem you understand. Explain who has the problem, the bottleneck they face, and why solving it would be valuable in practice. The goal is to create something a real person would want to use.

### 4. Agent Requirements / Design Principles
- Use whichever agent capabilities help solve the problem well (e.g., better context, better tools, memory, verification, specialized skills, or orchestration).
- Choose the approach that fits your problem.
- **Rule:** Purposeful choices matter more than the number of components. 
- **Rule:** Each design choice must improve the solution and help the agent reach the goal reliably.

### 5. Baseline Requirements
- Create a simple baseline that represents a reasonable basic way to handle the task before using your solution (e.g., one direct prompt, one general purpose agent, a simple script/template, or the manual process people use today).
- **Rule:** Keep the comparison fair by giving the baseline and final solution the **same task and evaluation cases**.
- Explain any meaningful difference in the resources available to each one.
- Use the final baseline comparison to show the size of the overall improvement.

### 6. Evaluation Requirements
- Choose **one primary metric** that reflects what success means to the user (e.g., tests pass, time saved, cost reduced, calibration).
- Define what a good final result looks like before running the evaluation.
- Target **10 or more cases** when the task allows it.
- Include **one challenging case** and explain what it revealed.
- Run this evaluation yourself, or design a clear scoring rubric and propose it for judges.

### 7. Improvement Changelog
- Create a short changelog that tells the story of how your solution evolved from the baseline to the final result.
- Add one entry for every important experiment, explaining what you tried and why.
- Show the result using the same evaluation method whenever possible, and share what you decided to do next.
- Include experiments you later removed and explain what they taught you about the problem.

### 8. Judging Rubric and Point Weights (100 Points Total)
- **Problem & User Value (15 points):** A strong project solves a meaningful problem for a clearly defined user.
- **Agent Solution & Engineering (30 points):** A strong solution uses agents purposefully and is technically sound.
- **End to End Quality (20 points):** Completes a realistic and self-contained execution and produces a final result the user can use (should read like a finished product, not an obvious AI draft).
- **Measured Improvement (15 points):** Demonstrates gains over a fair baseline and uses the changelog to connect iterations with evidence.
- **Reproducibility (15 points):** Gives another person a clear path to run the solution and baseline and reach the main result from a clean environment.
- **Hot Take / Insights (5 points):** Turns an observed failure mode into a practical lesson for building more reliable agents.

### 9. Ground Rules
1. You are welcome to build with tools and components you already know.
2. Make it clear what existed before the competition and what you added.
3. Use every tool and component according to its license and service terms.
4. Keep consequential actions controlled through a sandbox or simulation. Add human approval before the action happens.
5. Make a qualified human reviewer part of any solution that could significantly affect someone.
6. Choose a legal and ethical use case that treats people and their data responsibly.
7. Use information you are allowed to share (public, synthetic, or approved anonymous data).
8. Keep credentials and private information outside the submission.
9. Connect every claim about your results to the evidence you submit.
10. Give judges enough access to run the project and reproduce the main result.

### 10. Final Deliverables
Submit the following four items:
1. Complete solution code and improvement changelog
2. Reproduction guide
3. Solution video
4. Agent trajectories

### 11. Video Requirements
- Maximum 5 minutes.
- Begin with the problem and simple baseline.
- Walk through one realistic execution from start to finish.
- Show the final comparison.
- Briefly explain the changelog, highlighting the change that contributed most, as well as one experiment you removed.

### 12. Trajectory Requirements
- Include representative trajectories for **every agent you used**.
- Make each trajectory easy to follow from instructions to final result.
- Show what the agent did, how tools responded, feedback that shaped next steps, retries, and human checkpoints.

### 13. Reproducibility Requirements
- Write for someone starting from a clean environment.
- Walk through setup and provide exact commands for the solution, baseline, and evaluation.
- Explain data required and expected output.
- Share relevant versions, approximate runtime, and cost.

### 14. Data / Privacy / Security Requirements
- Treat people and their data responsibly.
- Use information you are allowed to share (public, synthetic, approved anonymous).
- Keep credentials and private information outside the submission.
- Keep consequential actions controlled in a sandbox or via human approval.

### 15. Potential Point-Loss Risks
- Lack of purposeful choices (e.g., adding agents just to add them).
- Unfair baseline comparison (different tasks/cases or unexplained resource differences).
- Evaluation that lacks 10+ cases or a challenging case (when practical).
- Outputs that look like obvious AI-generated drafts.
- Not documenting experiments that were removed.
- Inability for judges to run the project and reproduce the main result from a clean environment.
- Failing to distinguish what was added vs. what already existed.

---

## B. STRATEGIC RECOMMENDATIONS

- **Metric Selection:** Pick a metric that genuinely matters to the user (e.g., tests passing for developers, time saved for operations). Do not pick generic metrics.
- **Failures as Insights:** Treat failure modes not as defects but as valuable engineering insights. Highlighting a removed experiment builds credibility.
- **Self-Contained Execution:** A self-contained workflow is better than a fragmented process.
- **High-Quality Output:** The agent’s final output should resemble something a person could sign their name to. Do not just spit out a generic LLM response.

---

## C. ENGINEERING ASSUMPTIONS

- **Tooling:** We assume that we can use any framework or SDK as long as it is properly licensed and we can document the setup commands.
- **Evaluation:** Since we must run the evaluation ourselves (or propose a rubric), we must engineer an automated testing harness or rigorous manual test suite for the 10+ cases.
- **Logging:** We need a way to capture "representative trajectories" for every agent. The system we build must support exporting these logs clearly.
