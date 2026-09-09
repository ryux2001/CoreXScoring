import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { convertPrice } from '@/lib/currency';
import { resolveProductPrice } from '@/lib/catalog/product-price';
import { getComponentNotes } from '@/lib/scoring';
import type { HomeCatalogItem, HomeComparison } from '@/lib/admin/home';

const COMBO_PARTS = [
  { key: 'cpu', label: 'CPU' },
  { key: 'gpu', label: 'GPU' },
  { key: 'ram', label: 'RAM' },
] as const;

const BUILD_PARTS = [
  ...COMBO_PARTS,
  { key: 'motherboard', label: 'Placa' },
  { key: 'storage', label: 'Almac.' },
  { key: 'psu', label: 'Fuente' },
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

function ComponentColumn({ item, currency }: { item: HomeCatalogItem; currency: string }) {
  return (
    <div className="min-w-0 p-4 sm:p-5">
      <p className="line-clamp-2 font-display text-xl font-black leading-[0.95] text-white">{item.brand ? `${item.brand} ${item.name}` : item.name}</p>
      <dl className="mt-5 space-y-2.5">
        {getProductNotes(item, currency).map(([label, score]) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2">
            <dt className="truncate text-[10px] font-black uppercase tracking-wider text-zinc-500" title={label}>{label}</dt>
            <dd className="text-right text-sm font-black tabular-nums text-zinc-200">{score.toFixed(1)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CollectionColumn({ item, itemType }: { item: HomeCatalogItem; itemType: 'combos' | 'builds' }) {
  const record = asRecord(item);
  const parts = itemType === 'combos' ? COMBO_PARTS : BUILD_PARTS;
  return (
    <div className="min-w-0 p-4 sm:p-5">
      <p className="line-clamp-2 font-display text-xl font-black leading-[0.95] text-white">{item.title || item.name}</p>
      <dl className="mt-5 space-y-2.5">
        {parts.map((part) => {
          const component = record[part.key] as { name?: string } | null | undefined;
          if (!component) return null;
          return <div key={part.key} className="flex min-w-0 items-baseline justify-between gap-3"><dt className="shrink-0 text-[10px] font-black uppercase tracking-wider text-zinc-600">{part.label}</dt><dd className="truncate text-right text-xs font-bold text-zinc-300" title={component.name}>{component.name}</dd></div>;
        })}
      </dl>
    </div>
  );
}

export default function HomeComparisonCard({ comparison, currency }: { comparison: HomeComparison; currency: string }) {
  const items = getComparisonItems(comparison);
  if (items.length !== 2) return null;
  const [left, right] = items;
  const href = `/comparator/${left.slug}/${right.slug}?currency=${currency}`;
  const isProducts = comparison.item_type === 'products';
  const collectionType = comparison.item_type === 'builds' ? 'builds' : 'combos';

  return (
    <Link
      href={href}
      className="group w-[min(32rem,calc(100vw-3rem))] shrink-0 snap-start overflow-hidden rounded-[1.8rem] border border-zinc-700 bg-zinc-950 transition-colors hover:border-cyan-200/60 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 sm:w-[34rem] lg:w-[calc((100%-1.25rem)/2)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-zinc-700 px-5 py-4 sm:px-6">
        <div className="min-w-0"><p className="truncate font-display text-xl font-black text-white">{comparison.title}</p>{comparison.description && <p className="mt-1 truncate text-xs text-zinc-500">{comparison.description}</p>}</div>
        <ArrowUpRight aria-hidden="true" size={17} className="shrink-0 text-zinc-600 transition-colors group-hover:text-cyan-100" />
      </div>
      <div className="relative grid grid-cols-2">
        {isProducts ? <ComponentColumn item={left} currency={currency} /> : <CollectionColumn item={left} itemType={collectionType} />}
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-5 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black font-display text-xs font-black text-zinc-300">VS</span>
        <div className="border-l border-zinc-700">{isProducts ? <ComponentColumn item={right} currency={currency} /> : <CollectionColumn item={right} itemType={collectionType} />}</div>
      </div>
    </Link>
  );
}
