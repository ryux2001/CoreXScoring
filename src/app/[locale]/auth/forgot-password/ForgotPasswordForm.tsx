"use client";

import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { getPasswordRecoveryConfirmUrl } from '@/lib/authRedirects';

export default function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getPasswordRecoveryConfirmUrl(),
    });

    if (error) {
      setErrorMsg(t('sendRecoveryEmailError'));
    } else {
      setSuccessMsg(
        t('recoveryEmailSent'),
      );
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-white">
          {t('forgotPassword')}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          {t('forgotPasswordDescription')}
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}

      <div>
        <label htmlFor="recovery_email" className="mb-2 block text-sm font-medium text-zinc-400">
          {t('email')}
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
          <input
            id="recovery_email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('emailPlaceholder')}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
      </div>

      <button
        disabled={loading}
        type="submit"
        className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-white px-6 py-4 text-lg font-bold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : t('sendRecoveryLink')}
      </button>
    </form>
  );
}
