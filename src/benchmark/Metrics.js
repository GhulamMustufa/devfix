export class Metrics {
  static calculate(results) {
    if (!results || results.length === 0) {
      return {
        totalCases: 0,
        verifiedRepairs: 0,
        successRate: '0%',
        avgIterations: 0,
        avgRepairTimeSec: 0,
        toolReliability: '0%',
        avgTokens: 0,
        costString: 'N/A'
      };
    }

    const totalCases = results.length;
    let verifiedRepairs = 0;
    let sumIterations = 0;
    let sumDurationMs = 0;
    let sumValidTools = 0;
    let sumInvalidTools = 0;
    let sumPromptTokens = 0;
    let sumCompletionTokens = 0;

    results.forEach(run => {
      if (run.finalStatus === 'SUCCESS') {
        verifiedRepairs++;
      }
      
      sumIterations += (run.iterations || 0);
      sumDurationMs += (run.durationMs || 0);
      
      sumValidTools += (run.validToolCalls || 0);
      sumInvalidTools += (run.invalidToolCalls || 0);

      if (run.tokenUsage) {
        sumPromptTokens += (run.tokenUsage.prompt_tokens || 0);
        sumCompletionTokens += (run.tokenUsage.completion_tokens || 0);
      }
    });

    const successRate = totalCases > 0 ? ((verifiedRepairs / totalCases) * 100).toFixed(1) + '%' : '0%';
    const avgIterations = totalCases > 0 ? (sumIterations / totalCases).toFixed(1) : 0;
    const avgRepairTimeSec = totalCases > 0 ? (sumDurationMs / totalCases / 1000).toFixed(1) : 0;
    
    const totalTools = sumValidTools + sumInvalidTools;
    const toolReliability = totalTools > 0 ? ((sumValidTools / totalTools) * 100).toFixed(1) + '%' : 'N/A';
    
    const sumTotalTokens = sumPromptTokens + sumCompletionTokens;
    const avgTokens = totalCases > 0 ? Math.round(sumTotalTokens / totalCases) : 0;

    let costString = 'N/A';
    
    // Calculate cost based on DeepSeek pricing if the provider is deepseek
    // deepseek-chat pricing: $0.14 per 1M input tokens, $0.28 per 1M output tokens
    const sampleRun = results.find(r => r.provider);
    const provider = sampleRun ? sampleRun.provider : null;
    const model = sampleRun ? sampleRun.model : null;
    
    if (provider === 'deepseek' && model === 'deepseek-chat') {
      const inputCost = (sumPromptTokens / 1000000) * 0.14;
      const outputCost = (sumCompletionTokens / 1000000) * 0.28;
      const totalCost = inputCost + outputCost;
      if (totalCost > 0) {
        costString = `$${totalCost.toFixed(4)}`;
      }
    }

    return {
      totalCases,
      verifiedRepairs,
      successRate,
      avgIterations,
      avgRepairTimeSec,
      toolReliability,
      avgTokens,
      costString,
      sumPromptTokens,
      sumCompletionTokens,
      sumTotalTokens
    };
  }
}
