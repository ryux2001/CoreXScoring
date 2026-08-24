import { afterEach, describe, expect, it, vi } from "vitest";
import { getAllowedAiChatModels } from "@/lib/ai/chat-settings";
import { isChatRequest } from "@/lib/ai/types";

describe("Fase 7 contracts", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts a saved conversation request with a bounded id", () => {
    expect(isChatRequest({
      messages: [{ role: "user", content: "¿Qué GPU me recomiendas?" }],
      conversationMode: "saved",
      conversationId: "11111111-1111-4111-8111-111111111111",
    })).toBe(true);
  });

  it("rejects an unknown conversation mode", () => {
    expect(isChatRequest({
      messages: [{ role: "user", content: "Hola" }],
      conversationMode: "persistent",
    })).toBe(false);
  });

  it("uses the server allowlist for BYOK models", () => {
    vi.stubEnv("AI_BYOK_OPENROUTER_MODELS", "qwen/custom-flash, qwen/custom-mini");
    expect(getAllowedAiChatModels().openrouter).toEqual(["qwen/custom-flash", "qwen/custom-mini"]);
  });
});
