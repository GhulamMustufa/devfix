import test from 'node:test';
import assert from 'node:assert';
import { AgentController } from '../src/agent/Controller.js';

class MockSandbox {
  async start() {}
  async stop() {}
  async execute() { return { exit_code: 0, stdout: '', stderr: '' }; }
  async executeArgs() { return { exit_code: 0, stdout: '', stderr: '' }; }
}

test('Phase 2 — SIGINT Handling, Process Cancellation and Resource Cleanup', async (t) => {
  await t.test('controller.cancel() method exists and terminates execution with USER_ABORTED', async () => {
    let call = 0;
    const controller = new AgentController({
      maxIterations: 10,
      LLM_PROVIDER: 'deepseek',
      LLM_API_KEY: 'test',
      SandboxClass: MockSandbox,
      ToolRegistryClass: class {
        getSchemas() { return [{ type: 'function', function: { name: 'patch_file', parameters: {} } }]; }
        async executeTool() { return { success: true }; }
      },
      verifierFn: async () => ({ success: false }),
    });

    assert.strictEqual(typeof controller.cancel, 'function');

    controller.provider.chat = async () => {
      call++;
      if (call === 1) {
        // Trigger cancellation while agent is in flight
        controller.cancel();
        return {
          content: 'Running first step',
          toolCalls: [{ id: 'c1', name: 'patch_file', arguments: '{}' }],
          usage: {},
        };
      }
      return { content: 'Should not reach here', toolCalls: [], usage: {} };
    };

    const result = await controller.run({
      initialFailure: 'broken',
      projectContext: 'test',
      verifierConfig: { type: 'process', command: 'test' },
    });

    assert.strictEqual(result.finalStatus, 'USER_ABORTED');
    assert.strictEqual(controller.isCancelled, true);
  });

  await t.test('signal listeners on SIGINT/SIGTERM are detached after run finalization', async () => {
    const sigintListenersBefore = process.listenerCount('SIGINT');

    const controller = new AgentController({
      maxIterations: 1,
      LLM_PROVIDER: 'deepseek',
      LLM_API_KEY: 'test',
      SandboxClass: MockSandbox,
      ToolRegistryClass: class {
        getSchemas() { return []; }
        async executeTool() { return { success: true }; }
      },
      verifierFn: async () => ({ success: true }),
    });

    // Constructor added 1 listener
    assert.strictEqual(process.listenerCount('SIGINT'), sigintListenersBefore + 1);

    controller.provider.chat = async () => ({
      content: 'immediate done',
      toolCalls: [],
      usage: {},
    });

    await controller.run({
      initialFailure: 'broken',
      projectContext: 'test',
      verifierConfig: { type: 'process', command: 'test' },
    });

    const sigintListenersAfter = process.listenerCount('SIGINT');
    assert.strictEqual(
      sigintListenersAfter,
      sigintListenersBefore,
      'SIGINT listener must be cleanly detached after finalization'
    );
  });
});
