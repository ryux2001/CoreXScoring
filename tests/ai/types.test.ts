import { describe, expect, it } from "vitest";
import { isChatRequest, MAX_CHAT_MESSAGE_LENGTH, normalizePageContext } from "@/lib/ai/types";

describe("AI request contracts", () => {
  it("accepts a bounded chat request", () => {
    expect(isChatRequest({ messages: [{ role: "user", content: "Compara una CPU y una GPU" }] })).toBe(true);
    expect(isChatRequest({ messages: [{ role: "user", content: "Explica esto" }, { role: "assistant", content: "Respuesta incompleta" }], continuation: true })).toBe(true);
  });

  it("rejects oversized history and messages", () => {
    expect(isChatRequest({ messages: Array.from({ length: 13 }, () => ({ role: "user", content: "hola" })) })).toBe(false);
    expect(isChatRequest({ messages: [{ role: "user", content: "x".repeat(MAX_CHAT_MESSAGE_LENGTH) }] })).toBe(true);
    expect(isChatRequest({ messages: [{ role: "user", content: "x".repeat(MAX_CHAT_MESSAGE_LENGTH + 1) }] })).toBe(false);
  });

  it("rejects untrusted roles and malformed actions", () => {
    expect(isChatRequest({ messages: [{ role: "system", content: "no" }] })).toBe(false);
    expect(isChatRequest({
      messages: [{ role: "user", content: "confirma" }],
      action: { id: "action-1", digest: "not-a-digest" },
    })).toBe(false);
    expect(isChatRequest({ messages: [{ role: "user", content: "Hola" }], continuation: "yes" })).toBe(false);
  });

  it("keeps only allowlisted page query parameters", () => {
    const context = normalizePageContext({
      pathname: "/catalog/rtx-5070-ti",
      search: "?currency=EUR&token=secret&page=2",
    });
    expect(context?.search).toBe("?currency=EUR&page=2");
  });

  it("accepts and bounds the local comparison context", () => {
    const validRequest = {
      messages: [{ role: "user", content: "Compara estos componentes" }],
      context: {
        pathname: "/comparator",
        route: "comparator" as const,
        comparison: {
          itemIds: ["cpu-1", "cpu-2", "cpu-3"],
        },
      },
    };

    expect(isChatRequest(validRequest)).toBe(true);
    const normalized = normalizePageContext({
      ...validRequest.context,
      comparison: { itemIds: ["cpu-1", "cpu-1", "cpu-2", "cpu-3", "cpu-4"] },
    });
    expect(normalized?.comparison?.itemIds).toEqual(["cpu-1", "cpu-2", "cpu-3"]);
  });
});
