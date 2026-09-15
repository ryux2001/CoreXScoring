import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && routing.locales.includes(value as Locale);
}

export function getLocalizedPathname(pathname: string): string {
  const [firstSegment, ...rest] = pathname.split("/").filter(Boolean);
  return isLocale(firstSegment) ? `/${rest.join("/")}` || "/" : pathname;
}
