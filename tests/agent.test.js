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
});
