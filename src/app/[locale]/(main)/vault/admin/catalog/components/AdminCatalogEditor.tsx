'use client';

import { Link } from '@/i18n/navigation';
import { ArrowLeft, ChevronDown, Eye, EyeOff, LoaderCircle, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { AdminCatalogProduct, AdminCatalogRow, CatalogKind, CatalogSlot } from '@/lib/admin/catalog';

const SLOT_LABELS: Record<CatalogSlot, string> = {
  cpu: 'Procesador',
  gpu: 'Tarjeta gráfica',
  ram: 'Memoria RAM',
  motherboard: 'Placa base',
  storage: 'Almacenamiento',
  psu: 'Fuente de alimentación',
};

const SLOT_HELP: Record<CatalogSlot, string> = {
  cpu: 'Selecciona un procesador del catálogo.',
  gpu: 'Selecciona una tarjeta gráfica del catálogo.',
  ram: 'Selecciona un módulo o kit de memoria.',
  motherboard: 'Selecciona una placa base compatible.',
  storage: 'Selecciona una unidad de almacenamiento.',
  psu: 'Selecciona una fuente de alimentación.',
};

type FormState = Record<string, string | boolean>;

function getSlots(kind: CatalogKind): CatalogSlot[] {
  return kind === 'builds' ? ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'] : ['cpu', 'gpu', 'ram'];
}

function getInitialForm(kind: CatalogKind, row?: AdminCatalogRow): FormState {
  const form: FormState = {
    title: row?.title ?? '',
    category: row?.category ?? '',
    is_active: row?.is_active ?? true,
  };

  for (const slot of getSlots(kind)) {
    form[`${slot}_id`] = row?.[`${slot}_id`] ? String(row[`${slot}_id`]) : '';
    for (const currency of ['usd', 'eur']) {
      const value = row?.[`custom_price_${slot}_${currency}`];
      form[`custom_price_${slot}_${currency}`] = value === null || value === undefined ? '' : String(value);
    }
  }

  return form;
}

function getInitialProducts(kind: CatalogKind, row?: AdminCatalogRow): Record<string, AdminCatalogProduct | null> {
  return Object.fromEntries(getSlots(kind).map((slot) => [slot, row?.[slot] ?? null])) as Record<string, AdminCatalogProduct | null>;
}

export default function AdminCatalogEditor({ kind, initialRow }: { kind: CatalogKind; initialRow?: AdminCatalogRow }) {
  const router = useRouter();
  const slots = getSlots(kind);
  const [form, setForm] = useState<FormState>(() => getInitialForm(kind, initialRow));
  const [products, setProducts] = useState<Record<string, AdminCatalogProduct | null>>(() => getInitialProducts(kind, initialRow));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const isEditing = Boolean(initialRow);
  const title = kind === 'builds' ? 'build' : 'combo';

  const updateField = (field: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectProduct = (slot: CatalogSlot, product: AdminCatalogProduct | null) => {
    setProducts((current) => ({ ...current, [slot]: product }));
    updateField(`${slot}_id`, product?.id ?? '');
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);

    try {
      const response = await fetch(
        isEditing ? `/api/vault/admin/catalog/${kind}/${initialRow?.id}` : `/api/vault/admin/catalog/${kind}`,
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      );
      const payload = await response.json() as { error?: string; id?: string };
      if (!response.ok) throw new Error(payload.error ?? `No se pudo guardar el ${title}.`);

      setNotice({ type: 'success', message: `${title[0].toUpperCase()}${title.slice(1)} guardado correctamente.` });
      router.push(`/vault/admin/catalog/${kind}`);
      router.refresh();
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : `No se pudo guardar el ${title}.` });
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!initialRow || !window.confirm(`¿Eliminar definitivamente el ${title} «${initialRow.title}»? Esta acción no se puede deshacer.`)) return;
    setIsDeleting(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/vault/admin/catalog/${kind}/${initialRow.id}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? `No se pudo eliminar el ${title}.`);
      router.push(`/vault/admin/catalog/${kind}`);
      router.refresh();
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : `No se pudo eliminar el ${title}.` });
      setIsDeleting(false);
    }
  };

  return (
    <main className="vault-page min-h-screen bg-black px-3 py-6 font-technical sm:px-6 md:px-10 md:py-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Link href={`/vault/admin/catalog/${kind}`} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
          <ArrowLeft aria-hidden="true" size={13} />
          Volver a {title}s
        </Link>

        <header className="mt-7 flex flex-col gap-4 border-b border-zinc-800 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">Catálogo / {isEditing ? 'Editar' : 'Nuevo'}</p>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-white md:text-5xl">{isEditing ? initialRow?.title : `Nuevo ${title}`}</h1>
            {initialRow && <p className="mt-2 text-xs text-zinc-600">ID: {initialRow.id} · Slug: {initialRow.slug}</p>}
          </div>
          {isEditing && (
            <button type="button" onClick={remove} disabled={isDeleting || isSaving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-900/60 px-3 text-[10px] font-black uppercase tracking-wider text-red-300 transition-colors hover:bg-red-950/40 disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
              {isDeleting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <Trash2 aria-hidden="true" size={14} />}
              Eliminar
            </button>
          )}
        </header>

        <form onSubmit={save} className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-7">
              <SectionHeading eyebrow="Información principal" title={`Datos del ${title}`} />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Título" value={String(form.title ?? '')} onChange={(value) => updateField('title', value)} required />
                <TextField label="Categoría" value={String(form.category ?? '')} onChange={(value) => updateField('category', value)} required />
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-7">
              <SectionHeading eyebrow="Configuración" title="Componentes" description="Los selectores solo muestran productos del tipo compatible con cada slot." />
              <div className="grid gap-4 sm:grid-cols-2">
                {slots.map((slot) => (
                  <ProductField key={slot} kind={kind} slot={slot} product={products[slot]} onSelect={(product) => selectProduct(slot, product)} />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-7">
              <SectionHeading eyebrow="Precios opcionales" title="Ofertas personalizadas" description="Deja un campo vacío para usar el precio vigente del producto." />
              <div className="space-y-3">
                {slots.map((slot) => (
                  <div key={slot} className="grid items-center gap-3 rounded-xl border border-zinc-800 bg-black/40 p-3 sm:grid-cols-[minmax(130px,1fr)_1fr_1fr]">
                    <span className="text-xs font-bold text-zinc-300">{SLOT_LABELS[slot]}</span>
                    <PriceField label={`${SLOT_LABELS[slot]} USD`} value={String(form[`custom_price_${slot}_usd`] ?? '')} onChange={(value) => updateField(`custom_price_${slot}_usd`, value)} />
                    <PriceField label={`${SLOT_LABELS[slot]} EUR`} value={String(form[`custom_price_${slot}_eur`] ?? '')} onChange={(value) => updateField(`custom_price_${slot}_eur`, value)} />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="h-fit space-y-5 lg:sticky lg:top-6">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-6">
              <SectionHeading eyebrow="Publicación" title="Visibilidad" />
              <button type="button" onClick={() => updateField('is_active', form.is_active !== true)} aria-pressed={form.is_active === true} className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${form.is_active === true ? 'border-emerald-300/30 bg-emerald-300/[0.06]' : 'border-zinc-700 bg-black/30'}`}>
                <span className="flex items-center gap-3">{form.is_active === true ? <Eye aria-hidden="true" className="text-emerald-300" size={17} /> : <EyeOff aria-hidden="true" className="text-amber-200" size={17} />}<span><strong className="block text-xs text-zinc-200">{form.is_active === true ? 'Publicado' : 'Oculto'}</strong><span className="block text-[11px] text-zinc-500">{form.is_active === true ? 'Visible en el catálogo público.' : 'No aparecerá en listados públicos.'}</span></span></span>
                <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${form.is_active === true ? 'bg-emerald-300' : 'bg-zinc-700'}`}><span className={`block h-4 w-4 rounded-full bg-black transition-transform ${form.is_active === true ? 'translate-x-4' : ''}`} /></span>
              </button>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-6">
              <p className="text-xs leading-relaxed text-zinc-500">Los cambios se aplican directamente al registro del catálogo. El slug actual se conserva para no romper enlaces compartidos.</p>
              <button type="submit" disabled={isSaving || isDeleting} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-cyan-100 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
                {isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Save aria-hidden="true" size={16} />}
                {isSaving ? 'Guardando' : isEditing ? 'Guardar cambios' : `Crear ${title}`}
              </button>
              <Link href={`/vault/admin/catalog/${kind}`} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><X aria-hidden="true" size={15} />Cancelar</Link>
            </section>
            {notice && <p role={notice.type === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${notice.type === 'error' ? 'border-red-900/60 bg-red-950/20 text-red-200' : 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200'}`}>{notice.message}</p>}
          </aside>
        </form>
      </div>
    </main>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="mb-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/70">{eyebrow}</p><h2 className="mt-1 font-display text-xl font-black text-white">{title}</h2>{description && <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>}</div>;
}

function TextField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-zinc-300">{label}{required && <span aria-hidden="true" className="ml-1 text-cyan-200">*</span>}</span><input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-sm text-white outline-none transition-colors focus:border-cyan-200/70 focus:ring-1 focus:ring-cyan-200/30" /></label>;
}

function PriceField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="sr-only">{label}</span><div className="flex min-h-10 items-center rounded-lg border border-zinc-800 bg-black px-3 focus-within:border-cyan-200/60"><span className="mr-2 text-[10px] font-bold uppercase text-zinc-600">{label.endsWith('USD') ? '$' : '€'}</span><input type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Precio automático" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-700" /></div></label>;
}

function ProductField({ kind, slot, product, onSelect }: { kind: CatalogKind; slot: CatalogSlot; product: AdminCatalogProduct | null; onSelect: (product: AdminCatalogProduct | null) => void }) {
  const [query, setQuery] = useState(product?.name ?? '');
  const [results, setResults] = useState<AdminCatalogProduct[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/vault/admin/catalog/products?kind=${kind}&slot=${slot}&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json() as { products?: AdminCatalogProduct[] };
        setResults(payload.products ?? []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [kind, query, slot]);

  return <div className="relative"><label className="block"><span className="mb-2 block text-xs font-bold text-zinc-300">{SLOT_LABELS[slot]}</span><div className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-black px-3 focus-within:border-cyan-200/60"><input value={query} onFocus={() => setIsOpen(true)} onChange={(event) => { const value = event.target.value; setQuery(value); if (product && value !== product.name) onSelect(null); setIsOpen(true); }} placeholder={SLOT_HELP[slot]} className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-700" />{isLoading ? <LoaderCircle aria-label="Buscando" className="animate-spin text-zinc-600" size={15} /> : <ChevronDown aria-hidden="true" className="text-zinc-600" size={15} />}</div></label>{isOpen && <><button type="button" aria-label="Cerrar resultados" className="fixed inset-0 z-10 cursor-default" onClick={() => setIsOpen(false)} /><div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 max-h-64 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-1 shadow-2xl">{results.map((item) => <button type="button" key={item.id} onClick={() => { onSelect(item); setQuery(item.name); setIsOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none"><span className="block truncate text-xs font-bold text-zinc-200">{item.name}</span><span className="mt-0.5 block text-[10px] text-zinc-600">{item.brand} · {item.slug}</span></button>)}{results.length === 0 && <p className="px-3 py-4 text-xs text-zinc-600">No se encontraron productos.</p>}</div></>}</div>;
}
