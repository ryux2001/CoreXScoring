import { describe, expect, it } from "vitest";
import { AI_PRODUCT_SELECT, redactSensitiveText, sanitizeChatHref } from "@/lib/ai/privacy";

describe("AI privacy boundaries", () => {
  it("uses an explicit product projection", () => {
    expect(AI_PRODUCT_SELECT).not.toContain("*");
    expect(AI_PRODUCT_SELECT).toContain("specs");
    expect(AI_PRODUCT_SELECT).toContain("benchmarks");
  });

  it("redacts credentials and personal email addresses", () => {
    const value = redactSensitiveText("api_key=sk-test-1234567890123456 user@example.com Bearer abc.def.ghij");

    expect(value).not.toContain("sk-test");
    expect(value).not.toContain("user@example.com");
    expect(value).not.toContain("Bearer abc.def.ghij");
    expect(value).toContain("REDACTADO");
  });

  it("allows internal paths and HTTPS links only", () => {
    expect(sanitizeChatHref("/catalog/rtx-4090")).toEqual({ href: "/catalog/rtx-4090", external: false });
    expect(sanitizeChatHref("https://example.com/docs")?.external).toBe(true);
    expect(sanitizeChatHref("http://example.com/docs")).toBeNull();
    expect(sanitizeChatHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeChatHref("//evil.example")).toBeNull();
  });
});
