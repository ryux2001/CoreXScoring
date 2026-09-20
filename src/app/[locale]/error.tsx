"use client";

import { useTranslations } from "next-intl";

export default function LocalizedError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");

  return (
    <main role="alert" className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-5 text-center text-zinc-200">
      <h1 className="font-display text-3xl font-bold text-white">{t("unexpectedError")}</h1>
      <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-xl bg-white px-5 text-sm font-bold text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
        {t("tryAgain")}
      </button>
    </main>
  );
}
