"use client";

import { AlertCircle, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { isAcceptablePassword } from '@/lib/auth/password-policy';

interface PasswordChangeFormProps {
  requireCurrentPassword?: boolean;
  recovery?: boolean;
  successRedirect?: string;
}

export default function PasswordChangeForm({
  requireCurrentPassword = false,
  recovery = false,
  successRedirect,
}: PasswordChangeFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (requireCurrentPassword && !currentPassword) {
      setErrorMsg(t('enterCurrentPassword'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(t('newPasswordsDoNotMatch'));
      return;
    }

    setLoading(true);

    if (!isAcceptablePassword(password)) {
      setErrorMsg(t('passwordLengthRequirement'));
      setLoading(false);
      return;
    }

    let error: { message?: string } | null = null;

    if (recovery) {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) error = { message: t('changePasswordError') };
    } else {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const email = userData.user?.email;

      if (userError || !email) {
        error = userError ?? { message: t('invalidSession') };
      } else {
        const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });

        if (reauthenticationError) {
          error = reauthenticationError;
        } else {
          const result = await supabase.auth.updateUser({ password });
          error = result.error;

          if (!error) await supabase.auth.signOut({ scope: 'others' });
        }
      }
    }

    if (error) {
      setErrorMsg(t('changePasswordDetailsError'));
    } else if (successRedirect) {
      router.push(successRedirect);
      router.refresh();
    } else {
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setSuccessMsg(t('passwordChanged'));
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      {requireCurrentPassword && (
        <div>
          <label htmlFor="current_password" className="mb-2 block text-sm font-medium text-zinc-400">
            {t('currentPassword')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
            <input
              id="current_password"
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="new_password" className="mb-2 block text-sm font-medium text-zinc-400">
          {t('newPassword')}
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
          <input
            id="new_password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="confirm_password" className="mb-2 block text-sm font-medium text-zinc-400">
          {t('confirmNewPassword')}
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-600" />
          <input
            id="confirm_password"
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-12 py-3.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
      </div>

      <button
        disabled={loading}
        type="submit"
        className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-white px-6 py-4 text-lg font-bold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : t('changePassword')}
      </button>
    </form>
  );
}
