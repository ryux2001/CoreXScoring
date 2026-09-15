"use client";

import { AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const CONFIRMATION_TEXT = 'ELIMINAR';

interface DeleteAccountFormProps {
  googleConnected: boolean;
}

export default function DeleteAccountForm({ googleConnected }: DeleteAccountFormProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);

    if (confirmation.trim().toUpperCase() !== CONFIRMATION_TEXT) {
      setErrorMsg(`Escribe ${CONFIRMATION_TEXT} para confirmar la acción.`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/account/delete/google-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });

      if (!response.ok) {
        setErrorMsg('No se pudo preparar la confirmación con Google.');
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getDeleteConfirmationUrl(),
          queryParams: { prompt: 'login' },
        },
      });
      if (error) setErrorMsg('No se pudo abrir la confirmación de Google.');
    } catch {
      setErrorMsg('No se pudo eliminar la cuenta. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!googleConnected) {
    return <p className="text-sm text-zinc-500">Vincula Google para habilitar la eliminación segura de cuenta.</p>;
  }

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="flex cursor-pointer items-center justify-center rounded-lg border border-red-500/50 px-4 py-2 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/10"
      >
        Eliminar cuenta
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-red-500/40 bg-red-500/5 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        <div>
          <p className="text-sm font-semibold text-red-300">Esta acción no se puede deshacer.</p>
          <p className="mt-1 text-xs leading-relaxed text-red-400/80">
            Se eliminará tu cuenta y perderás el acceso a tus productos, combos y builds guardados.
          </p>
        </div>
      </div>

      <label htmlFor="delete_confirmation" className="mt-4 block text-xs text-zinc-400">
        Escribe <span className="font-bold text-white">{CONFIRMATION_TEXT}</span> para confirmar
      </label>
      <input
        id="delete_confirmation"
        name="confirmation"
        type="text"
        required
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        className="mt-2 w-full rounded-lg border border-red-500/30 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-400/50"
      />

      <p className="mt-4 text-xs text-zinc-500">Después continuarás con Google para confirmar tu identidad.</p>

      {errorMsg && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex cursor-pointer items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar eliminación'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsConfirming(false);
            setConfirmation('');
            setErrorMsg(null);
          }}
          disabled={loading}
          className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function getDeleteConfirmationUrl() {
  const url = new URL('/auth/oauth/delete-confirm', window.location.origin);
  const localePrefix = window.location.pathname.startsWith('/es/') ? '/es' : '';
  url.searchParams.set('next', `${localePrefix}/vault/account`);
  return url.toString();
}
