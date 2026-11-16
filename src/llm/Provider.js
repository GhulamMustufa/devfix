import OpenAI from 'openai';
import { redactString } from '../security/Redactor.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

export const DEFAULT_MODELS = {
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-3.5-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'openai/gpt-4o-mini',
  ollama: 'llama3.2',
  custom: 'local-model',
};

export const PROVIDER_BASE_URLS = {
  deepseek: 'https://api.deepseek.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://127.0.0.1:11434/v1',
};

export function isLocalOrKeylessProvider(providerType, baseURL) {
  if (providerType === 'ollama') return true;
  if (providerType === 'custom' && baseURL) {
    const lower = baseURL.toLowerCase();
    if (
      lower.includes('localhost') ||
      lower.includes('127.0.0.1') ||
      lower.includes('0.0.0.0') ||
      lower.includes('::1')
    ) {
      return true;
    }
  }
  return false;
}

export function resolveProviderConfig(config = {}) {
  const explicitProvider = config.LLM_PROVIDER || process.env.LLM_PROVIDER;
  const explicitKey = config.LLM_API_KEY || process.env.LLM_API_KEY;
  const geminiKey = config.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const openaiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const deepseekKey = config.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;

  let providerType = explicitProvider;
  if (!providerType) {
    if (!explicitKey && geminiKey) {
      providerType = 'gemini';
    } else {
      providerType = 'deepseek';
    }
  }
  providerType = providerType.toLowerCase();

  const modelName =
    config.LLM_MODEL ||
    process.env.LLM_MODEL ||
    DEFAULT_MODELS[providerType] ||
    'deepseek-chat';

  const baseURL =
    providerType === 'custom'
      ? (config.LLM_BASE_URL || process.env.LLM_BASE_URL)
      : PROVIDER_BASE_URLS[providerType];

  let apiKey = config.LLM_API_KEY;
  if (!apiKey) {
    if (providerType === 'gemini') {
      apiKey = config.GEMINI_API_KEY || geminiKey || explicitKey;
    } else if (providerType === 'openai') {
      apiKey = explicitKey || openaiKey;
    } else if (providerType === 'deepseek') {
      apiKey = explicitKey || deepseekKey;
    } else if (isLocalOrKeylessProvider(providerType, baseURL)) {
      // Local/keyless providers (Ollama, local vLLM/LM Studio) do not require real keys,
      // but the OpenAI SDK expects a non-empty string.
      apiKey = explicitKey || 'ollama';
    } else {
      apiKey = explicitKey;
    }
  }

  return { providerType, modelName, apiKey, baseURL };
}

export class LLMProvider {
  constructor(config = {}) {
    const resolved = resolveProviderConfig(config);
    this.providerType = resolved.providerType;
    this.modelName = resolved.modelName;
    this.apiKey = resolved.apiKey;
    this.baseURL = resolved.baseURL;

    const isKeyless = isLocalOrKeylessProvider(this.providerType, this.baseURL);

    if (!this.apiKey && !isKeyless) {
      const hint =
        this.providerType === 'gemini'
          ? 'LLM_API_KEY or GEMINI_API_KEY is required when using the gemini provider.'
          : 'LLM_API_KEY is required but was not provided.';
      throw new Error(hint);
    }

    if (!this.apiKey && isKeyless) {
      this.apiKey = 'ollama';
    }

    this.timeoutMs = config.timeoutMs || DEFAULT_REQUEST_TIMEOUT_MS;

    if (this.providerType === 'custom') {
      if (!this.baseURL) {
        throw new Error("LLM_BASE_URL is required when using the 'custom' provider type.");
      }
      this.client = new OpenAI({
        baseURL: this.baseURL,
        apiKey: this.apiKey,
        timeout: this.timeoutMs,
        maxRetries: 0,
      });
    } else if (this.providerType === 'openai') {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        timeout: this.timeoutMs,
        maxRetries: 0,
      });
    } else if (PROVIDER_BASE_URLS[this.providerType]) {
      this.client = new OpenAI({
        baseURL: this.baseURL,
        apiKey: this.apiKey,
        timeout: this.timeoutMs,
        maxRetries: 0,
      });
    } else {
      throw new Error(
        `Unsupported LLM_PROVIDER: ${this.providerType}. Supported providers: deepseek, openai, gemini, groq, openrouter, ollama, custom.`
      );
    }
  }

  // Scrubs the API key from error messages
  _scrubError(err) {
    if (!err) return err;
    let message = err.message || String(err);
    if (this.apiKey) {
      message = message.split(this.apiKey).join('***REDACTED_API_KEY***');
    }
    message = redactString(message, this.apiKey ? [this.apiKey] : []);

    const safeError = new Error(message);
    safeError.status = err.status;
    return safeError;
  }

  async chat(messages, tools) {
    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
      try {
        const requestParams = {
          model: this.modelName,
          messages: messages,
          temperature: 0.1,
        };

        if (Array.isArray(tools) && tools.length > 0) {
          requestParams.tools = tools;
          requestParams.tool_choice = 'auto';
        }

        const response = await this.client.chat.completions.create(requestParams);

        if (!response || !Array.isArray(response.choices) || response.choices.length === 0) {
          throw new Error('LLM provider returned an empty choices array.');
        }

        const message = response.choices[0].message || {};
        const toolCalls = message.tool_calls || [];
        const content = message.content || "";

        return {
          content,
          toolCalls: toolCalls.map((tc, idx) => ({
            id: tc.id || `call_${idx}`,
            name: tc.function?.name,
            arguments:
              typeof tc.function?.arguments === 'string'
                ? tc.function.arguments
                : JSON.stringify(tc.function?.arguments ?? {}),
            extra_content: tc.extra_content,
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
