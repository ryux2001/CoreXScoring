import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("common");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-16 text-center text-zinc-200 sm:px-8">
      <p className="font-mono text-sm uppercase tracking-[0.3em] text-cyan-300">404</p>
      <h1 className="mt-4 font-display text-4xl font-bold text-white">
        {t("pageNotFound")}
      </h1>
      <p className="mt-4 max-w-md text-zinc-400">
        {t("pageNotFoundDescription")}
      </p>
      <Link href="/" className="mt-8 text-sm text-cyan-200 underline underline-offset-4">
        {t("backToCoreXScoring")}
      </Link>
    </main>
  );
}
