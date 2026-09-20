import { afterEach, describe, expect, it, vi } from "vitest";
import { getAllowedAiChatModels, isByokEnabled } from "@/lib/ai/chat-settings";
import { isChatRequest } from "@/lib/ai/types";
import { createLocalizedMetadata, createNoIndexMetadata } from "@/lib/seo/metadata";

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

  it("keeps BYOK disabled unless explicitly enabled", () => {
    expect(isByokEnabled()).toBe(false);
    vi.stubEnv("AI_BYOK_ENABLED", "false");
    expect(isByokEnabled()).toBe(false);
    vi.stubEnv("AI_BYOK_ENABLED", "true");
    expect(isByokEnabled()).toBe(true);
  });

  it("generates canonical and alternate URLs without an /en prefix", () => {
    const metadata = createLocalizedMetadata({
      locale: "es",
      pathname: "/catalog",
      title: "Catálogo",
      description: "Componentes",
    });

    expect(metadata.alternates).toEqual({
      canonical: "https://corexscoring.com/es/catalog",
      languages: {
        en: "https://corexscoring.com/catalog",
        es: "https://corexscoring.com/es/catalog",
      },
    });
    expect(JSON.stringify(metadata)).not.toContain("/en/");
  });

  it("marks interactive comparator and private areas as non-indexable", () => {
    const metadata = createNoIndexMetadata();
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });
});
