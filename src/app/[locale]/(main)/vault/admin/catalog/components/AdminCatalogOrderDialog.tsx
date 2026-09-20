'use client';

import { ArrowDown, ArrowUp, Check, GripVertical, LoaderCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AdminCatalogRow, CatalogKind } from '@/lib/admin/catalog';
import AdminCatalogSelect from './AdminCatalogSelect';
import { useTranslations } from 'next-intl';
import { normalizeCategory, UNCATEGORIZED_CATEGORY } from '@/lib/admin/catalog-categories';

export default function AdminCatalogOrderDialog({
  kind,
  rows,
  categories,
  onClose,
  onSaved,
}: {
  kind: CatalogKind;
  rows: AdminCatalogRow[];
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('admin.catalog');
  const uncategorized = UNCATEGORIZED_CATEGORY;
  const initialOrders = categories.reduce<Record<string, AdminCatalogRow[]>>((orders, category) => {
    orders[category] = rows.filter((row) => normalizeCategory(row.category) === category);
    return orders;
  }, {});
  const [selectedCategory, setSelectedCategory] = useState(categories[0] ?? '');
  const [orders, setOrders] = useState(initialOrders);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const orderedRows = orders[selectedCategory] ?? [];
  const label = t(`kinds.${kind}`);
  const selectedCategoryLabel = selectedCategory === uncategorized ? t('uncategorized') : selectedCategory;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button, select, input, [href], [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled'));
    focusable()[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedRows.length) return;
    setOrders((current) => {
      const next = [...(current[selectedCategory] ?? [])];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return { ...current, [selectedCategory]: next };
    });
  };

  const drop = (targetId: string) => {
    const sourceId = dragId.current;
    if (!sourceId || sourceId === targetId) return;
    setOrders((current) => {
      const currentRows = [...(current[selectedCategory] ?? [])];
      const sourceIndex = currentRows.findIndex((row) => row.id === sourceId);
      const targetIndex = currentRows.findIndex((row) => row.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const [moved] = currentRows.splice(sourceIndex, 1);
      currentRows.splice(targetIndex, 0, moved);
      return { ...current, [selectedCategory]: currentRows };
    });
  };

  const save = async () => {
    if (!selectedCategory) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/vault/admin/catalog/${kind}/order`, {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'items', category: selectedCategory, ids: orderedRows.map((row) => row.id) }),
      });
       if (!response.ok) throw new Error('REQUEST_FAILED');
      onSaved();
     } catch (saveError) {
       setError(saveError instanceof Error && saveError.message !== 'REQUEST_FAILED' ? saveError.message : t('errors.saveOrder'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-6">
       <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="catalog-item-order-title" className="flex max-h-[min(720px,calc(100vh-1.5rem))] w-full max-w-2xl flex-col rounded-3xl border border-zinc-700 bg-zinc-950 shadow-[0_24px_100px_rgba(0,0,0,0.5)] sm:max-h-[calc(100vh-3rem)]">
        <header className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5 sm:p-6">
          <div className="min-w-0 flex-1">
             <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/70">{t('order.eyebrow')}</p>
             <h2 id="catalog-item-order-title" className="mt-1 font-display text-2xl font-black text-white">{t('order.title', { kind: label })}</h2>
              <div className="mt-4"><AdminCatalogSelect label={t('order.category')} value={selectedCategory} options={categories.map((category) => ({ value: category, label: category === uncategorized ? t('uncategorized') : category }))} onChange={setSelectedCategory} showLabel /></div>
          </div>
           <button data-dialog-close type="button" onClick={onClose} aria-label={t('order.close')} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><X aria-hidden="true" size={17} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
            <ol className="space-y-2" aria-label={t('order.listLabel', { category: selectedCategoryLabel || t('order.category') })}>
            {orderedRows.map((row, index) => (
              <li key={row.id} draggable onDragStart={() => { dragId.current = row.id; setDraggedId(row.id); }} onDragEnd={() => { dragId.current = null; setDraggedId(null); }} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(row.id)} className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 transition-colors sm:grid-cols-[28px_28px_minmax(0,1fr)_auto] ${draggedId === row.id ? 'border-cyan-200/70 bg-cyan-200/[0.08]' : 'border-zinc-800 bg-black/40 hover:border-zinc-600'}`}>
                 <span className="text-center font-display text-sm font-black text-zinc-600" aria-label={t('order.position', { position: index + 1 })}>{index + 1}</span>
                 <GripVertical aria-label={t('order.drag')} className="cursor-grab text-zinc-600 active:cursor-grabbing" size={17} />
                <div className="min-w-0"><p className="truncate text-xs font-bold text-zinc-200">{row.title}</p><p className="mt-1 truncate text-[10px] text-zinc-600">{row.slug}</p></div>
                 <div className="flex items-center gap-1"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={t('order.moveUp', { title: row.title })} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:border-cyan-200/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><ArrowUp aria-hidden="true" size={15} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === orderedRows.length - 1} aria-label={t('order.moveDown', { title: row.title })} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:border-cyan-200/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><ArrowDown aria-hidden="true" size={15} /></button></div>
              </li>
            ))}
          </ol>
           {!orderedRows.length && <p className="py-12 text-center text-xs text-zinc-600">{t('order.empty')}</p>}
        </div>

        <footer className="border-t border-zinc-800 p-4 sm:p-5">
          {error && <p role="alert" className="mb-3 rounded-lg border border-red-900/60 bg-red-950/20 px-3 py-2 text-xs text-red-200">{error}</p>}
           <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={isSaving} className="min-h-11 rounded-xl border border-zinc-800 px-4 text-xs font-bold text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{t('order.cancel')}</button><button type="button" onClick={save} disabled={isSaving || !selectedCategory} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Check aria-hidden="true" size={15} />}{isSaving ? t('order.saving') : t('order.save')}</button></div>
        </footer>
      </section>
    </div>
  );
}
