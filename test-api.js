import { LLMProvider } from './src/llm/Provider.js';
import dotenv from 'dotenv';
dotenv.config();

const provider = new LLMProvider();
provider.chat([{role: 'user', content: 'hello'}])
  .then(() => console.log('SUCCESS'))
  .catch(err => {
    console.error('EXACT ERROR:', err.message);
  });
