import { describe, expect, it } from "vitest";
import { getLocalizedPathname } from "@/i18n/routing";

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
});
