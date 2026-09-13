"use client";

import { AlertCircle, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/useAuthStore';

const CONFIRMATION_TEXT = 'ELIMINAR';

export default function DeleteAccountForm() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
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
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation, password }),
      });

      if (!response.ok) {
        setErrorMsg('No se pudo eliminar la cuenta. Inténtalo de nuevo.');
        return;
      }

      await supabase.auth.signOut();
      logout();
      router.replace('/auth?deleted=1');
      router.refresh();
    } catch {
      setErrorMsg('No se pudo eliminar la cuenta. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

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

      <label htmlFor="delete_password" className="mt-4 block text-xs text-zinc-400">
        Contraseña actual
      </label>
      <div className="relative mt-2">
        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
        <input
          id="delete_password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-red-500/30 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-400/50"
        />
      </div>

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
            setPassword('');
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
