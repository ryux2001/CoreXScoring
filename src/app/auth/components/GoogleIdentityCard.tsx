"use client";

import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import GoogleAuthButton from './GoogleAuthButton';

interface GoogleIdentityCardProps {
  connected: boolean;
}

export default function GoogleIdentityCard({ connected }: GoogleIdentityCardProps) {
  const t = useTranslations('account');
  return (
    <section className="border-b border-zinc-800 py-6">
      <h2 className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
        {t('googleAccess')}
      </h2>
      {connected ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          {t('googleAccountLinked')}
        </p>
      ) : (
        <div className="mt-3 max-w-md space-y-4">
          <p className="text-sm text-zinc-500">
            {t('linkGoogleDescription')}
          </p>
          <GoogleAuthButton linkIdentity next="/vault/account" />
        </div>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
        <ShieldCheck className="h-4 w-4" />
        {t('selectGoogleAccountNotice')}
      </p>
    </section>
  );
}
