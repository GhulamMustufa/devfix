import { test, describe } from 'node:test';
import assert from 'node:assert';
import { LLMProvider, resolveProviderConfig } from '../src/llm/Provider.js';

function withEnv(vars, fn) {
  const backup = {};
  for (const key of Object.keys(vars)) {
    backup[key] = process.env[key];
    if (vars[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = vars[key];
    }
  }
  try {
    return fn();
  } finally {
    for (const [key, val] of Object.entries(backup)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
  }
}

describe('LLMProvider & Gemini Configuration', () => {
  test('defaults to deepseek when no env vars are set', () => {
    withEnv(
      { LLM_PROVIDER: undefined, LLM_MODEL: undefined, LLM_API_KEY: undefined, GEMINI_API_KEY: undefined },
      () => {
        const resolved = resolveProviderConfig();
        assert.strictEqual(resolved.providerType, 'deepseek');
        assert.strictEqual(resolved.modelName, 'deepseek-chat');
        assert.strictEqual(resolved.apiKey, undefined);
      }
    );
  });

  test('auto-selects gemini when only GEMINI_API_KEY is set', () => {
    withEnv(
      { LLM_PROVIDER: undefined, LLM_MODEL: undefined, LLM_API_KEY: undefined, GEMINI_API_KEY: 'AIzaTestKey12345678901234567890' },
      () => {
        const resolved = resolveProviderConfig();
        assert.strictEqual(resolved.providerType, 'gemini');
        assert.strictEqual(resolved.modelName, 'gemini-3.8-flash');
        assert.strictEqual(resolved.apiKey, 'AIzaTestKey12345678901234567890');
        assert.strictEqual(resolved.baseURL, 'https://generativelanguage.googleapis.com/v1beta/openai');
      }
    );
  });

  test('uses GEMINI_API_KEY over unrelated LLM_API_KEY when LLM_PROVIDER=gemini', () => {
    withEnv(
      {
        LLM_PROVIDER: 'gemini',
        LLM_MODEL: undefined,
        LLM_API_KEY: 'sk-old-deepseek-key',
        GEMINI_API_KEY: 'AIzaGeminiKey12345678901234567890',
      },
      () => {
        const provider = new LLMProvider();
        assert.strictEqual(provider.providerType, 'gemini');
        assert.strictEqual(provider.modelName, 'gemini-3.8-flash');
        assert.strictEqual(provider.apiKey, 'AIzaGeminiKey12345678901234567890');
      }
    );
  });

  test('supports explicit LLM_API_KEY with LLM_PROVIDER=gemini', () => {
    withEnv(
      {
        LLM_PROVIDER: 'gemini',
        LLM_MODEL: 'gemini-2.5-pro',
        LLM_API_KEY: 'AIzaDirectKey12345678901234567890',
        GEMINI_API_KEY: undefined,
      },
      () => {
        const provider = new LLMProvider();
        assert.strictEqual(provider.providerType, 'gemini');
        assert.strictEqual(provider.modelName, 'gemini-2.5-pro');
        assert.strictEqual(provider.apiKey, 'AIzaDirectKey12345678901234567890');
      }
    );
  });

  test('chat() omits tools and tool_choice when tools are not provided', async (t) => {
    const provider = new LLMProvider({
      LLM_PROVIDER: 'gemini',
      LLM_API_KEY: 'AIzaFakeKey12345678901234567890',
    });

    let capturedPayload = null;
    t.mock.method(provider.client.chat.completions, 'create', async (payload) => {
      capturedPayload = payload;
      return {
        choices: [{ message: { content: 'hello', tool_calls: [] } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };
    });

    const res = await provider.chat([{ role: 'user', content: 'hi' }]);
    assert.strictEqual(res.content, 'hello');
    assert.strictEqual('tools' in capturedPayload, false);
    assert.strictEqual('tool_choice' in capturedPayload, false);
  });

  test('chat() normalizes tool_calls with missing id or object arguments', async (t) => {
    const provider = new LLMProvider({
      LLM_PROVIDER: 'gemini',
      LLM_API_KEY: 'AIzaFakeKey12345678901234567890',
    });

    t.mock.method(provider.client.chat.completions, 'create', async () => ({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              { function: { name: 'read_file', arguments: { filepath: 'package.json' } } },
            ],
          },
        },
      ],
      usage: {},
    }));

    const res = await provider.chat(
      [{ role: 'user', content: 'check' }],
      [{ type: 'function', function: { name: 'read_file', parameters: {} } }]
    );
    assert.strictEqual(res.toolCalls.length, 1);
    assert.strictEqual(res.toolCalls[0].id, 'call_0');
    assert.strictEqual(res.toolCalls[0].name, 'read_file');
    assert.strictEqual(res.toolCalls[0].arguments, '{"filepath":"package.json"}');
  });

  test('_scrubError redacts Gemini API keys', () => {
    const secret = 'AIzaSyFakeTestKey1234567890abcdefghijk';
    const provider = new LLMProvider({
      LLM_PROVIDER: 'gemini',
      LLM_API_KEY: secret,
    });
    const err = new Error(`Request failed with key ${secret}`);
    err.status = 401;
    const scrubbed = provider._scrubError(err);
    assert.strictEqual(scrubbed.message, 'Request failed with key ***REDACTED_API_KEY***');
    assert.strictEqual(scrubbed.status, 401);
  });

  test('supports ollama provider with default model, default baseURL, and keyless configuration', () => {
    withEnv(
      {
        LLM_PROVIDER: 'ollama',
        LLM_MODEL: undefined,
        LLM_API_KEY: undefined,
        GEMINI_API_KEY: undefined,
      },
      () => {
        const resolved = resolveProviderConfig();
        assert.strictEqual(resolved.providerType, 'ollama');
        assert.strictEqual(resolved.modelName, 'llama3.2');
        assert.strictEqual(resolved.baseURL, 'http://127.0.0.1:11434/v1');
        assert.strictEqual(resolved.apiKey, 'ollama');

        // Instantiating LLMProvider should not throw for missing key
        const provider = new LLMProvider();
        assert.strictEqual(provider.providerType, 'ollama');
        assert.strictEqual(provider.baseURL, 'http://127.0.0.1:11434/v1');
        assert.strictEqual(provider.modelName, 'llama3.2');
        assert.strictEqual(provider.apiKey, 'ollama');
      }
    );
  });

  test('supports custom local endpoint (LM Studio / vLLM / LocalAI) without requiring API key', () => {
    withEnv(
      {
        LLM_PROVIDER: 'custom',
        LLM_BASE_URL: 'http://localhost:1234/v1',
        LLM_MODEL: 'qwen2.5-coder',
        LLM_API_KEY: undefined,
      },
      () => {
        const resolved = resolveProviderConfig();
        assert.strictEqual(resolved.providerType, 'custom');
        assert.strictEqual(resolved.baseURL, 'http://localhost:1234/v1');
        assert.strictEqual(resolved.apiKey, 'ollama');

        const provider = new LLMProvider();
        assert.strictEqual(provider.baseURL, 'http://localhost:1234/v1');
        assert.strictEqual(provider.modelName, 'qwen2.5-coder');
      }
    );
  });
});
