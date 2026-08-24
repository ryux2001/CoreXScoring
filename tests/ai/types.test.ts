import { describe, expect, it } from "vitest";
import { isChatRequest, normalizePageContext } from "@/lib/ai/types";

describe("AI request contracts", () => {
  it("accepts a bounded chat request", () => {
    expect(isChatRequest({ messages: [{ role: "user", content: "Compara una CPU y una GPU" }] })).toBe(true);
  });

  it("rejects oversized history and messages", () => {
    expect(isChatRequest({ messages: Array.from({ length: 13 }, () => ({ role: "user", content: "hola" })) })).toBe(false);
    expect(isChatRequest({ messages: [{ role: "user", content: "x".repeat(2_001) }] })).toBe(false);
  });

  it("rejects untrusted roles and malformed actions", () => {
    expect(isChatRequest({ messages: [{ role: "system", content: "no" }] })).toBe(false);
    expect(isChatRequest({
      messages: [{ role: "user", content: "confirma" }],
      action: { id: "action-1", digest: "not-a-digest" },
    })).toBe(false);
  });

  it("keeps only allowlisted page query parameters", () => {
    const context = normalizePageContext({
      pathname: "/catalog/rtx-5070-ti",
      search: "?currency=EUR&token=secret&page=2",
    });
    expect(context?.search).toBe("?currency=EUR&page=2");
  });
});
