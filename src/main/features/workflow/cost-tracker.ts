/**
 * Cost Tracker — Estimate Claude API costs from token usage
 */

interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

const PRICING: Record<string, ModelPricing> = {
  'claude-opus': { inputPer1M: 15.0, outputPer1M: 75.0 },
  'claude-sonnet': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-haiku': { inputPer1M: 0.25, outputPer1M: 1.25 },
  default: { inputPer1M: 3.0, outputPer1M: 15.0 },
};

export interface CostTracker {
  estimateCost: (inputTokens: number, outputTokens: number, model?: string) => CostEstimate;
  formatCost: (usd: number) => string;
}

export function createCostTracker(): CostTracker {
  return {
    estimateCost(inputTokens, outputTokens, model) {
      const pricing = (model ? PRICING[model] : undefined) ?? PRICING.default;
      const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
      const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;

      return {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCostUsd: Math.round((inputCost + outputCost) * 100) / 100,
      };
    },

    formatCost(usd) {
      if (usd < 0.01) {
        return '<$0.01';
      }
      return `$${usd.toFixed(2)}`;
    },
  };
}
