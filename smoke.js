import dotenv from 'dotenv';
import { AgentController } from './src/agent/Controller.js';

dotenv.config();

async function runSmokeTest() {
  console.log("Starting Production Agent Smoke Test...");
  
  if (!process.env.GEMINI_API_KEY && !process.env.LLM_API_KEY) {
    console.error("No API Key found. Skipping smoke test.");
    process.exit(0);
  }

  // Use DeepSeek config. In our `.env` it might be `GEMINI_API_KEY` for open-ai compatible.
  const apiKey = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY;

  const controller = new AgentController({
    LLM_PROVIDER: 'deepseek',
    LLM_MODEL: 'deepseek-chat',
    LLM_API_KEY: apiKey,
    maxIterations: 5 // Small limit for smoke test
  });

  const result = await controller.run({
    initialFailure: "The file /tmp/hello.txt does not exist. Please create it with the content 'hello smoke test' and verify using 'cat /tmp/hello.txt'.",
    projectContext: "You are in a minimal alpine linux environment.",
    verifierConfig: {
      type: 'process',
      command: 'grep "hello smoke test" /tmp/hello.txt',
      expectedExitCode: 0,
      timeoutMs: 5000
    }
  });

  console.log("SMOKE TEST RESULT:");
  console.log(JSON.stringify(result, null, 2));

  if (result.finalStatus === 'SUCCESS') {
    console.log("✅ Smoke test passed!");
    process.exit(0);
  } else {
    console.error("❌ Smoke test failed!");
    process.exit(1);
  }
}

runSmokeTest();
