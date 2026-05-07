import type { Metadata } from "next";
import AuthClientWrapper from "./AuthClientWrapper";

export const metadata: Metadata = {
  title: "Autenticarse - CorexScoring",
  description: "Inicia sesión o crea una cuenta en CorexScoring.",
};

export default function AuthPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] h-dvh flex items-center justify-center bg-black p-4 md:p-6 lg:p-8">
      {/* Contenedor central (Card) que respeta el estilo visual image_8.png */}
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
        <AuthClientWrapper />
      </div>
    </main>
  );
}