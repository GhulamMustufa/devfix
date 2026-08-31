# Reproduction Guide

This guide is written specifically for reviewers, contributors, and hackathon judges who wish to independently verify DevFix's capabilities from a clean environment.

## 1. Environment Setup

To run DevFix and reproduce our benchmark results, your host machine must meet the following requirements:

- **Node.js**: v18.0.0 or higher
- **Docker**: Docker Desktop or Docker Engine must be installed and running.
- **API Key**: A valid LLM provider API key (e.g., DeepSeek, OpenAI, Anthropic).

### Installation

Clone the repository and install dependencies from a clean state:

```bash
git clone https://github.com/GhulamMustufa/devfix.git
cd devfix
npm install
```

Set up your environment variables:
```bash
cp .env.example .env
```
Edit `.env` and add your `DEEPSEEK_API_KEY` (or configure your preferred provider in `src/llm/Provider.js`).

## 2. Running the Baseline

A "Simple Baseline" for environment troubleshooting is a developer copy-pasting an error into an LLM without giving it sandbox execution capabilities. 

To see this baseline fail, you can run the agent in a purely theoretical mode by inspecting a broken directory without execution rights:

```bash
# This simply guesses the fix without verifying it
npm run start -- inspect ./tests/fixtures/broken-project
```
*Expected Output:* The LLM will guess the language and framework, but cannot confidently resolve complex underlying dependency errors because it cannot run `npm run build`.

## 3. Running the DevFix Agent

To see the DevFix agent fully succeed using its Deterministic Verifier Sandbox, you can run our visual demonstration command on a specific benchmark case.

```bash
npm run start -- demo DEV-02
```

*Expected Output:* You will see the agent's internal thought process streamed to your terminal. It will spawn a Docker container, realize an environment variable is missing, create a `.env` file, re-run the build, and successfully exit once it mathematically proves the fix worked.

### Running the Full Benchmark Evaluation

To reproduce our full 80% recovery rate claim across all 10 complex cases, run the complete benchmark suite:

```bash
npm run start -- benchmark
```

- **Approximate Runtime:** 5 to 15 minutes (depending on LLM API speed and Docker overhead).
- **Approximate Cost:** $0.015 (using DeepSeek-Chat).
- **Expected Output:** A beautifully formatted ASCII table summarizing the Recovery Rate, Average Iterations, and Cost, along with a detailed JSON trajectory report saved to the `artifacts/benchmark/` directory.

## 4. Agent Trajectories

If you do not wish to run the tool yourself, you can review the exact, unedited JSON trajectories of the agent's thought process and tool usage.

Run the `benchmark` command locally, and open the generated `artifacts/benchmark/<id>.json` file. This file contains every prompt, every tool response, and every bash command the agent executed to reach its conclusion.
