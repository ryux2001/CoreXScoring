import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIpHash } from "@/lib/ai/limits";
import {
  buildResendBudgetAlert,
  calculateOpenRouterCostMicrousd,
  canReserveOpenRouterBudget,
  getTriggeredBudgetAlerts,
  OPENROUTER_BUDGET_LIMITS,
} from "@/lib/ai/budget";

describe("Stage 5 budget simulation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("calculates configured OpenRouter costs without contacting OpenRouter", () => {
    expect(calculateOpenRouterCostMicrousd("openai/gpt-oss-20b", 120_000, 2_400)).toBe(3_912);
    expect(calculateOpenRouterCostMicrousd("qwen/qwen3.7-flash", 1_000_000, 0, 600_000, 200_000)).toBe(17_200);
    expect(calculateOpenRouterCostMicrousd("openrouter/free", 120_000, 2_400)).toBe(3_912);
    expect(calculateOpenRouterCostMicrousd("unbudgeted/model", 120_000, 2_400)).toBeNull();
    expect(calculateOpenRouterCostMicrousd("qwen/qwen3.7-flash", 100, 0, 60, 60)).toBeNull();
  });

  it("blocks synthetic reservations at either budget boundary", () => {
    expect(canReserveOpenRouterBudget({ costMicrousd: 1, dailyUsedMicrousd: OPENROUTER_BUDGET_LIMITS.dailyMicrousd - 1, monthlyUsedMicrousd: 0 })).toBe(true);
    expect(canReserveOpenRouterBudget({ costMicrousd: 1, dailyUsedMicrousd: OPENROUTER_BUDGET_LIMITS.dailyMicrousd, monthlyUsedMicrousd: 0 })).toBe(false);
    expect(canReserveOpenRouterBudget({ costMicrousd: 1, dailyUsedMicrousd: 0, monthlyUsedMicrousd: OPENROUTER_BUDGET_LIMITS.monthlyMicrousd })).toBe(false);
  });

  it("emits each 70/90 alert once for daily and monthly periods", () => {
    expect(getTriggeredBudgetAlerts({ period: "day", usedMicrousd: 180_000 })).toEqual([
      { period: "day", thresholdPercent: 70, usedMicrousd: 180_000, limitMicrousd: 200_000 },
      { period: "day", thresholdPercent: 90, usedMicrousd: 180_000, limitMicrousd: 200_000 },
    ]);
    expect(getTriggeredBudgetAlerts({ period: "month", usedMicrousd: 1_800_000, emittedThresholds: [70] })).toEqual([
      { period: "month", thresholdPercent: 90, usedMicrousd: 1_800_000, limitMicrousd: 2_000_000 },
    ]);
  });

  it("builds a Resend payload without sending an email or needing a key", () => {
    const payload = buildResendBudgetAlert({ period: "month", thresholdPercent: 70, usedMicrousd: 3_500_000, limitMicrousd: 5_000_000, to: "rynaldobuxeng@gmail.com", from: "onboarding@resend.dev" });
    expect(payload).toMatchObject({ from: "onboarding@resend.dev", to: "rynaldobuxeng@gmail.com", subject: "CoreX AI: presupuesto mensual al 70%" });
    expect(payload.html).toContain("$3.5000");
  });

  it("ignores spoofed forwarded headers until Cloudflare is trusted", () => {
    vi.stubEnv("AI_IP_HASH_SECRET", "a".repeat(32));
    const spoofed = { headers: new Headers({ "x-forwarded-for": "203.0.113.10" }) };
    expect(getClientIpHash(spoofed as never)).toBeNull();

    vi.stubEnv("TRUSTED_PROXY", "cloudflare");
    const trusted = { headers: new Headers({ "cf-connecting-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.12" }) };
    expect(getClientIpHash(trusted as never)).toBeTruthy();
  });
});
