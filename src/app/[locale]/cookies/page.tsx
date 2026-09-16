import { Link } from "@/i18n/navigation";
import LegalPage from "@/ui/legal/LegalPage";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const english = locale === "en";
  const prefix = english ? "" : "/es";
  const t = await getTranslations({ locale, namespace: "legal" });

  return {
    title: t("cookies.metadata.title"),
    description: t("cookies.metadata.description"),
    alternates: {
      canonical: `https://corexscoring.com${prefix}/cookies`,
      languages: {
        en: "https://corexscoring.com/cookies",
        es: "https://corexscoring.com/es/cookies",
      },
    },
  };
}

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <LegalPage title={t("cookies.title")}>
      <p>{t("cookies.intro")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("cookies.whatTheyAre.title")}</h2>
      <p>{t("cookies.whatTheyAre.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("cookies.essential.title")}</h2>
      <p>{t("cookies.essential.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("cookies.localStorage.title")}</h2>
      <p>{t("cookies.localStorage.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("cookies.analytics.title")}</h2>
      <p>{t("cookies.analytics.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("cookies.managing.title")}</h2>
      <p>{t("cookies.managing.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("cookies.changesAndContact.title")}</h2>
      <p>{t.rich("cookies.changesAndContact.content", { email: (chunks) => <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="mailto:corexscoring@gmail.com">{chunks}</a>, privacyPolicy: (chunks) => <Link className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/privacy">{chunks}</Link> })}</p>

      <p className="text-sm text-zinc-500">{t("cookies.lastUpdated")}</p>
    </LegalPage>
  );
}
