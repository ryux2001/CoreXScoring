import { Link } from '@/i18n/navigation';
import { ArrowUpRight } from 'lucide-react';
import { getComboPartPrice } from '@/lib/scoringCombos';
import { getBuildPartPrice } from '@/lib/scoringBuilds';
import type { HomeCatalogItem, HomeCatalogType } from '@/lib/admin/home';
import { getLocale, getTranslations } from 'next-intl/server';

const COMBO_PARTS = [
  { key: 'cpu' },
  { key: 'gpu' },
  { key: 'ram' },
] as const;

const BUILD_PARTS = [
  ...COMBO_PARTS,
  { key: 'motherboard' },
  { key: 'storage' },
  { key: 'psu' },
] as const;

function asRecord(item: HomeCatalogItem): Record<string, unknown> {
  return item as unknown as Record<string, unknown>;
}

function formatPrice(value: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function HomeCollectionCard({
  item,
  itemType,
  currency,
}: {
  item: HomeCatalogItem;
  itemType: Extract<HomeCatalogType, 'combos' | 'builds'>;
  currency: string;
}) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations('home'),
  ]);
  const record = asRecord(item);
  const parts = itemType === 'combos' ? COMBO_PARTS : BUILD_PARTS;
  const total = parts.reduce((sum, part) => (
    sum + (itemType === 'combos'
      ? getComboPartPrice(record, part.key as 'cpu' | 'gpu' | 'ram', currency)
      : getBuildPartPrice(record, part.key, currency))
  ), 0);
  const href = `/${itemType}/${item.slug}?currency=${currency}`;
  const minimumHeight = itemType === 'combos' ? 'min-h-[20rem]' : 'min-h-[26rem]';
  const collectionType = itemType === 'combos' ? t('types.combo') : t('types.build');
  const title = item.title || item.name || collectionType;

  return (
    <Link
      href={href}
      aria-label={t('openCollection', { type: collectionType, title })}
      className={`group flex h-full w-full flex-col rounded-[1.6rem] border border-zinc-800 bg-zinc-950 p-4 transition-colors hover:border-cyan-200/55 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 sm:p-5 ${minimumHeight}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/65">{item.category || collectionType}</p>
          <h3 className="mt-2 line-clamp-2 font-display text-xl font-black leading-[0.95] text-white">{title}</h3>
        </div>
        <ArrowUpRight aria-hidden="true" size={17} className="shrink-0 text-zinc-600 transition-colors group-hover:text-cyan-100" />
      </div>

      <div className="mt-5 space-y-2 border-l-2 border-zinc-700 py-1.5 pl-4 sm:mt-6">
        {parts.map((part) => {
          const component = record[part.key] as { name?: string } | null | undefined;
          if (!component) return null;
          return (
            <div key={part.key} className="min-w-0">
              <p className="truncate text-xs font-bold text-zinc-300 sm:text-sm" title={component.name}>{component.name}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-end justify-between gap-2 border-t border-zinc-800/80 pt-3 sm:mt-6 sm:gap-3 sm:pt-3.5">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600 sm:text-[10px] sm:tracking-[0.16em]">{t('totalPrice')}</p>
          <p className="mt-0.5 font-display text-xl font-black tracking-tight text-white sm:text-2xl">{formatPrice(total, currency, locale)}</p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors group-hover:text-cyan-100">{t('view')}</span>
      </div>
    </Link>
  );
}
