import type { Locale } from "./routing";

export function setLocaleCookie(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; SameSite=Lax`;
}
