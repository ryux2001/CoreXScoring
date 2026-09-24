import { describe, expect, it } from "vitest";
import { createRecommendationState, getRecommendationStateMessage, mergeRecommendationState, normalizeRecommendationState } from "@/lib/ai/recommendation-state";

describe("structured recommendation state", () => {
  it("keeps partial build criteria across turns", () => {
    const first = mergeRecommendationState(undefined, "build", {
      criteria: { useCase: "gaming", workloads: ["Juegos AAA"] },
    });
    const second = mergeRecommendationState(first, "build", {
      criteria: { budget: 700, currency: "USD", resolution: "1080p", priority: "value" },
    });

    expect(first.phase).toBe("collecting");
    expect(first.criteria.workloads).toEqual(["Juegos AAA"]);
    expect(second.phase).toBe("ready");
    expect(second.criteria).toMatchObject({ budget: 700, useCase: "gaming", resolution: "1080p", priority: "value" });
    expect(second.missingFields).toEqual([]);
  });

  it("retains component roles and user prices without side effects", () => {
    const state = mergeRecommendationState(createRecommendationState("build"), "build", {
      components: { gpu: { query: "RTX 5070", role: "required", customPrice: 380, currency: "USD" } },
      preferredBrands: ["NVIDIA"],
      market: "used",
    });

    expect(state.constraints.components.gpu).toEqual({ query: "RTX 5070", role: "required", customPrice: 380, currency: "USD" });
    expect(state.constraints.preferredBrands).toEqual(["NVIDIA"]);
    expect(state.constraints.market).toBe("used");
  });

  it("normalizes persisted version 2 state and ignores malformed state", () => {
    const state = mergeRecommendationState(undefined, "combo", { criteria: { budget: 500, useCase: "gaming" } });
    expect(normalizeRecommendationState(state)).toMatchObject({ version: 2, mode: "combo", criteria: { budget: 500, useCase: "gaming" } });
    expect(state.constraints.market).toBe("new");
    expect(normalizeRecommendationState({ ...state, constraints: { ...state.constraints, market: "any" } })).toMatchObject({ constraints: { market: "new" } });
    expect(normalizeRecommendationState({ version: 1, mode: "combo" })).toBeUndefined();
  });

  it("describes only the remaining minimum fields", () => {
    const state = mergeRecommendationState(undefined, "build", { criteria: { useCase: "gaming" } });
    expect(getRecommendationStateMessage(state)).toContain("presupuesto total");
    expect(getRecommendationStateMessage(state)).not.toContain("uso principal");
  });
});
