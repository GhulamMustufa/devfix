import dotenv from 'dotenv';
dotenv.config();
const key = process.env.GEMINI_API_KEY;
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      console.log('API Error:', data.error.message.replace(key, '[REDACTED]'));
      console.log('Status:', data.error.code);
    } else {
      console.log('Models available:', data.models.map(m => m.name).join(', '));
    }
  })
  .catch(err => console.log('Fetch error', err));
