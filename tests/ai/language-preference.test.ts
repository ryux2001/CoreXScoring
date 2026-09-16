import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { updateLanguagePreference } from "@/app/auth/actions";
import { getLocaleSwitchTarget, getValidLocale } from "@/i18n/routing";

vi.mock("@/lib/supabaseServer", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const getUser = vi.fn();
const updateUser = vi.fn();

describe("language preference boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateSupabaseServerClient.mockResolvedValue({
      auth: { getUser, updateUser },
    } as never);
  });

  it("preserves route data while changing locale", () => {
    const target = getLocaleSwitchTarget("/es/catalog/rtx-5090", "kind=gpu&page=2", "#metrics", "en");
    const url = new URL(`https://corex.test${target.href}`);

    expect(url.pathname).toBe("/catalog/rtx-5090");
    expect(url.search).toBe("?kind=gpu&page=2");
    expect(url.hash).toBe("#metrics");
    expect(target.locale).toBe("en");
  });

  it("uses a valid stored preference and rejects invalid values", () => {
    expect(getValidLocale("es")).toBe("es");
    expect(getValidLocale("en")).toBe("en");
    expect(getValidLocale("de")).toBeNull();
    expect(getValidLocale(42)).toBeNull();
  });

  it("validates and persists the preference for an authenticated user", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1", is_anonymous: false } } });
    updateUser.mockResolvedValue({ error: null });

    await expect(updateLanguagePreference("es")).resolves.toEqual({ ok: true, language: "es" });
    expect(updateUser).toHaveBeenCalledWith({ data: { language: "es" } });
  });

  it("rejects invalid or unauthenticated preference updates", async () => {
    await expect(updateLanguagePreference("fr")).resolves.toEqual({ ok: false, code: "invalid_language" });
    expect(mockedCreateSupabaseServerClient).not.toHaveBeenCalled();

    getUser.mockResolvedValue({ data: { user: null } });
    await expect(updateLanguagePreference("en")).resolves.toEqual({ ok: false, code: "unauthenticated" });
    expect(updateUser).not.toHaveBeenCalled();
  });
});
