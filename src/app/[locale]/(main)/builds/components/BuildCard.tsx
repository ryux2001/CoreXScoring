'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, BarChart2, Bookmark, Eye } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { getBuildPartPrice } from '@/lib/scoringBuilds';
import { formatPrice } from '@/lib/formatPrice';
import { supabase } from '@/lib/supabaseClient';
import { useCompareStore } from '@/store/useCompareStore';
import { useLocale, useTranslations } from 'next-intl';
import type { Build } from '@/lib/scoringBuilds';

interface BuildCardProps {
  build: Build;
  currency: string;
  detailPath?: string;
  showSave?: boolean;
  wholeCardClickable?: boolean;
  compactSave?: boolean;
}

const parts = [
  { key: 'cpu' },
  { key: 'gpu' },
  { key: 'ram' },
  { key: 'motherboard' },
  { key: 'storage' },
  { key: 'psu' },
];

export default function BuildCard({
  build,
  currency,
  detailPath = '/builds',
  showSave = true,
  wholeCardClickable = false,
  compactSave = false,
}: BuildCardProps) {
  const t = useTranslations('builds');
  const locale = useLocale();
  const router = useRouter();
  const addItem = useCompareStore((state) => state.addItem);
  const removeItem = useCompareStore((state) => state.removeItem);
  const compareItems = useCompareStore((state) => state.items);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const isEUR = currency === 'EUR';
  const symbol = isEUR ? '€' : '$';
  const totalPrice = parts.reduce((total, part) => {
    return total + getBuildPartPrice(build, part.key, currency);
  }, 0);
  const formattedTotalPrice = formatPrice(totalPrice, locale);
  const isInCompare = compareItems.some((item) => item.id === build.id);

  useEffect(() => {
    let isMounted = true;

    const loadSavedState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('saved_builds')
        .select('build_id')
        .eq('user_id', user.id)
        .eq('build_id', build.id)
        .maybeSingle();

      if (isMounted && !error) setIsSaved(Boolean(data));
    };

    void loadSavedState();

    return () => {
      isMounted = false;
    };
  }, [build.id]);

  useEffect(() => {
    if (!customError) return;

    const timer = setTimeout(() => setCustomError(null), 4000);
    return () => clearTimeout(timer);
  }, [customError]);

  const handleCompareClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (isInCompare) {
      removeItem(build.id);
      return;
    }

    const result = addItem({
      ...build,
      id: build.id,
      slug: build.slug,
      type: 'BUILD',
      comparisonType: 'build',
      name: build.title,
      brand: t('fallbackCategory'),
      price: totalPrice,
      currency,
    });

    if (!result.success) {
       setCustomError(result.error || t('addError'));
    }
  };

  const handleSaveClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isSaving) return;
    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth');
        return;
      }

      if (isSaved) {
        const { error } = await supabase
          .from('saved_builds')
          .delete()
          .eq('user_id', user.id)
          .eq('build_id', build.id);

        if (error) throw error;
        setIsSaved(false);
      } else {
        const { error } = await supabase
          .from('saved_builds')
          .insert({ user_id: user.id, build_id: build.id });

        if (error) throw error;
        setIsSaved(true);
      }
    } catch (error) {
      console.error('No se pudo actualizar el build guardado', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (!wholeCardClickable) return;

    const target = event.target as HTMLElement;
    if (target.closest('button')) return;

    router.push(`${detailPath}/${build.slug}?currency=${currency}`);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!wholeCardClickable) return;

    if ((event.target as HTMLElement).closest('button')) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    router.push(`${detailPath}/${build.slug}?currency=${currency}`);
  };

  return (
    <article
      className={`flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition-all duration-300 hover:border-zinc-600 hover:bg-zinc-900/80 ${wholeCardClickable ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={wholeCardClickable ? 'link' : undefined}
      tabIndex={wholeCardClickable ? 0 : undefined}
      aria-label={wholeCardClickable ? t('openBuild', { name: build.title }) : undefined}
    >
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          {build.category || t('fallbackCategory')}
        </span>
        <h2 className="mt-2 line-clamp-2 text-[14px] font-extrabold leading-snug text-white">
          {build.title}
        </h2>

        <div className="mt-5 space-y-2 border-l-2 border-zinc-600 py-1.5 pl-4">
          {parts.map((part) => {
            const product = build[part.key];
            if (!product) return null;

            return (
              <div key={part.key} className="flex min-w-0 items-baseline gap-2">
                
                <span className="min-w-0 truncate text-xs font-bold text-zinc-300" title={product.name}>
                  {product.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-zinc-800/80 pt-2.5 sm:pt-3.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
             <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('price')}</span>
            <span className="font-display mt-0.5 text-xl font-black text-white">
              {symbol}{formattedTotalPrice}
            </span>
          </div>
        </div>

        <div className={wholeCardClickable ? 'mt-3 flex gap-2' : `mt-4 grid gap-2 ${showSave ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button
            type="button"
            onClick={handleCompareClick}
            aria-label={t('compare')}
            className={wholeCardClickable
              ? `flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border py-3 text-xs font-bold transition-all active:scale-95 ${
                  isInCompare
                    ? 'border-white bg-zinc-900 text-white'
                    : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`
              : `flex items-center justify-center gap-1 rounded-lg border px-2 py-2.5 text-[9px] font-black uppercase tracking-wider transition-all hover:bg-zinc-900 hover:text-white active:scale-95 cursor-pointer ${
                  isInCompare
                    ? 'border-white bg-zinc-900 text-white'
                    : 'border-zinc-900 text-zinc-400'
                }`}
          >
            <BarChart2 size={14} strokeWidth={wholeCardClickable ? 2.5 : undefined} />
             {wholeCardClickable ? t('compare') : <span className="hidden sm:inline">{t('compare')}</span>}
          </button>
          {showSave && (
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isSaving}
               aria-label={isSaved ? t('removeSaved') : t('saveBuild')}
               title={isSaved ? t('removeSaved') : t('saveBuild')}
              className={wholeCardClickable
                ? `flex cursor-pointer items-center justify-center rounded-lg border ${compactSave ? 'px-2 py-2.5' : 'px-3 py-3'} transition-all hover:bg-zinc-900 hover:text-white active:scale-95 disabled:cursor-wait disabled:opacity-60 ${
                    isSaved
                      ? 'border-white bg-zinc-900 text-white'
                      : 'border-zinc-800 text-zinc-400'
                  }`
                : `flex items-center justify-center gap-1 rounded-lg border px-2 py-2.5 text-[9px] font-black uppercase tracking-wider transition-all hover:bg-zinc-900 hover:text-white active:scale-95 disabled:cursor-wait disabled:opacity-60 ${
                    isSaved
                      ? 'border-white bg-zinc-900 text-white'
                      : 'border-zinc-900 text-zinc-400'
                  }`}
            >
              <Bookmark size={14} strokeWidth={wholeCardClickable ? 2.5 : undefined} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>

      {customError && (
        <div className="fixed bottom-6 left-1/2 z-[10000] flex w-[90vw] max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl border border-red-900/40 bg-zinc-950 px-4 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-800 bg-red-950/50 text-red-400">
            <AlertCircle size={12} strokeWidth={3} />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-red-500">
               {t('comparisonSystem')}
            </span>
            <span className="mt-0.5 text-xs font-medium leading-tight tracking-tight text-zinc-300">
              {customError}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

function BuildActionButton({ label, icon }: { label: string; icon: ReactNode }) {
  const t = useTranslations('builds');

  return (
    <button
      type="button"
      disabled
       title={t('availableSoon')}
      className="flex cursor-not-allowed items-center justify-center gap-1 rounded-lg border border-zinc-900 px-2 py-2.5 text-[9px] font-black uppercase tracking-wider text-zinc-700"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
