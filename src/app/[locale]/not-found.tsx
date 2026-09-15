import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const locale = await getLocale();
  const english = locale === "en";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-16 text-center text-zinc-200 sm:px-8">
      <p className="font-mono text-sm uppercase tracking-[0.3em] text-cyan-300">404</p>
      <h1 className="mt-4 font-display text-4xl font-bold text-white">
        {english ? "Page not found" : "Página no encontrada"}
      </h1>
      <p className="mt-4 max-w-md text-zinc-400">
        {english
          ? "The requested page does not exist or is no longer available."
          : "La página solicitada no existe o ya no está disponible."}
      </p>
      <Link href="/" className="mt-8 text-sm text-cyan-200 underline underline-offset-4">
        {english ? "Back to CoreXScoring" : "Volver a CoreXScoring"}
      </Link>
    </main>
  );
}
