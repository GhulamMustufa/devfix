import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AgentController } from '../src/agent/Controller.js';

class MockSandbox {
  async start() {}
  async stop() {}
}

class MockRegistry {
  constructor() {
    this.executeToolResult = { success: true, responseStr: "Patched" };
  }
  getSchemas() { return [{ type: 'function', function: { name: 'patch_file', arguments: {} } }]; }
  async executeTool() { return this.executeToolResult; }
}

describe('Production Agent Controller', () => {

  test('Successful verifier termination', async (t) => {
    let callCount = 0;
    const mockVerifier = async () => ({ success: true, details: "Verified" });
    const registry = new MockRegistry();
    
    const controller = new AgentController({ 
      maxIterations: 5, 
      LLM_PROVIDER: 'deepseek', 
      LLM_API_KEY: 'test',
      SandboxClass: MockSandbox,
      ToolRegistryClass: class { getSchemas() { return registry.getSchemas(); } async executeTool(n, a) { return registry.executeTool(n, a); } },
      verifierFn: mockVerifier
    });
    
    t.mock.method(controller.provider, 'chat', async () => {
      callCount++;
      return {
        content: "Trying to fix...",
        toolCalls: [{ id: `tc_${callCount}`, name: 'patch_file', arguments: '{"filepath": "/a", "start_line": 1, "end_line": 1, "replacement": "a"}' }],
        usage: {}
      };
    });

    const result = await controller.run({
      initialFailure: "Broken",
      projectContext: "Context",
      verifierConfig: { type: 'process', command: 'test' }
    });

    assert.strictEqual(result.finalStatus, 'SUCCESS');
    assert.strictEqual(result.iterations, 1);
    assert.strictEqual(result.toolCalls, 1);
    assert.strictEqual(result.verificationAttempts, 1);
  });

  test('Maximum iteration termination', async (t) => {
    const mockVerifier = async () => ({ success: false, details: "Not verified" });
    const registry = new MockRegistry();
    
    const controller = new AgentController({ 
      maxIterations: 3, 
      LLM_PROVIDER: 'deepseek', 
      LLM_API_KEY: 'test',
      SandboxClass: MockSandbox,
      ToolRegistryClass: class { getSchemas() { return registry.getSchemas(); } async executeTool(n, a) { return registry.executeTool(n, a); } },
      verifierFn: mockVerifier
    });
    
    let callCount = 0;
    t.mock.method(controller.provider, 'chat', async () => {
      callCount++;
      return {
        content: "Not state changing...",
        toolCalls: [{ id: `tc_${callCount}`, name: 'read_file', arguments: `{"filepath": "/a${callCount}"}` }],
        usage: {}
      };
    });

    const result = await controller.run({
      initialFailure: "Broken",
      projectContext: "Context",
      verifierConfig: { type: 'process', command: 'test' }
    });

    assert.strictEqual(result.finalStatus, 'MAX_ITERATIONS');
    assert.strictEqual(result.iterations, 3);
  });

  test('Duplicate action detection', async (t) => {
    const mockVerifier = async () => ({ success: false });
    const registry = new MockRegistry();
    
    const controller = new AgentController({ 
      maxIterations: 5, 
      LLM_PROVIDER: 'deepseek', 
      LLM_API_KEY: 'test',
      SandboxClass: MockSandbox,
      ToolRegistryClass: class { getSchemas() { return registry.getSchemas(); } async executeTool(n, a) { return registry.executeTool(n, a); } },
      verifierFn: mockVerifier
    });
    
    t.mock.method(controller.provider, 'chat', async () => {
      return {
        content: "Spamming same action",
        toolCalls: [{ id: `tc_spam`, name: 'read_file', arguments: '{"filepath": "/test"}' }],
        usage: {}
      };
    });

    const result = await controller.run({
      initialFailure: "Broken",
      projectContext: "Context",
      verifierConfig: { type: 'process', command: 'test' }
    });

    assert.strictEqual(result.finalStatus, 'REPEATED_ACTION');
    assert.strictEqual(result.iterations, 3);
  });

  test('Malformed tool call recovery', async (t) => {
    const mockVerifier = async () => ({ success: true });
    const registry = new MockRegistry();
    
    const controller = new AgentController({ 
      maxIterations: 3, 
      LLM_PROVIDER: 'deepseek', 
      LLM_API_KEY: 'test',
      SandboxClass: MockSandbox,
      ToolRegistryClass: class { getSchemas() { return registry.getSchemas(); } async executeTool(n, a) { return registry.executeTool(n, a); } },
      verifierFn: mockVerifier
    });
    
    let callCount = 0;
    t.mock.method(controller.provider, 'chat', async () => {
      callCount++;
      if (callCount === 1) {
        return {
          content: "Oops",
          toolCalls: [{ id: `tc_bad`, name: 'read_file', arguments: '{bad_json}' }],
          usage: {}
        };
      } else {
        return {
          content: "Fixed",
          toolCalls: [{ id: `tc_good`, name: 'patch_file', arguments: '{"filepath": "/a", "start_line": 1, "end_line": 1, "replacement": "a"}' }],
          usage: {}
        };
      }
    });

    const result = await controller.run({
      initialFailure: "Broken",
      projectContext: "Context",
      verifierConfig: { type: 'process', command: 'test' }
    });

    assert.strictEqual(result.finalStatus, 'SUCCESS');
    assert.strictEqual(result.iterations, 2);
    assert.strictEqual(result.invalidToolCalls, 1);
    assert.strictEqual(result.validToolCalls, 1);
  });

  test('Provider permanent error', async (t) => {
    const controller = new AgentController({ 
      maxIterations: 5, 
      LLM_PROVIDER: 'deepseek', 
      LLM_API_KEY: 'test',
      SandboxClass: MockSandbox,
      ToolRegistryClass: MockRegistry,
      verifierFn: async () => ({})
    });
    
    t.mock.method(controller.provider, 'chat', async () => {
      const err = new Error('Auth failed');
      err.status = 401;
      throw err;
    });

    const result = await controller.run({
      initialFailure: "Broken",
      projectContext: "Context",
      verifierConfig: { type: 'process', command: 'test' }
    });

    assert.strictEqual(result.finalStatus, 'PROVIDER_ERROR');
    assert.strictEqual(result.providerErrors, 1);
  });

  test('Context truncation prunes atomic turns without orphaning tool calls or tool results', async () => {
    const { pruneMessages, calculateContextLength } = await import('../src/agent/context.js');

    const largeContent = 'X'.repeat(500);
    const messages = [
      { role: 'system', content: 'system instruction' },
      { role: 'user', content: 'initial failure' },
      // Turn 1: Assistant with 2 tool calls, followed by 2 tool results
      {
        role: 'assistant',
        content: largeContent,
        tool_calls: [
          { id: 'call_1', function: { name: 'read_file', arguments: '{}' } },
          { id: 'call_2', function: { name: 'read_file', arguments: '{}' } },
        ],
      },
      { role: 'tool', tool_call_id: 'call_1', name: 'read_file', content: largeContent },
      { role: 'tool', tool_call_id: 'call_2', name: 'read_file', content: largeContent },
      { role: 'user', content: 'Verification Failed:\nTurn 1 failed' },
      // Turn 2: Assistant with 1 tool call
      {
        role: 'assistant',
        content: largeContent,
        tool_calls: [
          { id: 'call_3', function: { name: 'patch_file', arguments: '{}' } },
        ],
      },
      { role: 'tool', tool_call_id: 'call_3', name: 'patch_file', content: largeContent },
      { role: 'user', content: 'Verification Failed:\nTurn 2 failed' },
      // Turn 3: Most recent turn
      {
        role: 'assistant',
        content: 'latest plan',
        tool_calls: [
          { id: 'call_4', function: { name: 'execute_command', arguments: '{}' } },
        ],
      },
      { role: 'tool', tool_call_id: 'call_4', name: 'execute_command', content: 'ok' },
    ];

    // Force pruning by specifying maxTotalLength smaller than total
    const pruned = pruneMessages(messages, 1500, 1);

    // 1. Header (system and initial user) must be intact
    assert.strictEqual(pruned[0].role, 'system');
    assert.strictEqual(pruned[1].role, 'user');
    assert.strictEqual(pruned[1].content, 'initial failure');

    // 2. Notice should be present
    assert(pruned.some((m) => m.content && m.content.includes('trimmed to conserve context')));

    // 3. Verify protocol integrity: EVERY assistant tool_call has matching tool messages
    // AND every tool message has a preceding assistant with matching tool_call_id
    const assistantToolCallIds = new Set();
    const toolResultIds = new Set();

    for (let i = 0; i < pruned.length; i++) {
      const msg = pruned[i];
      if (msg.role === 'assistant' && Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          assistantToolCallIds.add(tc.id);
        }
      } else if (msg.role === 'tool') {
        assert(
          assistantToolCallIds.has(msg.tool_call_id),
          `Orphaned tool message found: ${msg.tool_call_id} has no preceding assistant call`
        );
        toolResultIds.add(msg.tool_call_id);
      }
    }

    // Every declared tool call must have a corresponding tool result
    for (const id of assistantToolCallIds) {
      assert(
        toolResultIds.has(id),
        `Orphaned tool call found: ${id} has no matching tool response message`
      );
    }

    // Turn 1 should be gone, Turn 3 should still be present
    assert(!assistantToolCallIds.has('call_1'));
    assert(!assistantToolCallIds.has('call_2'));
    assert(assistantToolCallIds.has('call_4'));
  });
});
