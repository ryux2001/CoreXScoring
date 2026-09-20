import { describe, expect, it } from "vitest";
import {
  getEnglishCanonicalPathname,
  getLocaleSwitchTarget,
  getValidLocale,
  getLocalizedPathname,
  isPathWithinRoute,
  isUnsupportedLocalePath,
} from "@/i18n/routing";

describe("localized pathname helpers", () => {
  it("removes a supported locale prefix", () => {
    expect(getLocalizedPathname("/es/catalog/rtx-5090")).toBe("/catalog/rtx-5090");
  });

  it("keeps the default locale route shape usable", () => {
    expect(getLocalizedPathname("/catalog/rtx-5090")).toBe("/catalog/rtx-5090");
  });

  it("maps a locale-only path to the localized home route", () => {
    expect(getLocalizedPathname("/es")).toBe("/");
  });

  it("creates unlocalized navigation targets for next-intl locale changes", () => {
    expect(getLocaleSwitchTarget("/es/catalog/rtx-5090", "", "", "en")).toEqual({
      href: "/catalog/rtx-5090",
      locale: "en",
    });
    expect(getLocaleSwitchTarget("/catalog/rtx-5090", "", "", "es")).toEqual({
      href: "/catalog/rtx-5090",
      locale: "es",
    });
    expect(getLocaleSwitchTarget("/es", "", "", "en")).toEqual({ href: "/", locale: "en" });
    expect(getLocaleSwitchTarget("/", "", "", "es")).toEqual({ href: "/", locale: "es" });
  });

  it("accepts only supported locale preferences", () => {
    expect(getValidLocale("en")).toBe("en");
    expect(getValidLocale("es")).toBe("es");
    expect(getValidLocale("fr")).toBeNull();
    expect(getValidLocale(null)).toBeNull();
  });

  it("normalizes localized auth callbacks to their canonical route", () => {
    expect(getLocalizedPathname("/es/auth/confirm")).toBe("/auth/confirm");
    expect(getLocalizedPathname("/es/auth/recovery/confirm")).toBe("/auth/recovery/confirm");
  });

  it("canonicalizes explicit English prefixes", () => {
    expect(getEnglishCanonicalPathname("/en")).toBe("/");
    expect(getEnglishCanonicalPathname("/en/catalog/rtx-5090")).toBe("/catalog/rtx-5090");
    expect(getEnglishCanonicalPathname("/es/catalog")).toBeNull();
  });

  it("preserves query parameters when applying the English canonical path", () => {
    const url = new URL("https://corexscoring.com/en/catalog?kind=gpu&page=2");
    url.pathname = getEnglishCanonicalPathname(url.pathname) ?? url.pathname;

    expect(url.toString()).toBe("https://corexscoring.com/catalog?kind=gpu&page=2");
  });

  it("recognizes unsupported locale-shaped paths without rejecting regular slugs", () => {
    expect(isUnsupportedLocalePath("/fr/catalog")).toBe(true);
    expect(isUnsupportedLocalePath("/fr-FR/catalog")).toBe(true);
    expect(isUnsupportedLocalePath("/catalog/fr")).toBe(false);
    expect(isUnsupportedLocalePath("/product-inexistente/catalog")).toBe(false);
  });

  it("matches protected routes by complete path segments", () => {
    expect(isPathWithinRoute("/vault", "/vault")).toBe(true);
    expect(isPathWithinRoute("/vault/account", "/vault")).toBe(true);
    expect(isPathWithinRoute("/vaulted", "/vault")).toBe(false);
  });
});
