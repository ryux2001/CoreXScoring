'use client';

import { Link } from '@/i18n/navigation';
import { ArrowLeft, ArrowDownUp, CheckCircle2, EyeOff, Plus, Search, Settings2 } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import type { AdminCatalogRow, CatalogKind, CatalogSlot } from '@/lib/admin/catalog';
import AdminCatalogCategoryOrderDialog from './AdminCatalogCategoryOrderDialog';
import AdminCatalogOrderDialog from './AdminCatalogOrderDialog';
import AdminCatalogSelect from './AdminCatalogSelect';
import { useTranslations } from 'next-intl';
import { normalizeCategory, UNCATEGORIZED_CATEGORY } from '@/lib/admin/catalog-categories';

function stableCategory(category: unknown): string {
  return normalizeCategory(category);
}

function productName(row: AdminCatalogRow, slot: CatalogSlot, missingLabel: string): string {
  const product = row[slot];
  if (!product || typeof product !== 'object' || !('name' in product)) return missingLabel;
  return String(product.name);
}

function getSlots(kind: CatalogKind): CatalogSlot[] {
  return kind === 'builds' ? ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'] : ['cpu', 'gpu', 'ram'];
}

export default function AdminCatalogList({ kind, rows }: { kind: CatalogKind; rows: AdminCatalogRow[] }) {
  const t = useTranslations('admin.catalog');
  const tc = useTranslations('admin.common');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'hidden'>('all');
  const [isCategoryOrderOpen, setIsCategoryOrderOpen] = useState(false);
  const [isItemOrderOpen, setIsItemOrderOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const slots = getSlots(kind);
  const kindLabel = t(`kinds.${kind}`);
  const uncategorized = UNCATEGORIZED_CATEGORY;
  const categories = [...new Set(rows.map((row) => stableCategory(row.category)))];
  const categoryOrderCategories = categories.filter((item) => item !== uncategorized);
  const categoryLabel = (value: string) => value === uncategorized ? t('uncategorized') : value;
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
     if (category !== 'all' && stableCategory(row.category) !== category) return false;
    if (status === 'active' && !row.is_active) return false;
    if (status === 'hidden' && row.is_active) return false;
    if (!normalizedQuery) return true;
     const searchable = [row.title, row.category, ...slots.map((slot) => productName(row, slot, t('editor.noProducts')))].join(' ').toLowerCase();
    return searchable.includes(normalizedQuery);
  });
  const groupedRows = filteredRows.reduce<Record<string, AdminCatalogRow[]>>((groups, row) => {
     const group = stableCategory(row.category);
    if (!groups[group]) groups[group] = [];
    groups[group].push(row);
    return groups;
  }, {});

  return (
    <main className="vault-page min-h-screen bg-black px-3 py-6 font-technical sm:px-6 md:px-10 md:py-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/vault/admin/catalog" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              <ArrowLeft aria-hidden="true" size={13} />
              {t('backToCatalog')}
            </Link>
            <p className="mt-7 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">{t('editor.eyebrow', { mode: kindLabel })}</p>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-white md:text-5xl">{kindLabel}</h1>
              <p className="mt-2 text-sm text-zinc-500" aria-label={t('showingCount', { filtered: filteredRows.length, total: rows.length })}>{t('showingCount', { filtered: filteredRows.length, total: rows.length })}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setIsCategoryOrderOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 text-xs font-black uppercase tracking-wider text-zinc-300 transition-colors hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              <ArrowDownUp aria-hidden="true" size={16} />
              {t('categoryOrder.title')}
            </button>
            <button type="button" onClick={() => setIsItemOrderOpen(true)} disabled={categories.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 text-xs font-black uppercase tracking-wider text-zinc-300 transition-colors hover:border-cyan-200/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              <ArrowDownUp aria-hidden="true" size={16} />
              {t('order.eyebrow')}
            </button>
            <Link href={`/vault/admin/catalog/${kind}/new`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              <Plus aria-hidden="true" size={16} />
              {t('editor.newTitle', { kind: tc(`kindsSingular.${kind}`) })}
            </Link>
          </div>
        </div>

        <section aria-label={t('editor.category')} className="mt-8 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-zinc-800 bg-black px-3 text-zinc-500 focus-within:border-cyan-200/60">
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">{t('editor.title')}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" />
          </label>
          <AdminCatalogSelect
            label={t('editor.category')}
            value={category}
             options={[{ value: 'all', label: t('editor.category') }, ...categories.map((item) => ({ value: item, label: categoryLabel(item) }))]}
            onChange={setCategory}
          />
          <AdminCatalogSelect
            label={t('editor.visibility')}
            value={status}
            options={[{ value: 'all', label: t('editor.visibility') }, { value: 'active', label: t('editor.published') }, { value: 'hidden', label: t('editor.hidden') }]}
            onChange={(value) => setStatus(value as typeof status)}
          />
        </section>

        <div className="mt-8 space-y-8">
          {Object.entries(groupedRows).map(([group, groupRows]) => (
            <section key={group} aria-labelledby={`category-${group}`}>
              <div className="mb-3 flex items-center gap-3">
                <h2 id={`category-${group}`} className="font-display text-lg font-black text-white">{categoryLabel(group)}</h2>
                <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-500">{groupRows.length}</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
                {groupRows.map((row, index) => (
                  <article key={row.id} className={`grid gap-4 p-4 md:grid-cols-[minmax(200px,1.2fr)_minmax(0,2fr)_auto] md:items-center md:p-5 ${index > 0 ? 'border-t border-zinc-800' : ''}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {row.is_active ? <CheckCircle2 aria-label={t('editor.published')} size={14} className="shrink-0 text-emerald-300" /> : <EyeOff aria-label={t('editor.hidden')} size={14} className="shrink-0 text-amber-200" />}
                        <h3 className="truncate text-sm font-bold text-white">{row.title}</h3>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-zinc-600">{row.slug}</p>
                    </div>
                    <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                       {slots.map((slot) => <p key={slot} className="truncate text-xs text-zinc-400" title={productName(row, slot, t('editor.noProducts'))}><span className="mr-1 text-[10px] font-bold uppercase text-zinc-600">{t(`slots.${slot}`)}</span>{productName(row, slot, t('editor.noProducts'))}</p>)}
                    </div>
                    <Link href={`/vault/admin/catalog/${kind}/${row.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 text-[10px] font-black uppercase tracking-wider text-zinc-300 transition-colors hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
                      <Settings2 aria-hidden="true" size={14} />
                      {t('editor.edit')}
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ))}
          {filteredRows.length === 0 && <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-16 text-center text-sm text-zinc-500">{t('editor.noProducts')}</div>}
        </div>
      </div>
      {isCategoryOrderOpen && <AdminCatalogCategoryOrderDialog kind={kind} categories={categoryOrderCategories} onClose={() => setIsCategoryOrderOpen(false)} onSaved={() => { setIsCategoryOrderOpen(false); window.location.reload(); }} />}
      {isItemOrderOpen && <AdminCatalogOrderDialog kind={kind} rows={rows} categories={categories} onClose={() => setIsItemOrderOpen(false)} onSaved={() => { setIsItemOrderOpen(false); window.location.reload(); }} />}
    </main>
  );
}
