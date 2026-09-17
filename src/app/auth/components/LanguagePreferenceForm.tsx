"use client";

import { AlertCircle, CheckCircle2, Languages, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { updateLanguagePreference } from "@/app/auth/actions";
import { setLocaleCookie } from "@/i18n/locale-cookie";
import { isLocale, type Locale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function LanguagePreferenceForm({ initialLanguage }: { initialLanguage?: string }) {
  const currentLocale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const t = useTranslations("common");
  const [language, setLanguage] = useState<Locale>(isLocale(initialLanguage) ? initialLanguage : currentLocale);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);
    setSaved(false);

    if (!isLocale(language)) {
      setErrorCode("invalid_language");
      return;
    }

    setLoading(true);
    const result = await updateLanguagePreference(language);

    if (!result.ok) {
      setErrorCode(result.code);
      setLoading(false);
      return;
    }

    if (user) {
      setUser({
        ...user,
        user_metadata: { ...user.user_metadata, language: result.language },
      });
    }
    setLocaleCookie(result.language);
    setSaved(true);
    setLoading(false);

    const query = searchParams.toString();
    const hash = window.location.hash;
    router.replace(`${pathname}${query ? `?${query}` : ""}${hash}`, {
      locale: result.language,
      scroll: false,
    });
  };

  const errorMessage = errorCode === "invalid_language"
    ? t("languageInvalid")
    : errorCode === "unauthenticated"
      ? t("languageSignInRequired")
      : errorCode
        ? t("languageUpdateError")
        : null;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <label htmlFor="account_language" className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
        {t("language")}
      </label>
      <p className="mt-2 text-xs text-zinc-500">{t("languageDescription")}</p>
      <div className="relative mt-3">
        <Languages aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
        <select
          id="account_language"
          value={language}
          onChange={(event) => setLanguage(event.target.value as Locale)}
          className="w-full appearance-none rounded-xl border border-white/10 bg-zinc-900 px-12 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
        >
          <option value="en">{t("english")}</option>
          <option value="es">{t("spanish")}</option>
        </select>
      </div>

      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-400" role="alert">
          <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {saved && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400" role="status" aria-live="polite">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
          <p>{t("languageSaved")}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 flex cursor-pointer items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : t("saveLanguage")}
      </button>
    </form>
  );
}
