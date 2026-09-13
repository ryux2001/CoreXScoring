import { afterEach, describe, expect, it, vi } from "vitest";
import { getAnonymousTurnstileMessageThreshold, shouldRequireAnonymousTurnstile, verifyTurnstileToken } from "@/lib/ai/turnstile";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("anonymous Turnstile", () => {
  it("only requires a challenge after the configured anonymous usage threshold", () => {
    vi.stubEnv("AI_ANONYMOUS_TURNSTILE_REQUIRED", "true");
    vi.stubEnv("AI_ANONYMOUS_TURNSTILE_AFTER_MESSAGES", "2");
    expect(getAnonymousTurnstileMessageThreshold()).toBe(2);
    expect(shouldRequireAnonymousTurnstile(1)).toBe(false);
    expect(shouldRequireAnonymousTurnstile(2)).toBe(true);
  });

  it("rejects malformed tokens without calling Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "s".repeat(32));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(verifyTurnstileToken("")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts Cloudflare verification only for the configured hostname", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "s".repeat(32));
    vi.stubEnv("TURNSTILE_EXPECTED_HOSTNAME", "corex.vercel.app");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, hostname: "corex.vercel.app" }), { status: 200 })));
    await expect(verifyTurnstileToken("valid-token")).resolves.toBe(true);
  });
});
