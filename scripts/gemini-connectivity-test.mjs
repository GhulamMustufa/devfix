import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Determine if the environment variable is loaded
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error(JSON.stringify({
    success: false,
    error: 'GEMINI_API_KEY is not defined in the environment'
  }));
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

const modelsToTest = [
  'gemini-2.5-flash',
  'gemini-3.5-flash'
];

async function runTests() {
  const results = [];
  
  for (const modelName of modelsToTest) {
    const startTime = Date.now();
    let result = { model: modelName, sdk: '@google/generative-ai', success: false };
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent('Reply with exactly: GEMINI_OK');
      const text = response.response.text();
      const latency = Date.now() - startTime;
      
      if (text.trim().includes('GEMINI_OK')) {
         result.success = true;
         result.latency = latency;
         result.error = null;
      } else {
         result.success = false;
         result.error = `Unexpected response: ${text.trim().substring(0, 50)}`;
      }
    } catch (error) {
      result.success = false;
      result.error = error.message;
      if (error.status === 404) {
        result.errorCategory = 'Model availability failure or SDK mismatch (404)';
      } else if (error.status === 401 || error.status === 403 || error.message.includes('API key not valid')) {
        result.errorCategory = 'Authentication failure';
      } else {
        result.errorCategory = 'SDK/API incompatibility or other';
      }
    }
    
    // Anonymize key if it leaked in error
    if (result.error && result.error.includes(API_KEY)) {
        result.error = result.error.split(API_KEY).join('[REDACTED_API_KEY]');
    }
    
    results.push(result);
    
    if (result.success) {
      // If one succeeds, we can stop testing
      break;
    }
  }
  
  console.log(JSON.stringify(results, null, 2));
}

runTests();
