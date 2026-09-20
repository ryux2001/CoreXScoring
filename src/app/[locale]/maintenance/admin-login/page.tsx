import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import GoogleAuthButton from "@/app/auth/components/GoogleAuthButton";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function MaintenanceAdminLoginPage() {
  const t = await getTranslations("maintenance");

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16 text-zinc-100">
      <section className="w-full max-w-md rounded-3xl border border-cyan-300/20 bg-zinc-950 p-8 shadow-2xl shadow-cyan-950/20 sm:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">CoreXScoring</p>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">{t("adminLoginTitle")}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{t("adminLoginDescription")}</p>
        <div className="mt-8">
          <GoogleAuthButton next="/vault/admin/monitoring" />
        </div>
      </section>
    </main>
  );
}
