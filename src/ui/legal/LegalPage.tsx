import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function LegalPage({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  const t = await getTranslations("common");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 text-zinc-200 sm:px-8">
      <Link href="/" className="text-sm text-cyan-200 underline underline-offset-4">{t("backToCoreXScoring")}</Link>
      <article className="mt-8 space-y-6 leading-7">
        <h1 className="font-display text-4xl font-bold text-white">{title}</h1>
        {children}
      </article>
    </main>
  );
}
