import OpenAI from 'openai';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class LLMProvider {
  constructor(config = {}) {
    this.providerType = config.LLM_PROVIDER || process.env.LLM_PROVIDER || 'deepseek';
    this.modelName = config.LLM_MODEL || process.env.LLM_MODEL || 'deepseek-chat';
    this.apiKey = config.LLM_API_KEY || process.env.LLM_API_KEY;

    if (!this.apiKey) {
      throw new Error("LLM_API_KEY is required but was not provided.");
    }

    if (this.providerType === 'deepseek') {
      this.client = new OpenAI({
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: this.apiKey,
      });
    } else if (this.providerType === 'openai') {
      this.client = new OpenAI({
        apiKey: this.apiKey,
      });
    } else {
      throw new Error(`Unsupported LLM_PROVIDER: ${this.providerType}`);
    }
  }

  // Scrubs the API key from error messages
  _scrubError(err) {
    if (!err) return err;
    let message = err.message || String(err);
    if (this.apiKey) {
      message = message.split(this.apiKey).join('***REDACTED_API_KEY***');
    }
    const safeError = new Error(message);
    safeError.status = err.status;
    return safeError;
  }

  async chat(messages, tools) {
    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.modelName,
          messages: messages,
          tools: tools,
          tool_choice: 'auto',
          temperature: 0.1,
        });
        
        const message = response.choices[0].message;
        const toolCalls = message.tool_calls || [];
        const content = message.content || "";
        
        return {
          content,
          toolCalls: toolCalls.map(tc => ({
            id: tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments // raw JSON string
          })),
          usage: response.usage
        };
      } catch (err) {
        attempt++;
        const safeError = this._scrubError(err);
        const status = safeError.status;

        // Permanent errors (400, 401, 403, 404)
        if (status && (status === 400 || status === 401 || status === 403 || status === 404)) {
          throw safeError;
        }

        if (attempt > MAX_RETRIES) {
          throw safeError;
        }
        
        // Exponential backoff
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt - 1)));
      }
    }
  }
}
