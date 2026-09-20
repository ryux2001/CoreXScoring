"use client";

import { AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { getDeleteConfirmationText } from '@/lib/auth/delete-account-policy';
import type { Locale } from '@/i18n/routing';

interface DeleteAccountFormProps {
  googleConnected: boolean;
}

export default function DeleteAccountForm({ googleConnected }: DeleteAccountFormProps) {
  const t = useTranslations('account');
  const locale = useLocale() as Locale;
  const confirmationText = getDeleteConfirmationText(locale);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);

    if (confirmation.trim().toUpperCase() !== confirmationText) {
      setErrorMsg(t('typeConfirmationToConfirm', { confirmation: confirmationText }));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/account/delete/google-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation, locale }),
      });

      if (!response.ok) {
        setErrorMsg(t('prepareGoogleConfirmationError'));
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getDeleteConfirmationUrl(),
          queryParams: { prompt: 'login' },
        },
      });
      if (error) setErrorMsg(t('openGoogleConfirmationError'));
    } catch {
      setErrorMsg(t('deleteAccountError'));
    } finally {
      setLoading(false);
    }
  };

  if (!googleConnected) {
    return <p className="text-sm text-zinc-500">{t('linkGoogleToDeleteAccount')}</p>;
  }

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="flex cursor-pointer items-center justify-center rounded-lg border border-red-500/50 px-4 py-2 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/10"
      >
        {t('deleteAccount')}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-red-500/40 bg-red-500/5 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        <div>
          <p className="text-sm font-semibold text-red-300">{t('irreversibleAction')}</p>
          <p className="mt-1 text-xs leading-relaxed text-red-400/80">
            {t('deleteAccountWarning')}
          </p>
        </div>
      </div>

      <label htmlFor="delete_confirmation" className="mt-4 block text-xs text-zinc-400">
        {t.rich('typeConfirmation', {
          token: confirmationText,
          confirmation: () => <span className="font-bold text-white">{confirmationText}</span>,
        })}
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

      <p className="mt-4 text-xs text-zinc-500">{t('continueWithGoogleToConfirmIdentity')}</p>

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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('confirmDeletion')}
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
          {t('cancel')}
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
