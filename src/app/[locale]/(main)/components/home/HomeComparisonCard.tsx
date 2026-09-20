import { Link } from '@/i18n/navigation';
import { ArrowUpRight } from 'lucide-react';
import { convertPrice } from '@/lib/currency';
import { resolveProductPrice } from '@/lib/catalog/product-price';
import { getCatalogScoreLabelKey } from '@/lib/catalog/presentation';
import { getComponentNotes } from '@/lib/scoring';
import type { HomeCatalogItem, HomeComparison } from '@/lib/admin/home';
import { getTranslations } from 'next-intl/server';

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

function getComparisonItems(comparison: HomeComparison): HomeCatalogItem[] {
  return comparison.home_comparison_items.flatMap((item) => {
    const content = item.product || item.combo || item.build;
    return content ? [content] : [];
  });
}

function getProductNotes(item: HomeCatalogItem, currency: string): Array<[string, number]> {
  const product = asRecord(item);
  const price = resolveProductPrice(product, currency).value;
  return Object.entries(getComponentNotes(product, convertPrice(price, currency, 'USD')))
    .filter(([label]) => !/precio|price|calidad/i.test(label))
    .map(([label, score]) => [label, Number(score) || 0]);
}

function ComponentColumn({ item, currency, translateHome, translateCatalog }: {
  item: HomeCatalogItem;
  currency: string;
  translateHome: (key: string) => string;
  translateCatalog: (key: string) => string;
}) {
  return (
    <div className="min-w-0 p-3 sm:p-5">
      <p className="line-clamp-2 font-display text-base font-black leading-[0.98] text-white sm:text-xl sm:leading-[0.95]">{item.brand ? `${item.brand} ${item.name}` : item.name}</p>
      <dl className="mt-3 space-y-1.5 sm:mt-5 sm:space-y-2.5">
        {getProductNotes(item, currency).map(([label, score]) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_1.8rem] items-center gap-1 sm:grid-cols-[minmax(0,1fr)_2rem] sm:gap-2">
            <dt className="truncate text-[0.6875rem] font-black uppercase tracking-tight text-zinc-400 sm:text-[0.75rem] sm:tracking-wider" title={translateCatalog(getCatalogScoreLabelKey(label))}>
              <span className="sm:hidden">{getCatalogScoreLabelKey(label) === 'scoreLabels.rasterization' ? translateHome('metricShort.rasterization') : getCatalogScoreLabelKey(label) === 'scoreLabels.productivity' ? translateHome('metricShort.productivity') : translateCatalog(getCatalogScoreLabelKey(label))}</span>
              <span className="hidden sm:inline">{translateCatalog(getCatalogScoreLabelKey(label))}</span>
            </dt>
            <dd className="text-right text-[0.75rem] font-black tabular-nums text-zinc-100 sm:text-sm">{score.toFixed(1)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CollectionColumn({ item, itemType, translateHome }: { item: HomeCatalogItem; itemType: 'combos' | 'builds'; translateHome: (key: string) => string }) {
  const record = asRecord(item);
  const parts = itemType === 'combos' ? COMBO_PARTS : BUILD_PARTS;
  return (
    <div className="min-w-0 p-3 sm:p-5">
      <p className="line-clamp-2 font-display text-base font-black leading-[0.98] text-white sm:text-xl sm:leading-[0.95]">{item.title || item.name}</p>
      <dl className="mt-3 space-y-1.5 sm:mt-5 sm:space-y-2.5">
        {parts.map((part) => {
          const component = record[part.key] as { name?: string } | null | undefined;
          if (!component) return null;
          return <div key={part.key} className="flex min-w-0 items-baseline justify-between gap-1.5 sm:gap-3"><dt className="shrink-0 text-[0.6875rem] font-black uppercase tracking-tight text-zinc-500 sm:text-[0.75rem] sm:tracking-wider">{translateHome(`parts.${part.key}`)}</dt><dd className="truncate text-right text-[0.75rem] font-bold text-zinc-200 sm:text-xs" title={component.name}>{component.name}</dd></div>;
        })}
      </dl>
    </div>
  );
}

export default async function HomeComparisonCard({ comparison, currency }: { comparison: HomeComparison; currency: string }) {
  const [translateHome, translateCatalog] = await Promise.all([
    getTranslations('home'),
    getTranslations('catalog'),
  ]);
  const items = getComparisonItems(comparison);
  if (items.length !== 2) return null;
  const [left, right] = items;
  const href = `/comparator/${left.slug}/${right.slug}?currency=${currency}`;
  const isProducts = comparison.item_type === 'products';
  const collectionType = comparison.item_type === 'builds' ? 'builds' : 'combos';

  return (
    <Link
      href={href}
      aria-label={translateHome('openComparison', { title: comparison.title })}
      className="group flex h-full w-full flex-col overflow-hidden rounded-[1.8rem] border border-zinc-700 bg-zinc-950 transition-colors hover:border-cyan-200/60 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
    >
      <div className="flex items-center justify-between gap-3 border-b border-zinc-700 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <div className="min-w-0"><p className="truncate font-display text-lg font-black text-white sm:text-xl">{comparison.title}</p>{comparison.description && <p className="mt-1 truncate text-[10px] text-zinc-500 sm:text-xs">{comparison.description}</p>}</div>
        <ArrowUpRight aria-hidden="true" size={17} className="shrink-0 text-zinc-600 transition-colors group-hover:text-cyan-100" />
      </div>
      <div className="relative grid grid-cols-2 pt-9 sm:pt-10">
        {isProducts ? <ComponentColumn item={left} currency={currency} translateHome={translateHome} translateCatalog={translateCatalog} /> : <CollectionColumn item={left} itemType={collectionType} translateHome={translateHome} />}
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-3 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black font-display text-xs font-black text-zinc-300">{translateHome('comparison.vs')}</span>
        <div className="border-l border-zinc-700">{isProducts ? <ComponentColumn item={right} currency={currency} translateHome={translateHome} translateCatalog={translateCatalog} /> : <CollectionColumn item={right} itemType={collectionType} translateHome={translateHome} />}</div>
      </div>
    </Link>
  );
}
