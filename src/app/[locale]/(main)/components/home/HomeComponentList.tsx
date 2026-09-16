import { Link } from '@/i18n/navigation';
import { ArrowUpRight } from 'lucide-react';
import { resolveProductPrice } from '@/lib/catalog/product-price';
import type { HomeCatalogItem, HomeSection } from '@/lib/admin/home';
import { getLocale, getTranslations } from 'next-intl/server';

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

export default async function HomeComponentList({ section, items, currency }: {
  section: HomeSection;
  items: HomeCatalogItem[];
  currency: string;
}) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations('home'),
  ]);

  return (
    <section aria-labelledby={`home-section-${section.id}`} className="rounded-[1.6rem] border border-zinc-800 bg-zinc-950/55 p-4 sm:p-5">
      <header className="border-b border-zinc-800 pb-4">
        <h2 id={`home-section-${section.id}`} className="font-display text-2xl font-black tracking-tight text-white">{section.title}</h2>
        {section.description && <p className="mt-2 text-sm leading-relaxed text-zinc-500">{section.description}</p>}
      </header>
      <ol className="mt-3 space-y-2">
        {items.map((item, index) => {
          const price = resolveProductPrice(asRecord(item), currency);
          return (
            <li key={item.id}>
              <Link
                href={`/catalog/${item.slug}?currency=${currency}`}
                className="group flex min-h-12 items-center gap-3 rounded-xl border border-zinc-800 bg-black/35 px-3 transition-colors hover:border-zinc-600 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <span className="font-display w-5 text-center text-base font-black tabular-nums text-zinc-600">{index + 1}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-zinc-200">{item.brand ? `${item.brand} ${item.name}` : item.name}</strong><span className="block truncate text-[10px] font-bold uppercase tracking-wider text-zinc-600">{item.type || t('component')}</span></span>
                <span className="shrink-0 text-sm font-black tabular-nums text-white">{formatPrice(price.value, currency, locale)}</span>
                <ArrowUpRight aria-hidden="true" size={14} className="shrink-0 text-zinc-600 transition-colors group-hover:text-cyan-100" />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
