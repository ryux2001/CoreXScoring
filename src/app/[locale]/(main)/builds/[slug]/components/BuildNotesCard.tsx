'use client';

import { Info } from 'lucide-react';
import { getBuildNotes, getBuildPartPrice } from '@/lib/scoringBuilds';
import { useTranslations } from 'next-intl';
import type { Build } from '@/lib/scoringBuilds';

interface BuildNotesCardProps {
  build: Build;
  currency?: string;
  onSwitchView?: () => void;
}

const parts = ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'];

function getScoreStyles(score: number) {
  if (score >= 9) {
    return {
      border: 'border-purple-500/50',
      bg: 'bg-purple-950/30',
      text: 'text-purple-300',
      bar: 'bg-purple-500',
      label: 'text-purple-300',
    };
  }

  if (score >= 7) {
    return {
      border: 'border-blue-500/50',
      bg: 'bg-blue-950/30',
      text: 'text-blue-400',
      bar: 'bg-blue-500',
      label: 'text-blue-400',
    };
  }

  if (score >= 5) {
    return {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-950/30',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      label: 'text-emerald-400',
    };
  }

  if (score >= 3) {
    return {
      border: 'border-yellow-500/50',
      bg: 'bg-yellow-950/30',
      text: 'text-yellow-400',
      bar: 'bg-yellow-500',
      label: 'text-yellow-400',
    };
  }

  return {
    border: 'border-red-500/50',
    bg: 'bg-red-950/30',
    text: 'text-red-400',
    bar: 'bg-red-500',
    label: 'text-red-400',
  };
}

export default function BuildNotesCard({
  build,
  currency = 'USD',
  onSwitchView,
}: BuildNotesCardProps) {
  const t = useTranslations('builds');
  const isEUR = currency === 'EUR';
  const symbol = isEUR ? '€' : '$';
  const notes = getBuildNotes(build, currency);
  const buildNotes = [
    { label: t('notes.metrics.potencia'), score: notes.potencia },
    { label: t('notes.metrics.productividad'), score: notes.productividad },
    { label: t('notes.metrics.gaming'), score: notes.gaming },
    { label: t('notes.metrics.eficiencia'), score: notes.eficiencia },
    { label: t('notes.metrics.cuelloBotella'), score: notes.cuelloBotella },
    { label: t('notes.metrics.compatibilidad'), score: notes.compatibilidad },
    { label: t('notes.metrics.actualizaciones'), score: notes.actualizaciones },
    { label: t('notes.metrics.calidadPrecio'), score: notes.calidadPrecio },
  ];
  const totalPrice = parts.reduce((total, part) => {
    return total + getBuildPartPrice(build, part, currency);
  }, 0);

  return (
    <div className="relative z-20 flex h-full flex-col justify-between rounded-3xl border border-zinc-900 bg-zinc-950/50 p-6 shadow-xl lg:p-8">
      <div className="relative mb-8">
        <div className="flex min-w-0 flex-wrap items-center gap-4 pr-28">
          <h2 className="shrink-0 text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
            {t('notes.title')}
          </h2>
          <div className="hidden items-center gap-2 rounded-full border border-zinc-900/50 bg-zinc-900/30 px-3 py-1 sm:flex">
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-zinc-600">
              {t('notes.evaluatedPrice')}
            </span>
            <span className="text-xs font-black font-display text-zinc-400">
              {isEUR ? `${totalPrice.toFixed(2)}${symbol}` : `${symbol}${totalPrice.toFixed(2)}`}
            </span>
          </div>
        </div>

        <div className="absolute right-0 top-0 flex items-center gap-3">
          {onSwitchView && (
            <button
              type="button"
              onClick={onSwitchView}
              aria-label={t('notes.showRadar')}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-zinc-400 transition-all hover:text-white active:scale-95"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {t('notes.showRadar')}
            </button>
          )}

          <div className="group relative">
            <button
              type="button"
              aria-label={t('notes.infoLabel')}
              className="flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/70"
            >
              <Info size={11} strokeWidth={3} />
            </button>
            <div className="invisible absolute right-0 top-9 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[12px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="mb-2 text-[12px] font-bold uppercase tracking-widest text-white">{t('notes.criteriaTitle')}</div>
              <div className="mb-3 space-y-1 text-[12px]">
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-purple-500" /><span>{t('notes.legend.perfect')}</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" /><span>{t('notes.legend.excellent')}</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /><span>{t('notes.legend.good')}</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-yellow-500" /><span>{t('notes.legend.acceptable')}</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-red-500" /><span>{t('notes.legend.poor')}</span></div>
              </div>
              <p>{t('notes.explanation')}</p>
              <p className="mt-2">{t('notes.formula')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-8 lg:gap-1">
        {buildNotes.map((note) => {
          const styles = getScoreStyles(note.score);

          return (
            <div
              key={note.label}
              className={`font-display group relative flex min-h-[100px] flex-col items-center justify-between rounded-2xl border px-3 py-3 transition-all ${styles.border} ${styles.bg}`}
            >
              <div className="flex h-6 items-center justify-center text-center">
                <p className={`text-[8px] font-black uppercase leading-tight tracking-widest ${styles.label}`}>
                  {note.label}
                </p>
              </div>
              <p className={`font-bold text-[32px] leading-none tracking-[-0.03em] tabular-nums ${styles.text}`}>
                {note.score.toFixed(1)}
              </p>
              <div className="h-[2px] w-1/2 overflow-hidden rounded-full bg-zinc-900">
                <div className={`h-full ${styles.bar}`} style={{ width: `${note.score * 10}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 border-t border-zinc-900/20 pt-4">
        <p className="text-center text-[10px] font-bold uppercase leading-tight tracking-widest text-zinc-500 lg:text-left">
           {t('notes.provisional')}
        </p>
      </div>
    </div>
  );
}
