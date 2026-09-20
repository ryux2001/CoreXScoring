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
    title: t("terms.metadata.title"),
    description: t("terms.metadata.description"),
    alternates: {
      canonical: `https://corexscoring.com${prefix}/terms`,
      languages: {
        en: "https://corexscoring.com/terms",
        es: "https://corexscoring.com/es/terms",
      },
    },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <LegalPage title={t("terms.title")}>
      <p>{t.rich("terms.intro", { privacyPolicy: (chunks) => <Link className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/privacy">{chunks}</Link> })}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("terms.service.title")}</h2>
      <p>{t("terms.service.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("terms.accounts.title")}</h2>
      <p>{t("terms.accounts.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("terms.purchases.title")}</h2>
      <p>{t("terms.purchases.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("terms.aiProviders.title")}</h2>
      <p>{t("terms.aiProviders.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("terms.acceptableUse.title")}</h2>
      <p>{t("terms.acceptableUse.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("terms.changes.title")}</h2>
      <p>{t("terms.changes.content")}</p>

      <h2 className="font-display text-2xl font-bold text-white">{t("terms.lawAndContact.title")}</h2>
      <p>{t.rich("terms.lawAndContact.content", { email: (chunks) => <a className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="mailto:corexscoring@gmail.com">{chunks}</a> })}</p>

      <p className="text-sm text-zinc-500">{t("terms.lastUpdated")}</p>
    </LegalPage>
  );
}
