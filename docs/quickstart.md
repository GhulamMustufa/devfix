# Quick Start

Get up and running with DevFix in just a few minutes.

## 1. Installation

DevFix is published to NPM. You can install it globally on your system using your preferred package manager:

```bash
npm install -g devfix
```

To verify the installation was successful, check the version:

```bash
devfix --version
```

## 2. Inspecting Your Environment

Before fixing an environment, DevFix can inspect your current directory to automatically detect what language and framework you are running (Node.js, TypeScript, Python, etc.).

Run the following command in any project directory:

```bash
devfix inspect .
```

*Note: The `inspect` command is completely read-only. It scans your lockfiles and configurations but will never execute arbitrary code.*

## 3. Fixing an Environment (Coming Soon)

The core autonomous fixing engine is currently optimized for our internal 10-case benchmark suite and is actively being generalized for public, arbitrary projects. 

Soon, you will be able to run:

```bash
devfix fix .
```

And DevFix will securely spin up an isolated Docker container, diagnose the failure, and autonomously apply code patches and bash commands until your build succeeds!

## 4. Run the Benchmark

If you want to see DevFix in action **right now**, you can execute our rigorous 10-case failure benchmark locally. This will download broken project cases and attempt to fix them autonomously.

```bash
devfix benchmark
```

*(Warning: The benchmark requires Docker to be installed and running on your host machine, and requires a valid API key for your LLM provider).*

## 5. Supported LLM Providers

DevFix uses **DeepSeek** (`deepseek-chat`) by default as it provides the most cost-effective tool-calling capabilities. However, you can use any provider you want!

Set the following environment variables in your `.env` file or export them in your terminal:

```bash
# Example for OpenAI
export LLM_PROVIDER="openai"
export LLM_MODEL="gpt-4o"
export LLM_API_KEY="sk-..."

# Example for Groq
export LLM_PROVIDER="groq"
export LLM_MODEL="llama3-70b-8192"
export LLM_API_KEY="gsk_..."
```

**Supported Providers:**
- `deepseek` (Default)
- `openai`
- `groq`
- `openrouter`
- `custom` (Use this for local models like Ollama, or LMStudio. You must provide `LLM_BASE_URL`).
