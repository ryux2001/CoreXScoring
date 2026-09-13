import { describe, expect, it, vi } from "vitest";
import { getDisabledAiProviders, isAiDisabled, isAiProviderDisabled } from "@/lib/ai/kill-switch";

describe("AI kill switches", () => {
  it("disables the whole gateway when requested", () => {
    vi.stubEnv("AI_DISABLED", "true");
    expect(isAiDisabled()).toBe(true);
  });

  it("parses provider switches without exposing secret values", () => {
    vi.stubEnv("AI_DISABLED_PROVIDERS", "groq, OPENROUTER, unknown");
    expect(isAiProviderDisabled("groq")).toBe(true);
    expect(isAiProviderDisabled("openrouter")).toBe(true);
    expect(isAiProviderDisabled("local")).toBe(false);
    expect(getDisabledAiProviders()).toEqual(["groq", "openrouter"]);
  });
});
