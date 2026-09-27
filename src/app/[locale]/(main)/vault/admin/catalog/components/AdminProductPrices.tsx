'use client';

import { Link } from '@/i18n/navigation';
import { ArrowLeft, Check, ExternalLink, LoaderCircle, Save, Search, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import type { AdminProductPriceRow, AdminProductPriceStatus, AdminProductPriceUpdate } from '@/lib/admin/catalog';
import { useTranslations } from 'next-intl';

type Draft = Omit<AdminProductPriceUpdate, 'id'>;
type DraftField = keyof Draft;

type PriceFilters = {
  q: string;
  type: string;
  status: AdminProductPriceStatus;
};

function toDraft(row: AdminProductPriceRow): Draft {
  return {
    price_usd: row.price_usd,
    price_eur: row.price_eur,
    price_base_usd: row.price_base_usd,
    price_base_eur: row.price_base_eur,
    price_source_url_usd: row.price_source_url_usd,
    price_source_url_eur: row.price_source_url_eur,
    price_checked_at_usd: row.price_checked_at_usd,
    price_checked_at_eur: row.price_checked_at_eur,
  };
}

function formatPrice(value: number | null, currency: 'USD' | 'EUR'): string {
  if (value === null) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

function isCurrent(row: Draft): boolean {
  return row.price_usd !== null && row.price_eur !== null;
}

function isSourceIncomplete(row: Draft): boolean {
  return (row.price_usd !== null && (!row.price_source_url_usd || !row.price_checked_at_usd))
    || (row.price_eur !== null && (!row.price_source_url_eur || !row.price_checked_at_eur));
}

export default function AdminProductPrices({
  initialRows,
  count,
  page,
  pageSize,
  types,
  filters,
}: {
  initialRows: AdminProductPriceRow[];
  count: number;
  page: number;
  pageSize: number;
  types: string[];
  filters: PriceFilters;
}) {
  const t = useTranslations('admin.catalog');
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(initialRows.map((row) => [row.id, toDraft(row)])));
  const [dirty, setDirty] = useState<Set<string>>(() => new Set());
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const totalPages = Math.max(Math.ceil(count / pageSize), 1);
  const selectedCount = dirty.size;

  const updateField = (id: string, field: DraftField, value: string | number | null) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
    setDirty((current) => new Set(current).add(id));
    setSaved((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setNotice(null);
  };

  const saveRows = async (ids: string[]) => {
    if (!ids.length) return;
    setSaving((current) => new Set([...current, ...ids]));
    setNotice(null);
    try {
      const response = await fetch('/api/vault/admin/catalog/prices', {
        method: 'PUT',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: ids.map((id) => ({ id, ...drafts[id] })) }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'REQUEST_FAILED');
      setDirty((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setSaved((current) => new Set([...current, ...ids]));
      setNotice({ type: 'success', message: ids.length === 1 ? t('prices.savedOne') : t('prices.savedMany', { count: ids.length }) });
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error && error.message !== 'REQUEST_FAILED' ? error.message : t('prices.saveError') });
    } finally {
      setSaving((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  return (
    <main id="price-management" className="vault-page min-h-screen bg-black px-3 py-6 font-technical sm:px-6 md:px-10 md:py-10 lg:px-16">
      <div className="mx-auto max-w-[1500px]">
        <Link href="/vault/admin/catalog" className="inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
          <ArrowLeft aria-hidden="true" size={13} />
          {t('backToCatalog')}
        </Link>

        <header className="mt-6 flex flex-col gap-5 border-b border-zinc-800 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-display text-3xl font-black tracking-tight text-white md:text-5xl">{t('prices.title')}</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 md:text-base">{t('prices.description')}</p>
          </div>
          <div className="flex shrink-0 items-end gap-5 text-right">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">{t('prices.total')}</p><p className="mt-1 font-display text-2xl font-black text-white">{count}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">{t('prices.pending')}</p><p className={`mt-1 font-display text-2xl font-black ${selectedCount ? 'text-amber-200' : 'text-zinc-500'}`}>{selectedCount}</p></div>
          </div>
        </header>

        <form method="get" className="mt-7 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-zinc-800 bg-black px-3 text-zinc-500 focus-within:border-cyan-200/60">
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">{t('prices.search')}</span>
            <input name="q" defaultValue={filters.q} placeholder={t('prices.searchPlaceholder')} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" />
          </label>
          <FilterSelect name="type" value={filters.type} label={t('prices.type')} options={[{ value: 'all', label: t('prices.allTypes') }, ...types.map((type) => ({ value: type, label: type.toUpperCase() }))]} />
          <FilterSelect name="status" value={filters.status} label={t('prices.status')} options={[{ value: 'all', label: t('prices.allStatuses') }, { value: 'current', label: t('prices.complete') }, { value: 'missing', label: t('prices.missing') }]} />
          <button type="submit" className="min-h-11 rounded-xl bg-white px-5 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{t('prices.filter')}</button>
        </form>

        {notice && <div role={notice.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-relaxed ${notice.type === 'error' ? 'border-red-900/70 bg-red-950/20 text-red-200' : 'border-emerald-900/70 bg-emerald-950/20 text-emerald-200'}`}><span aria-hidden="true">{notice.type === 'error' ? <TriangleAlert size={16} /> : <Check size={16} />}</span>{notice.message}</div>}

        <div className="mt-7 hidden overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60 lg:block">
          <div className="grid grid-cols-[minmax(230px,1.3fr)_minmax(270px,1fr)_minmax(270px,1fr)_115px] border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
            <span>{t('prices.product')}</span><span>USD</span><span>EUR</span><span className="text-right">{t('prices.action')}</span>
          </div>
          {initialRows.map((row) => <DesktopPriceRow key={row.id} row={row} draft={drafts[row.id]} isDirty={dirty.has(row.id)} isSaved={saved.has(row.id)} isSaving={saving.has(row.id)} onChange={updateField} onSave={() => saveRows([row.id])} t={t} />)}
          {initialRows.length === 0 && <EmptyState label={t('prices.empty')} />}
        </div>

        <div className="mt-7 space-y-3 lg:hidden">
          {initialRows.map((row) => <MobilePriceRow key={row.id} row={row} draft={drafts[row.id]} isDirty={dirty.has(row.id)} isSaved={saved.has(row.id)} isSaving={saving.has(row.id)} onChange={updateField} onSave={() => saveRows([row.id])} t={t} />)}
          {initialRows.length === 0 && <EmptyState label={t('prices.empty')} />}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Pagination page={page} totalPages={totalPages} filters={filters} label={t('prices.pagination')} />
          <button type="button" onClick={() => saveRows([...dirty])} disabled={!selectedCount || saving.size > 0} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-200 px-5 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><Save aria-hidden="true" size={16} />{saving.size > 0 ? t('prices.saving') : t('prices.saveSelected', { count: selectedCount })}</button>
        </div>
      </div>
    </main>
  );
}

function FilterSelect({ name, value, label, options }: { name: string; value: string; label: string; options: Array<{ value: string; label: string }> }) {
  return <label className="flex min-h-11 items-center rounded-xl border border-zinc-800 bg-black px-3 focus-within:border-cyan-200/60"><span className="sr-only">{label}</span><select name={name} defaultValue={value} className="w-full bg-transparent text-xs font-bold uppercase tracking-wider text-zinc-300 outline-none">{options.map((option) => <option key={option.value} value={option.value} className="bg-zinc-950">{option.label}</option>)}</select></label>;
}

function PriceInput({ id, label, value, onChange, type = 'number' }: { id: string; label: string; value: string | number | null; onChange: (value: string | number | null) => void; type?: 'number' | 'url' | 'date' }) {
  return <label htmlFor={id} className="block min-w-0"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-600">{label}</span><input id={id} type={type} inputMode={type === 'number' ? 'decimal' : undefined} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} value={value ?? ''} onChange={(event) => onChange(type === 'number' ? (event.target.value === '' ? null : Number(event.target.value)) : event.target.value || null)} className="min-h-11 w-full rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white outline-none transition-colors focus:border-cyan-200/70 focus:ring-1 focus:ring-cyan-200/30" /></label>;
}

function PriceGroup({ idPrefix, draft, currency, onChange, t }: { idPrefix: string; draft: Draft; currency: 'usd' | 'eur'; onChange: (field: DraftField, value: string | number | null) => void; t: ReturnType<typeof useTranslations<'admin.catalog'>> }) {
  const upper = currency.toUpperCase();
  return <fieldset className="space-y-3"><legend className="mb-2 font-display text-lg font-black text-white">{upper}</legend><div className="grid gap-3 sm:grid-cols-2"><PriceInput id={`${idPrefix}-base`} label={t('prices.msrp')} value={draft[`price_base_${currency}`]} onChange={(value) => onChange(`price_base_${currency}`, value)} /><PriceInput id={`${idPrefix}-current`} label={t('prices.webPrice')} value={draft[`price_${currency}`]} onChange={(value) => onChange(`price_${currency}`, value)} /><PriceInput id={`${idPrefix}-source`} label={t('prices.source')} type="url" value={draft[`price_source_url_${currency}`]} onChange={(value) => onChange(`price_source_url_${currency}`, value)} /><PriceInput id={`${idPrefix}-checked`} label={t('prices.checked')} type="date" value={draft[`price_checked_at_${currency}`]} onChange={(value) => onChange(`price_checked_at_${currency}`, value)} /></div><p className="text-[10px] leading-relaxed text-zinc-600">{t('prices.fallbackHint')}</p></fieldset>;
}

function ProductIdentity({ row, t }: { row: AdminProductPriceRow; t: ReturnType<typeof useTranslations<'admin.catalog'>> }) {
  return <div className="min-w-0"><div className="flex items-start gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full border border-cyan-200" aria-hidden="true" /><div className="min-w-0"><h2 className="truncate text-sm font-bold text-white">{row.name}</h2><p className="mt-1 truncate text-[11px] text-zinc-600">{row.brand} · {row.type.toUpperCase()}</p></div></div><a href={`/catalog/${row.slug}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{t('prices.openProduct')} <ExternalLink aria-hidden="true" size={13} /></a></div>;
}

function StatusLine({ draft, isDirty, isSaved, t }: { draft: Draft; isDirty: boolean; isSaved: boolean; t: ReturnType<typeof useTranslations<'admin.catalog'>> }) {
  const label = isDirty ? t('prices.unsaved') : isSaved ? t('prices.saved') : isSourceIncomplete(draft) ? t('prices.needsSource') : isCurrent(draft) ? t('prices.ready') : t('prices.fallback');
  return <p className={`mt-3 text-[10px] font-bold uppercase tracking-wider ${isDirty ? 'text-amber-200' : isSaved ? 'text-emerald-300' : isSourceIncomplete(draft) ? 'text-amber-200' : 'text-zinc-600'}`}>{label}</p>;
}

function DesktopPriceRow({ row, draft, isDirty, isSaved, isSaving, onChange, onSave, t }: { row: AdminProductPriceRow; draft: Draft; isDirty: boolean; isSaved: boolean; isSaving: boolean; onChange: (id: string, field: DraftField, value: string | number | null) => void; onSave: () => void; t: ReturnType<typeof useTranslations<'admin.catalog'>> }) {
  return <article className="grid grid-cols-[minmax(230px,1.3fr)_minmax(270px,1fr)_minmax(270px,1fr)_115px] gap-5 border-b border-zinc-800 p-5 last:border-b-0"><div><ProductIdentity row={row} t={t} /><StatusLine draft={draft} isDirty={isDirty} isSaved={isSaved} t={t} /></div><PriceGroup idPrefix={`${row.id}-usd`} draft={draft} currency="usd" onChange={(field, value) => onChange(row.id, field, value)} t={t} /><PriceGroup idPrefix={`${row.id}-eur`} draft={draft} currency="eur" onChange={(field, value) => onChange(row.id, field, value)} t={t} /><button type="button" onClick={onSave} disabled={!isDirty || isSaving} className="self-start inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 text-[10px] font-black uppercase tracking-wider text-zinc-300 transition-colors hover:border-cyan-200/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <Save aria-hidden="true" size={14} />}{t('prices.save')}</button></article>;
}

function MobilePriceRow({ row, draft, isDirty, isSaved, isSaving, onChange, onSave, t }: { row: AdminProductPriceRow; draft: Draft; isDirty: boolean; isSaved: boolean; isSaving: boolean; onChange: (id: string, field: DraftField, value: string | number | null) => void; onSave: () => void; t: ReturnType<typeof useTranslations<'admin.catalog'>> }) {
  return <article className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"><div className="flex items-start justify-between gap-3"><ProductIdentity row={row} t={t} /><div className="shrink-0 text-right"><p className="text-[10px] uppercase tracking-wider text-zinc-600">{t('prices.effective')}</p><p className="mt-1 text-sm font-bold text-white">{formatPrice(draft.price_usd, 'USD')}</p></div></div><StatusLine draft={draft} isDirty={isDirty} isSaved={isSaved} t={t} /><div className="mt-5 space-y-5 border-t border-zinc-800 pt-5"><PriceGroup idPrefix={`${row.id}-mobile-usd`} draft={draft} currency="usd" onChange={(field, value) => onChange(row.id, field, value)} t={t} /><PriceGroup idPrefix={`${row.id}-mobile-eur`} draft={draft} currency="eur" onChange={(field, value) => onChange(row.id, field, value)} t={t} /></div><button type="button" onClick={onSave} disabled={!isDirty || isSaving} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Save aria-hidden="true" size={16} />}{t('prices.save')}</button></article>;
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-16 text-center text-sm text-zinc-500">{label}</div>;
}

function Pagination({ page, totalPages, filters, label }: { page: number; totalPages: number; filters: PriceFilters; label: string }) {
  const hrefFor = (nextPage: number) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.type !== 'all') params.set('type', filters.type);
    if (filters.status !== 'all') params.set('status', filters.status);
    params.set('page', String(nextPage));
    return `/vault/admin/catalog/prices?${params.toString()}`;
  };
  return <nav aria-label={label} className="flex items-center gap-2 text-xs text-zinc-500">{page > 1 ? <Link href={hrefFor(page - 1)} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-800 px-3 transition-colors hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{label.split('|')[0]}</Link> : null}<span className="px-2 font-bold text-zinc-300">{page} / {totalPages}</span>{page < totalPages ? <Link href={hrefFor(page + 1)} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-800 px-3 transition-colors hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{label.split('|')[1]}</Link> : null}</nav>;
}
