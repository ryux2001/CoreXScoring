'use client';

import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, LoaderCircle, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  catalogItemLabel,
  getItemContent,
  type HomeAdminData,
  type HomeCatalogItem,
  type HomeCatalogType,
  type HomeComparison,
  type HomeContentType,
  type HomeSection,
} from '@/lib/admin/home';

const SECTION_TYPE_LABELS: Record<HomeContentType, string> = {
  products: 'Productos',
  combos: 'Combos',
  builds: 'Builds',
  comparisons: 'Comparaciones',
};

const CATALOG_TYPE_LABELS: Record<HomeCatalogType, string> = {
  products: 'Productos',
  combos: 'Combos',
  builds: 'Builds',
};

interface Notice {
  type: 'error' | 'success';
  message: string;
}

async function requestJson(path: string, method: string, body?: unknown): Promise<{ error?: string; id?: string }> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json() as { error?: string; id?: string };
  if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el cambio.');
  return payload;
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const nextItems = [...items];
  [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
  return nextItems;
}

export default function AdminHomeManager({ initialData }: { initialData: HomeAdminData }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const refresh = () => router.refresh();

  const reorder = async (scope: 'sections' | 'comparisons', ids: string[], parentId?: string) => {
    setNotice(null);
    try {
      await requestJson('/api/vault/admin/home/order', 'PATCH', {
        scope,
        parent_id: parentId,
        ids,
      });
      refresh();
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo guardar el orden.' });
    }
  };

  return (
    <main className="vault-page min-h-screen bg-black px-3 py-6 font-technical sm:px-6 md:px-10 md:py-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <Link href="/vault/admin/catalog" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
          <ArrowLeft aria-hidden="true" size={13} />
          Gestión de catálogo
        </Link>

        <header className="mt-7 max-w-3xl">
          <h1 className="font-display text-3xl font-black tracking-tight text-white md:text-5xl">Inicio editorial</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 md:text-base">Configura el banner y las listas que se mostrarán en la página de inicio. Las categorías del catálogo permanecen independientes.</p>
        </header>

        <HeroEditor hero={initialData.hero} onSaved={refresh} />

        <section className="mt-12" aria-labelledby="home-sections-heading">
          <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="home-sections-heading" className="font-display text-2xl font-black text-white">Secciones de inicio</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">Crea listas de productos, combos, builds o comparaciones y decide su orden manualmente.</p>
            </div>
            <button type="button" onClick={() => setIsCreating((current) => !current)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              <Plus aria-hidden="true" size={16} />
              Nueva sección
            </button>
          </div>

          {isCreating && <NewSectionForm onSaved={() => { setIsCreating(false); refresh(); }} />}

          <div className="mt-6 space-y-5">
            {initialData.sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                canMoveUp={index > 0}
                canMoveDown={index < initialData.sections.length - 1}
                onMove={(direction) => {
                  const ordered = moveItem(initialData.sections, index, direction);
                  void reorder('sections', ordered.map((item) => item.id));
                }}
                onSaved={refresh}
                onNotice={setNotice}
                onReorderComparisons={(ids) => void reorder('comparisons', ids, section.id)}
              />
            ))}
            {initialData.sections.length === 0 && !isCreating && <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-16 text-center text-sm text-zinc-500">Todavía no hay secciones publicables. Crea la primera lista para empezar.</div>}
          </div>
        </section>

        {notice && <p role={notice.type === 'error' ? 'alert' : 'status'} className={`mt-6 rounded-xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-red-900/60 bg-red-950/20 text-red-200' : 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200'}`}>{notice.message}</p>}
      </div>
    </main>
  );
}

function HeroEditor({ hero, onSaved }: { hero: HomeAdminData['hero']; onSaved: () => void }) {
  const [form, setForm] = useState(hero);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);
    try {
      await requestJson('/api/vault/admin/home', 'PATCH', form);
      setNotice({ type: 'success', message: 'Banner guardado correctamente.' });
      onSaved();
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo guardar el banner.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-7">
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-black text-white">Banner principal</h2>
          <p className="mt-1 text-xs text-zinc-500">El primer mensaje y sus acciones en la página de inicio.</p>
        </div>
        <VisibilityToggle value={form.is_active} onChange={(value) => update('is_active', value)} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <TextInput label="Etiqueta" value={form.eyebrow} onChange={(value) => update('eyebrow', value)} />
        <TextInput label="Título" value={form.title} onChange={(value) => update('title', value)} required />
        <TextArea label="Descripción" value={form.description} onChange={(value) => update('description', value)} className="md:col-span-2" required />
        <TextInput label="Acción principal" value={form.primary_label} onChange={(value) => update('primary_label', value)} required />
        <TextInput label="Ruta principal" value={form.primary_href} onChange={(value) => update('primary_href', value)} required />
        <TextInput label="Acción secundaria" value={form.secondary_label} onChange={(value) => update('secondary_label', value)} required />
        <TextInput label="Ruta secundaria" value={form.secondary_href} onChange={(value) => update('secondary_href', value)} required />
      </div>
      <div className="mt-5 flex items-center gap-4">
        <SaveButton isSaving={isSaving} label="Guardar banner" />
        {notice && <span role={notice.type === 'error' ? 'alert' : 'status'} className={notice.type === 'error' ? 'text-xs text-red-300' : 'text-xs text-emerald-300'}>{notice.message}</span>}
      </div>
    </form>
  );
}

function NewSectionForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', eyebrow: '', content_type: 'products' as HomeContentType });
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);
    try {
      await requestJson('/api/vault/admin/home/sections', 'POST', form);
      onSaved();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo crear la sección.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-5 rounded-2xl border border-cyan-200/25 bg-cyan-200/[0.04] p-5">
      <h3 className="font-display text-xl font-black text-white">Nueva sección</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <TextInput label="Título" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} required />
        <SelectInput label="Contenido" value={form.content_type} onChange={(value) => setForm((current) => ({ ...current, content_type: value as HomeContentType }))} options={Object.entries(SECTION_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
        <TextInput label="Etiqueta" value={form.eyebrow} onChange={(value) => setForm((current) => ({ ...current, eyebrow: value }))} />
        <TextArea label="Descripción" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
      </div>
      <div className="mt-5 flex items-center gap-4"><SaveButton isSaving={isSaving} label="Crear sección" />{notice && <span role="alert" className="text-xs text-red-300">{notice}</span>}</div>
    </form>
  );
}

function SectionEditor({
  section,
  canMoveUp,
  canMoveDown,
  onMove,
  onSaved,
  onNotice,
  onReorderComparisons,
}: {
  section: HomeSection;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
  onSaved: () => void;
  onNotice: (notice: Notice) => void;
  onReorderComparisons: (ids: string[]) => void;
}) {
  const [form, setForm] = useState({
    title: section.title,
    description: section.description,
    eyebrow: section.eyebrow,
    is_active: section.is_active,
    visual_variant: section.visual_variant,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await requestJson(`/api/vault/admin/home/sections/${section.id}`, 'PATCH', form);
      onNotice({ type: 'success', message: `Se guardó «${form.title}».` });
      onSaved();
    } catch (error) {
      onNotice({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo guardar la sección.' });
    } finally {
      setIsSaving(false);
    }
  };
  const remove = async () => {
    if (!window.confirm(`¿Eliminar la sección «${section.title}» y todo su contenido?`)) return;
    setIsDeleting(true);
    try {
      await requestJson(`/api/vault/admin/home/sections/${section.id}`, 'DELETE');
      onSaved();
    } catch (error) {
      onNotice({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo eliminar la sección.' });
      setIsDeleting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5 sm:p-7">
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 flex-col rounded-lg border border-zinc-800 bg-black p-1">
            <OrderButton direction="up" disabled={!canMoveUp} onClick={() => onMove(-1)} />
            <OrderButton direction="down" disabled={!canMoveDown} onClick={() => onMove(1)} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/75">{SECTION_TYPE_LABELS[section.content_type]}</p>
            <h3 className="font-display text-xl font-black text-white">{section.title}</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <VisibilityToggle value={form.is_active} onChange={(value) => update('is_active', value)} />
          <button type="button" onClick={remove} disabled={isDeleting || isSaving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-900/60 px-3 text-[10px] font-black uppercase tracking-wider text-red-300 transition-colors hover:bg-red-950/40 disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
            {isDeleting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <Trash2 aria-hidden="true" size={14} />}
            Eliminar
          </button>
        </div>
      </div>

      <form onSubmit={save} className="mt-5 grid gap-4 md:grid-cols-2">
        <TextInput label="Título" value={form.title} onChange={(value) => update('title', value)} required />
        <SelectInput label="Estilo de lista" value={form.visual_variant} onChange={(value) => update('visual_variant', value)} options={[{ value: 'default', label: 'Estándar' }, { value: 'spotlight', label: 'Destacado' }, { value: 'compact', label: 'Compacto' }]} />
        <TextInput label="Etiqueta" value={form.eyebrow} onChange={(value) => update('eyebrow', value)} />
        <TextArea label="Descripción" value={form.description} onChange={(value) => update('description', value)} />
        <div className="md:col-span-2"><SaveButton isSaving={isSaving} label="Guardar sección" /></div>
      </form>

      {section.content_type === 'comparisons' ? (
        <ComparisonList section={section} onSaved={onSaved} onNotice={onNotice} onReorder={onReorderComparisons} />
      ) : (
        <ItemListEditor
          title={`Elementos de «${section.title}»`}
          itemType={section.content_type}
          initialItems={section.home_section_items.map(getItemContent).filter((item): item is HomeCatalogItem => Boolean(item))}
          savePath={`/api/vault/admin/home/sections/${section.id}/items`}
          onSaved={onSaved}
          emptyMessage={`Añade ${CATALOG_TYPE_LABELS[section.content_type].toLowerCase()} existentes para construir esta lista.`}
        />
      )}
    </section>
  );
}

function ComparisonList({ section, onSaved, onNotice, onReorder }: { section: HomeSection; onSaved: () => void; onNotice: (notice: Notice) => void; onReorder: (ids: string[]) => void }) {
  const [isCreating, setIsCreating] = useState(false);
  return (
    <div className="mt-8 border-t border-zinc-800 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-display text-lg font-black text-white">Comparaciones</h4>
          <p className="mt-1 text-xs text-zinc-500">Cada tarjeta abre una comparación directa de dos elementos del mismo tipo.</p>
        </div>
        <button type="button" onClick={() => setIsCreating((current) => !current)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 text-[10px] font-black uppercase tracking-wider text-zinc-200 transition-colors hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><Plus aria-hidden="true" size={14} />Nueva comparación</button>
      </div>
      {isCreating && <NewComparisonForm sectionId={section.id} onSaved={() => { setIsCreating(false); onSaved(); }} onNotice={onNotice} />}
      <div className="mt-5 space-y-4">
        {section.home_comparisons.map((comparison, index) => (
          <ComparisonEditor
            key={comparison.id}
            comparison={comparison}
            canMoveUp={index > 0}
            canMoveDown={index < section.home_comparisons.length - 1}
            onMove={(direction) => onReorder(moveItem(section.home_comparisons, index, direction).map((item) => item.id))}
            onSaved={onSaved}
            onNotice={onNotice}
          />
        ))}
        {section.home_comparisons.length === 0 && !isCreating && <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-xs text-zinc-600">No hay comparaciones en esta sección.</p>}
      </div>
    </div>
  );
}

function NewComparisonForm({ sectionId, onSaved, onNotice }: { sectionId: string; onSaved: () => void; onNotice: (notice: Notice) => void }) {
  const [form, setForm] = useState({ title: '', description: '', eyebrow: '', item_type: 'products' as HomeCatalogType });
  const [isSaving, setIsSaving] = useState(false);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await requestJson(`/api/vault/admin/home/sections/${sectionId}/comparisons`, 'POST', form);
      onSaved();
    } catch (error) {
      onNotice({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo crear la comparación.' });
    } finally {
      setIsSaving(false);
    }
  };
  return <form onSubmit={save} className="mt-5 grid gap-4 rounded-2xl border border-violet-200/20 bg-violet-200/[0.04] p-5 md:grid-cols-2">
    <TextInput label="Título" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} required />
    <SelectInput label="Tipo" value={form.item_type} onChange={(value) => setForm((current) => ({ ...current, item_type: value as HomeCatalogType }))} options={Object.entries(CATALOG_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
    <TextInput label="Etiqueta" value={form.eyebrow} onChange={(value) => setForm((current) => ({ ...current, eyebrow: value }))} />
    <TextArea label="Descripción" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
    <div className="md:col-span-2"><SaveButton isSaving={isSaving} label="Crear comparación" /></div>
  </form>;
}

function ComparisonEditor({ comparison, canMoveUp, canMoveDown, onMove, onSaved, onNotice }: { comparison: HomeComparison; canMoveUp: boolean; canMoveDown: boolean; onMove: (direction: -1 | 1) => void; onSaved: () => void; onNotice: (notice: Notice) => void }) {
  const [form, setForm] = useState({ title: comparison.title, description: comparison.description, eyebrow: comparison.eyebrow, is_active: comparison.is_active });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await requestJson(`/api/vault/admin/home/comparisons/${comparison.id}`, 'PATCH', form);
      onSaved();
    } catch (error) {
      onNotice({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo guardar la comparación.' });
    } finally {
      setIsSaving(false);
    }
  };
  const remove = async () => {
    if (!window.confirm(`¿Eliminar la comparación «${comparison.title}»?`)) return;
    setIsDeleting(true);
    try {
      await requestJson(`/api/vault/admin/home/comparisons/${comparison.id}`, 'DELETE');
      onSaved();
    } catch (error) {
      onNotice({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo eliminar la comparación.' });
      setIsDeleting(false);
    }
  };
  return <article className="rounded-2xl border border-zinc-800 bg-black/35 p-4 sm:p-5">
    <div className="flex flex-col gap-4 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950 p-1"><OrderButton direction="up" disabled={!canMoveUp} onClick={() => onMove(-1)} /><OrderButton direction="down" disabled={!canMoveDown} onClick={() => onMove(1)} /></div>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200/75">{CATALOG_TYPE_LABELS[comparison.item_type]}</p><h5 className="font-display text-lg font-black text-white">{comparison.title}</h5></div>
      </div>
      <div className="flex items-center gap-3"><VisibilityToggle value={form.is_active} onChange={(value) => update('is_active', value)} /><button type="button" onClick={remove} disabled={isDeleting || isSaving} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-900/60 px-3 text-red-300 transition-colors hover:bg-red-950/40 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300" aria-label="Eliminar comparación">{isDeleting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <Trash2 aria-hidden="true" size={14} />}</button></div>
    </div>
    <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-2">
      <TextInput label="Título" value={form.title} onChange={(value) => update('title', value)} required />
      <TextInput label="Etiqueta" value={form.eyebrow} onChange={(value) => update('eyebrow', value)} />
      <TextArea label="Descripción" value={form.description} onChange={(value) => update('description', value)} className="md:col-span-2" />
      <div><SaveButton isSaving={isSaving} label="Guardar comparación" /></div>
    </form>
    <ItemListEditor
      title="Elementos comparados"
      itemType={comparison.item_type}
      initialItems={comparison.home_comparison_items.map(getItemContent).filter((item): item is HomeCatalogItem => Boolean(item))}
      savePath={`/api/vault/admin/home/comparisons/${comparison.id}/items`}
      onSaved={onSaved}
      maxItems={2}
      minItems={2}
      emptyMessage="Añade exactamente dos elementos del mismo tipo."
    />
  </article>;
}

function ItemListEditor({ title, itemType, initialItems, savePath, onSaved, emptyMessage, maxItems, minItems = 0 }: { title: string; itemType: HomeCatalogType; initialItems: HomeCatalogItem[]; savePath: string; onSaved: () => void; emptyMessage: string; maxItems?: number; minItems?: number }) {
  const [items, setItems] = useState(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const save = async () => {
    if (items.length < minItems) {
      setNotice({ type: 'error', message: `Añade al menos ${minItems} elementos antes de guardar.` });
      return;
    }
    setIsSaving(true);
    setNotice(null);
    try {
      await requestJson(savePath, 'PUT', { item_type: itemType, ids: items.map((item) => item.id) });
      setNotice({ type: 'success', message: 'Lista guardada correctamente.' });
      onSaved();
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo guardar la lista.' });
    } finally {
      setIsSaving(false);
    }
  };
  const canAddItems = maxItems === undefined || items.length < maxItems;
  return <div className="mt-6 border-t border-zinc-800 pt-5">
    <h4 className="font-display text-lg font-black text-white">{title}</h4>
    <p className="mt-1 text-xs text-zinc-500">{emptyMessage}</p>
    <div className="mt-4 grid gap-3">
      {items.map((item, index) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-black/45 p-3">
        <div className="flex flex-col rounded-md border border-zinc-800 bg-zinc-950 p-0.5"><OrderButton direction="up" disabled={index === 0} onClick={() => setItems((current) => moveItem(current, index, -1))} /><OrderButton direction="down" disabled={index === items.length - 1} onClick={() => setItems((current) => moveItem(current, index, 1))} /></div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-zinc-200">{catalogItemLabel(item)}</p><p className="truncate text-[11px] text-zinc-600">{item.slug}</p></div>
        <button type="button" onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 transition-colors hover:border-red-900/60 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300" aria-label={`Quitar ${catalogItemLabel(item)}`}><Trash2 aria-hidden="true" size={14} /></button>
      </div>)}
      {items.length === 0 && <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-xs text-zinc-600">{emptyMessage}</p>}
    </div>
    {canAddItems && <CatalogPicker itemType={itemType} selectedIds={new Set(items.map((item) => item.id))} onAdd={(item) => setItems((current) => [...current, item])} />}
    {!canAddItems && <p className="mt-4 text-xs text-amber-200/75">La comparación ya tiene los dos elementos necesarios.</p>}
    <div className="mt-4 flex items-center gap-4"><SaveButton isSaving={isSaving} label="Guardar lista" onClick={save} type="button" />{notice && <span role={notice.type === 'error' ? 'alert' : 'status'} className={notice.type === 'error' ? 'text-xs text-red-300' : 'text-xs text-emerald-300'}>{notice.message}</span>}</div>
  </div>;
}

function CatalogPicker({ itemType, selectedIds, onAdd }: { itemType: HomeCatalogType; selectedIds: Set<string>; onAdd: (item: HomeCatalogItem) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HomeCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const search = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/vault/admin/home/catalog-items?type=${itemType}&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
      const payload = await response.json() as { items?: HomeCatalogItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error || 'No se pudieron buscar elementos.');
      setResults(payload.items || []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudieron buscar elementos.');
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="mt-4 rounded-xl border border-dashed border-zinc-700 bg-black/25 p-4">
    <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
      <label className="flex min-h-10 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 text-zinc-500 focus-within:border-cyan-200/60"><Search aria-hidden="true" size={14} /><span className="sr-only">Buscar {CATALOG_TYPE_LABELS[itemType].toLowerCase()}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${CATALOG_TYPE_LABELS[itemType].toLowerCase()}`} className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-600" /></label>
      <button type="submit" disabled={isLoading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 text-[10px] font-black uppercase tracking-wider text-zinc-200 transition-colors hover:border-cyan-200/60 hover:text-white disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{isLoading && <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />}Buscar</button>
    </form>
    {notice && <p role="alert" className="mt-3 text-xs text-red-300">{notice}</p>}
    {results.length > 0 && <div className="mt-3 grid gap-2">{results.map((item) => <button key={item.id} type="button" disabled={selectedIds.has(item.id)} onClick={() => onAdd(item)} className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 text-left transition-colors hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><span className="min-w-0"><strong className="block truncate text-xs text-zinc-200">{catalogItemLabel(item)}</strong><span className="block truncate text-[10px] text-zinc-600">{item.category || item.type || item.slug}</span></span><Plus aria-hidden="true" size={14} className="shrink-0 text-cyan-200" /></button>)}</div>}
  </div>;
}

function TextInput({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-zinc-300">{label}{required && <span aria-hidden="true" className="ml-1 text-cyan-200">*</span>}</span><input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-sm text-white outline-none transition-colors focus:border-cyan-200/70 focus:ring-1 focus:ring-cyan-200/30" /></label>;
}

function TextArea({ label, value, onChange, required, className }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; className?: string }) {
  return <label className={`block ${className || ''}`}><span className="mb-2 block text-xs font-bold text-zinc-300">{label}{required && <span aria-hidden="true" className="ml-1 text-cyan-200">*</span>}</span><textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-zinc-800 bg-black px-3 py-2.5 text-sm leading-relaxed text-white outline-none transition-colors focus:border-cyan-200/70 focus:ring-1 focus:ring-cyan-200/30" /></label>;
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-zinc-300">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-sm text-white outline-none transition-colors focus:border-cyan-200/70 focus:ring-1 focus:ring-cyan-200/30">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function VisibilityToggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!value)} aria-pressed={value} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-[10px] font-black uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${value ? 'border-emerald-300/30 bg-emerald-950/40 text-emerald-200' : 'border-zinc-700 bg-black/30 text-cyan-100/60'}`}>{value ? <Eye aria-hidden="true" size={14} /> : <EyeOff aria-hidden="true" size={14} />}{value ? 'Publicado' : 'Oculto'}</button>;
}

function SaveButton({ isSaving, label, onClick, type = 'submit' }: { isSaving: boolean; label: string; onClick?: () => void; type?: 'submit' | 'button' }) {
  return <button type={type} onClick={onClick} disabled={isSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-cyan-100 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Save aria-hidden="true" size={15} />}{isSaving ? 'Guardando' : label}</button>;
}

function OrderButton({ direction, disabled, onClick }: { direction: 'up' | 'down'; disabled: boolean; onClick: () => void }) {
  const Icon = direction === 'up' ? ArrowUp : ArrowDown;
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-200" aria-label={direction === 'up' ? 'Mover arriba' : 'Mover abajo'}><Icon aria-hidden="true" size={12} /></button>;
}
