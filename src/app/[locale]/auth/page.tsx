import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AuthClientWrapper from "./AuthClientWrapper";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("metadataTitle"), description: t("metadataDescription") };
}

interface AuthPageProps {
  searchParams: Promise<{ error?: string; deleted?: string }>;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const t = await getTranslations("auth");
  const params = await searchParams;
  const initialNotice =
    params.deleted === "1"
      ? t("accountDeletedNotice")
      : params.error === "invalid-link"
      ? t("invalidLinkNotice")
      : undefined;

  return (
    <main className="auth-page font-technical min-h-[calc(100vh-64px)] h-dvh flex items-center justify-center bg-black p-4 md:p-6 lg:p-8">
      {/* Contenedor central (Card) que respeta el estilo visual image_8.png */}
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
        <AuthClientWrapper initialNotice={initialNotice} />
      </div>
    </main>
  );
}
