import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { areMaintenanceAdminsAllowed } from "@/lib/maintenance/site-mode";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  const t = await getTranslations("maintenance");
  const adminsAllowed = areMaintenanceAdminsAllowed();

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16 text-zinc-100">
      <section className="w-full max-w-xl rounded-3xl border border-cyan-300/20 bg-zinc-950 p-8 text-center shadow-2xl shadow-cyan-950/20 sm:p-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">CoreXScoring</p>
        <div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-3xl" aria-hidden="true">
          !
        </div>
        <h1 className="mt-7 text-3xl font-bold tracking-tight text-white sm:text-4xl">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-zinc-400">{t("description")}</p>
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">{t("status")}</p>
        {adminsAllowed && (
          <Link href="/maintenance/admin-login" className="mt-8 inline-flex rounded-xl border border-cyan-300/30 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
            {t("adminAccess")}
          </Link>
        )}
      </section>
    </main>
  );
}
