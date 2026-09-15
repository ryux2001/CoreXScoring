'use client';

import { ArrowDown, ArrowUp, Check, GripVertical, LoaderCircle, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { CatalogKind } from '@/lib/admin/catalog';

export default function AdminCatalogCategoryOrderDialog({
  kind,
  categories,
  onClose,
  onSaved,
}: {
  kind: CatalogKind;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragCategory = useRef<string | null>(null);

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedCategories.length) return;
    setOrderedCategories((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const drop = (target: string) => {
    const source = dragCategory.current;
    if (!source || source === target) return;
    setOrderedCategories((current) => {
      const sourceIndex = current.indexOf(source);
      const targetIndex = current.indexOf(target);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/vault/admin/catalog/${kind}/order`, {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'categories', categories: orderedCategories }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'No se pudo guardar el orden de categorías.');
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el orden de categorías.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="catalog-category-order-title" className="flex max-h-[min(720px,calc(100vh-1.5rem))] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950 shadow-[0_24px_100px_rgba(0,0,0,0.5)] sm:max-h-[calc(100vh-3rem)]">
        <header className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5 sm:p-6"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/70">Orden de categorías</p><h2 id="catalog-category-order-title" className="mt-1 font-display text-2xl font-black text-white">Reordenar categorías</h2><p className="mt-1 text-xs leading-relaxed text-zinc-500">El orden de aquí determina el orden de los bloques del catálogo.</p></div><button type="button" onClick={onClose} aria-label="Cerrar ventana de orden de categorías" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><X aria-hidden="true" size={17} /></button></header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5"><ol className="space-y-2" aria-label="Orden de categorías">{orderedCategories.map((category, index) => <li key={category} draggable onDragStart={() => { dragCategory.current = category; setDraggedCategory(category); }} onDragEnd={() => { dragCategory.current = null; setDraggedCategory(null); }} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(category)} className={`grid grid-cols-[28px_28px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 transition-colors ${draggedCategory === category ? 'border-cyan-200/70 bg-cyan-200/[0.08]' : 'border-zinc-800 bg-black/40 hover:border-zinc-600'}`}><span className="text-center font-display text-sm font-black text-zinc-600" aria-label={`Posición ${index + 1}`}>{index + 1}</span><GripVertical aria-label="Arrastrar para reordenar" className="cursor-grab text-zinc-600 active:cursor-grabbing" size={17} /><span className="truncate text-xs font-bold text-zinc-200">{category}</span><div className="flex items-center gap-1"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir categoría ${category}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:border-cyan-200/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><ArrowUp aria-hidden="true" size={15} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === orderedCategories.length - 1} aria-label={`Bajar categoría ${category}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:border-cyan-200/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><ArrowDown aria-hidden="true" size={15} /></button></div></li>)}</ol>{!orderedCategories.length && <p className="py-12 text-center text-xs text-zinc-600">No hay categorías para ordenar.</p>}</div>
        <footer className="border-t border-zinc-800 p-4 sm:p-5">{error && <p role="alert" className="mb-3 rounded-lg border border-red-900/60 bg-red-950/20 px-3 py-2 text-xs text-red-200">{error}</p>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={isSaving} className="min-h-11 rounded-xl border border-zinc-800 px-4 text-xs font-bold text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Cancelar</button><button type="button" onClick={save} disabled={isSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-cyan-100 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Check aria-hidden="true" size={15} />}{isSaving ? 'Guardando' : 'Guardar orden'}</button></div></footer>
      </section>
    </div>
  );
}
