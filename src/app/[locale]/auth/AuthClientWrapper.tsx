"use client";

import GoogleAuthButton from "@/app/auth/components/GoogleAuthButton";

export default function AuthClientWrapper({ initialNotice }: { initialNotice?: string }) {
  return (
    <>
      {initialNotice && (
        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
          {initialNotice}
        </div>
      )}

      <div className="space-y-6 text-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Acceso seguro</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tighter text-white">Continúa con Google</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Usa tu cuenta Google para acceder a CoreXScoring.
          </p>
        </div>
        <GoogleAuthButton />
      </div>
    </>
  );
}
