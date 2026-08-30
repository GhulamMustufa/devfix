import test from 'node:test';
import assert from 'node:assert';
import { Metrics } from '../src/benchmark/Metrics.js';
import { Reporter } from '../src/benchmark/Reporter.js';

test('Benchmark Metrics Calculation', async (t) => {
  await t.test('calculates correct rates and averages', () => {
    const results = [
      {
        finalStatus: 'SUCCESS',
        iterations: 10,
        durationMs: 20000,
        validToolCalls: 10,
        invalidToolCalls: 0,
        provider: 'deepseek',
        model: 'deepseek-chat',
        tokenUsage: { prompt_tokens: 1000000, completion_tokens: 1000000 }
      },
      {
        finalStatus: 'MAX_ITERATIONS',
        iterations: 15,
        durationMs: 30000,
        validToolCalls: 9,
        invalidToolCalls: 1,
        provider: 'deepseek',
        model: 'deepseek-chat',
        tokenUsage: { prompt_tokens: 1000000, completion_tokens: 1000000 }
      }
    ];

    const metrics = Metrics.calculate(results);
    
    assert.strictEqual(metrics.totalCases, 2);
    assert.strictEqual(metrics.verifiedRepairs, 1);
    assert.strictEqual(metrics.successRate, '50.0%'); // 1/2
    assert.strictEqual(metrics.avgIterations, '12.5'); // (10+15)/2
    assert.strictEqual(metrics.avgRepairTimeSec, '25.0'); // (20+30)/2
    assert.strictEqual(metrics.toolReliability, '95.0%'); // 19 / 20
    
    // cost for 2M input + 2M output
    // 2 * 0.14 + 2 * 0.28 = 0.28 + 0.56 = 0.84
    assert.strictEqual(metrics.costString, '$0.8400');
  });

  await t.test('handles empty results gracefully', () => {
    const metrics = Metrics.calculate([]);
    assert.strictEqual(metrics.totalCases, 0);
    assert.strictEqual(metrics.successRate, '0%');
    assert.strictEqual(metrics.costString, 'N/A');
  });

  await t.test('handles unknown provider cost', () => {
    const results = [{
      finalStatus: 'SUCCESS',
      provider: 'unknown-provider',
      tokenUsage: { prompt_tokens: 1000, completion_tokens: 1000 }
    }];
    const metrics = Metrics.calculate(results);
    assert.strictEqual(metrics.costString, 'N/A');
  });
});

test('Benchmark Reporter Output', async (t) => {
  await t.test('generates terminal report accurately', () => {
    const results = [{
      project: 'DEV-01',
      finalStatus: 'SUCCESS',
      iterations: 5,
      durationMs: 10000,
      provider: 'deepseek',
      model: 'deepseek-chat'
    }];
    const metrics = Metrics.calculate(results);
    const output = Reporter.generateTerminalReport(results, metrics, 'test-run');
    
    assert(output.includes('DEVFIX BENCHMARK'));
    assert(output.includes('DEV-01'));
    assert(output.includes('SUCCESS'));
    assert(output.includes('100.0%'));
  });
});
