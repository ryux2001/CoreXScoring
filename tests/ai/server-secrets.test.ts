import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIpHash } from "@/lib/ai/limits";
import { decryptProviderApiKey, encryptProviderApiKey } from "@/lib/ai/provider-keys";
import { getRequiredServerSecret, validateProductionSecrets } from "@/lib/server-secrets";

const TEST_SECRET = "a".repeat(32);
const PREVIOUS_TEST_SECRET = "b".repeat(32);

describe("server secret isolation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("requires an independent secret instead of accepting a fallback", () => {
    vi.stubEnv("AI_ACTION_SECRET", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "s".repeat(40));

    expect(() => getRequiredServerSecret("AI_ACTION_SECRET")).toThrow("AI_ACTION_SECRET");
  });

  it("fails production startup when a required secret is absent", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_ACTION_SECRET", "a".repeat(32));
    vi.stubEnv("AI_IP_HASH_SECRET", "");
    vi.stubEnv("AI_PROVIDER_KEYS_ENCRYPTION_SECRET", "b".repeat(32));

    expect(validateProductionSecrets).toThrow("AI_IP_HASH_SECRET");
  });

  it("does not hash a client IP without its dedicated secret", () => {
    vi.stubEnv("AI_IP_HASH_SECRET", "");
    vi.stubEnv("GROQ_API_KEY", "g".repeat(40));
    vi.stubEnv("TRUSTED_PROXY", "cloudflare");
    const request = { headers: new Headers({ "cf-connecting-ip": "203.0.113.10" }) };

    expect(() => getClientIpHash(request as never)).toThrow("AI_IP_HASH_SECRET");
  });

  it("writes versioned BYOK ciphertext and reads existing v1 ciphertext", () => {
    vi.stubEnv("AI_PROVIDER_KEYS_ENCRYPTION_SECRET", TEST_SECRET);
    vi.stubEnv("AI_PROVIDER_KEYS_ENCRYPTION_KEY_VERSION", "v1");

    const encrypted = encryptProviderApiKey("provider-key-value");
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(decryptProviderApiKey(encrypted)).toBe("provider-key-value");
    expect(decryptProviderApiKey(encrypted.split(".").slice(1).join("."))).toBe("provider-key-value");
  });

  it("uses the previous configured key only for its declared version", () => {
    vi.stubEnv("AI_PROVIDER_KEYS_ENCRYPTION_SECRET", TEST_SECRET);
    vi.stubEnv("AI_PROVIDER_KEYS_ENCRYPTION_KEY_VERSION", "v1");
    const oldCiphertext = encryptProviderApiKey("provider-key-value");

    vi.stubEnv("AI_PROVIDER_KEYS_ENCRYPTION_SECRET", PREVIOUS_TEST_SECRET);
    vi.stubEnv("AI_PROVIDER_KEYS_ENCRYPTION_KEY_VERSION", "v2");
    vi.stubEnv("AI_PROVIDER_KEYS_ENCRYPTION_PREVIOUS_KEY_VERSION", "v1");
    vi.stubEnv("AI_PROVIDER_KEYS_ENCRYPTION_PREVIOUS_SECRET", TEST_SECRET);

    expect(decryptProviderApiKey(oldCiphertext)).toBe("provider-key-value");
    expect(encryptProviderApiKey("provider-key-value").startsWith("v2.")).toBe(true);
  });
});
