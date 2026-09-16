"use client";

import { AlertCircle, CheckCircle2, Loader2, User } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';

interface NameChangeFormProps {
  initialName: string;
}

export default function NameChangeForm({ initialName }: NameChangeFormProps) {
  const t = useTranslations('account');
  const setUser = useAuthStore((state) => state.setUser);
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!normalizedName) {
      setErrorMsg(t('invalidName'));
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: normalizedName },
    });

    if (error || !data.user) {
      setErrorMsg(t('updateNameError'));
    } else {
      setUser(data.user);
      setName(data.user.user_metadata.full_name || normalizedName);
      setSuccessMsg(t('nameUpdated'));
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <label htmlFor="account_name" className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
        {t('name')}
      </label>
      <div className="relative mt-3">
        <User className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
        <input
          id="account_name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>

      {errorMsg && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 flex cursor-pointer items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('saveName')}
      </button>
    </form>
  );
}
