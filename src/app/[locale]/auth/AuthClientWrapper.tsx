"use client";

import GoogleAuthButton from "@/app/auth/components/GoogleAuthButton";
import { useTranslations } from "next-intl";

export default function AuthClientWrapper({ initialNotice }: { initialNotice?: string }) {
  const t = useTranslations("auth");
  return (
    <>
      {initialNotice && (
        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
          {initialNotice}
        </div>
      )}

      <div className="space-y-6 text-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">{t("secureAccess")}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tighter text-white">{t("continueWithGoogle")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            {t("googleAccessDescription")}
          </p>
        </div>
        <GoogleAuthButton />
      </div>
    </>
  );
}
