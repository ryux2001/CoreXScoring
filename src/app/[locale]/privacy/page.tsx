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
    title: t("privacy.metadata.title"),
    description: t("privacy.metadata.description"),
    alternates: {
      canonical: `https://corexscoring.com${prefix}/privacy`,
      languages: {
        en: "https://corexscoring.com/privacy",
        es: "https://corexscoring.com/es/privacy",
      },
    },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <LegalPage title={t("privacy.title")}>
      <p>{t("privacy.intro")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("privacy.data.title")}</h2>
      <p>{t("privacy.data.google")}</p>
      <p>{t("privacy.data.saved")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("privacy.purposes.title")}</h2>
      <p>{t("privacy.purposes.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("privacy.thirdParties.title")}</h2>
      <p>{t("privacy.thirdParties.supabase")}</p>
      <p>{t("privacy.thirdParties.analytics")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("privacy.aiProviders.title")}</h2>
      <p>{t("privacy.aiProviders.dataSharing")}</p>
      <p>{t("privacy.aiProviders.apiKeys")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("privacy.retention.title")}</h2>
      <p>{t("privacy.retention.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("privacy.cookies.title")}</h2>
      <p>{t.rich("privacy.cookies.content", { cookiePolicy: (chunks) => <Link className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/cookies">{chunks}</Link> })}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("privacy.rights.title")}</h2>
      <p>{t("privacy.rights.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("privacy.changes.title")}</h2>
      <p>{t("privacy.changes.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("privacy.controllerAndContact.title")}</h2>
      <p>{t.rich("privacy.controllerAndContact.content", { email: (chunks) => <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="mailto:corexscoring@gmail.com">{chunks}</a> })}</p>

      <p className="text-sm text-zinc-500">{t("privacy.lastUpdated")}</p>
    </LegalPage>
  );
}
