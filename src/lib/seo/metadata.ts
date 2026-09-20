import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";

export const SITE_URL = "https://corexscoring.com";

function localizedPath(pathname: string, locale: Locale): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return locale === "es" ? `/es${normalized}` : normalized;
}

export function createLocalizedMetadata({
  locale,
  pathname,
  title,
  description,
  indexable = true,
}: {
  locale: Locale;
  pathname: string;
  title: string;
  description: string;
  indexable?: boolean;
}): Metadata {
  const canonical = `${SITE_URL}${localizedPath(pathname, locale)}`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: indexable
      ? {
          canonical,
          languages: {
            en: `${SITE_URL}${localizedPath(pathname, "en")}`,
            es: `${SITE_URL}${localizedPath(pathname, "es")}`,
          },
        }
      : undefined,
    robots: indexable ? undefined : { index: false, follow: false },
  };
}

export function createNoIndexMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    robots: { index: false, follow: false },
  };
}
