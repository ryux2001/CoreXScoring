export const OPENROUTER_BUDGET_LIMITS = {
  dailyMicrousd: 500_000,
  monthlyMicrousd: 5_000_000,
  alertThresholds: [70, 90] as const,
};

export const OPENROUTER_MODEL_PRICES = {
  "openai/gpt-oss-20b": {
    inputMicrousdPerMillion: 30_000,
    outputMicrousdPerMillion: 130_000,
  },
} as const;

export type BudgetPeriod = "day" | "month";
export type BudgetAlertThreshold = (typeof OPENROUTER_BUDGET_LIMITS.alertThresholds)[number];

export function calculateOpenRouterCostMicrousd(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = OPENROUTER_MODEL_PRICES[model as keyof typeof OPENROUTER_MODEL_PRICES];
  if (!price || !Number.isFinite(inputTokens) || !Number.isFinite(outputTokens) || inputTokens < 0 || outputTokens < 0) return null;
  return Math.ceil(inputTokens * price.inputMicrousdPerMillion / 1_000_000)
    + Math.ceil(outputTokens * price.outputMicrousdPerMillion / 1_000_000);
}

export function canReserveOpenRouterBudget({
  costMicrousd,
  dailyUsedMicrousd,
  monthlyUsedMicrousd,
}: {
  costMicrousd: number;
  dailyUsedMicrousd: number;
  monthlyUsedMicrousd: number;
}): boolean {
  return Number.isFinite(costMicrousd)
    && costMicrousd >= 0
    && dailyUsedMicrousd + costMicrousd <= OPENROUTER_BUDGET_LIMITS.dailyMicrousd
    && monthlyUsedMicrousd + costMicrousd <= OPENROUTER_BUDGET_LIMITS.monthlyMicrousd;
}

export function getTriggeredBudgetAlerts({
  period,
  usedMicrousd,
  emittedThresholds = [],
}: {
  period: BudgetPeriod;
  usedMicrousd: number;
  emittedThresholds?: readonly BudgetAlertThreshold[];
}): Array<{ period: BudgetPeriod; thresholdPercent: BudgetAlertThreshold; usedMicrousd: number; limitMicrousd: number }> {
  const limitMicrousd = period === "day" ? OPENROUTER_BUDGET_LIMITS.dailyMicrousd : OPENROUTER_BUDGET_LIMITS.monthlyMicrousd;
  return OPENROUTER_BUDGET_LIMITS.alertThresholds
    .filter((threshold) => usedMicrousd >= limitMicrousd * threshold / 100 && !emittedThresholds.includes(threshold))
    .map((threshold) => ({ period, thresholdPercent: threshold, usedMicrousd, limitMicrousd }));
}

export function buildResendBudgetAlert({
  period,
  thresholdPercent,
  usedMicrousd,
  limitMicrousd,
  to,
  from,
}: {
  period: BudgetPeriod;
  thresholdPercent: BudgetAlertThreshold;
  usedMicrousd: number;
  limitMicrousd: number;
  to: string;
  from: string;
}): { from: string; to: string; subject: string; html: string } {
  const periodLabel = period === "day" ? "diario" : "mensual";
  const usedUsd = (usedMicrousd / 1_000_000).toFixed(4);
  const limitUsd = (limitMicrousd / 1_000_000).toFixed(2);
  return {
    from,
    to,
    subject: `CoreX AI: presupuesto ${periodLabel} al ${thresholdPercent}%`,
    html: `<p>CoreX AI ha alcanzado el ${thresholdPercent}% del presupuesto ${periodLabel}.</p><p>Uso estimado: $${usedUsd} de $${limitUsd}.</p>`,
  };
}
