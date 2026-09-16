"use client";

import { Globe2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useId } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getLocaleSwitchTarget, type Locale } from "@/i18n/routing";

export default function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("common");
  const selectId = useId();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value as Locale;
    const target = getLocaleSwitchTarget(pathname, searchParams.toString(), window.location.hash, nextLocale);

    router.replace(target.href, {
      locale: target.locale,
      scroll: false,
    });
  };

  return (
    <div className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-zinc-300">
      <Globe2 aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-500" />
      <label htmlFor={selectId} className="sr-only">
        {t("selectLanguage")}
      </label>
      <select
        id={selectId}
        value={currentLocale}
        onChange={handleChange}
        aria-label={t("selectLanguage")}
        className="cursor-pointer bg-transparent text-xs font-semibold text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <option value="en" className="bg-zinc-950">{t("english")}</option>
        <option value="es" className="bg-zinc-950">{t("spanish")}</option>
      </select>
    </div>
  );
}
