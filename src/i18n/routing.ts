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

export function getValidLocale(value: unknown): Locale | null {
  return typeof value === "string" && isLocale(value) ? value : null;
}

export function getLocalizedPathname(pathname: string): string {
  const [firstSegment, ...rest] = pathname.split("/").filter(Boolean);
  return isLocale(firstSegment) ? `/${rest.join("/")}` || "/" : pathname;
}

export function getLocaleSwitchTarget(
  pathname: string,
  query: string,
  hash: string,
  locale: Locale,
) {
  const unlocalizedPathname = getLocalizedPathname(pathname);
  return {
    href: `${unlocalizedPathname}${query ? `?${query}` : ""}${hash}`,
    locale,
  };
}

export function isPathWithinRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function getEnglishCanonicalPathname(pathname: string): string | null {
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3) || "/";
  return null;
}

export function isUnsupportedLocalePath(pathname: string): boolean {
  const [firstSegment] = pathname.split("/").filter(Boolean);
  return Boolean(
    firstSegment
      && !isLocale(firstSegment)
      && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(firstSegment),
  );
}
