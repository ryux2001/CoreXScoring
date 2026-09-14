"use client";

import { CheckCircle2, ShieldCheck } from 'lucide-react';
import GoogleAuthButton from './GoogleAuthButton';

interface GoogleIdentityCardProps {
  connected: boolean;
}

export default function GoogleIdentityCard({ connected }: GoogleIdentityCardProps) {
  return (
    <section className="border-b border-zinc-800 py-6">
      <h2 className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
        Acceso con Google
      </h2>
      {connected ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Tu cuenta de Google está vinculada a esta cuenta.
        </p>
      ) : (
        <div className="mt-3 max-w-md space-y-4">
          <p className="text-sm text-zinc-500">
            Vincula Google antes de retirar el acceso por contraseña. Tus datos y permisos se conservarán en esta misma cuenta.
          </p>
          <GoogleAuthButton linkIdentity next="/vault/account" />
        </div>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
        <ShieldCheck className="h-4 w-4" />
        Elige la cuenta Google que usa este mismo correo.
      </p>
    </section>
  );
}
