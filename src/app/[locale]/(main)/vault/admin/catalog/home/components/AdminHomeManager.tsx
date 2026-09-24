'use client';

import { Link } from '@/i18n/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpRight, Check, ChevronDown, Eye, EyeOff, FileWarning, LoaderCircle, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  catalogItemLabel,
  getItemContent,
  type HomeAdminData,
  type HomeCatalogItem,
  type HomeCatalogType,
  type HomeComparison,
  type HomeContentType,
  type HomeEditorialTranslation,
  type HomeEditorialTranslations,
  type HomeHeroTranslation,
  type HomeHeroTranslations,
  type HomeSection,
} from '@/lib/admin/home';

const SECTION_TYPE_LABELS: Record<HomeContentType, string> = {
  products: 'products',
  combos: 'combos',
  builds: 'builds',
  comparisons: 'comparisons',
};

const CATALOG_TYPE_LABELS: Record<HomeCatalogType, string> = {
  products: 'products',
  combos: 'combos',
  builds: 'builds',
};

interface Notice {
  type: 'error' | 'success';
  message: string;
}

async function requestJson(path: string, method: string, body?: unknown): Promise<{ id?: string }> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; error?: string };
  if (!response.ok) throw new Error(payload.error || 'REQUEST_FAILED');
  return payload;
}

function requestError(error: unknown, fallback: string) {
  return error instanceof Error && error.message !== 'REQUEST_FAILED' ? error.message : fallback;
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const nextItems = [...items];
  [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
  return nextItems;
}

function getEditorialTranslations(value: HomeEditorialTranslations | undefined, fallback: HomeEditorialTranslation): HomeEditorialTranslations {
  return { en: value?.en ?? fallback, es: value?.es ?? fallback };
}

function getHeroTranslations(value: HomeHeroTranslations | undefined, fallback: HomeHeroTranslation): HomeHeroTranslations {
  return { en: value?.en ?? fallback, es: value?.es ?? fallback };
}

type SectionReadiness = {
  ready: boolean;
  count: number;
  status: 'published' | 'draft' | 'incomplete';
};

function getSectionReadiness(section: HomeSection): SectionReadiness {
  const count = section.content_type === 'comparisons'
    ? section.home_comparisons.length
    : section.home_section_items.map(getItemContent).filter(Boolean).length;
  const ready = section.content_type === 'comparisons'
    ? section.home_comparisons.some((comparison) => comparison.is_active && comparison.home_comparison_items.length === 2)
    : count > 0;

  return {
    ready,
    count,
    status: !section.is_active ? 'draft' : ready ? 'published' : 'incomplete',
  };
}

export default function AdminHomeManager({ initialData }: { initialData: HomeAdminData }) {
  const router = useRouter();
  const t = useTranslations('admin.home');
  const [isCreating, setIsCreating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(initialData.sections.slice(0, 1).map((section) => section.id)));

  const publishedSections = initialData.sections.filter((section) => getSectionReadiness(section).status === 'published').length;
  const incompleteSections = initialData.sections.filter((section) => getSectionReadiness(section).status === 'incomplete').length;
  const draftSections = initialData.sections.filter((section) => getSectionReadiness(section).status === 'draft').length;

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
    } catch {
      setNotice({ type: 'error', message: t('errors.saveOrder') });
    }
  };

  return (
    <main id="main-content" className="vault-page min-h-screen bg-black px-3 py-6 font-technical sm:px-6 md:px-10 md:py-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/vault/admin/catalog" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
            <ArrowLeft aria-hidden="true" size={14} />
            {t('backToCatalog')}
          </Link>
          <Link href="/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 px-4 text-xs font-bold uppercase tracking-wider text-zinc-200 transition-colors hover:border-cyan-200/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
            {t('previewHome')}
            <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        </div>

        <header className="mt-8 max-w-4xl">
          <h1 className="font-display text-4xl font-black tracking-tight text-white md:text-6xl">{t('title')}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">{t('description')}</p>
        </header>

        <section className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800 sm:grid-cols-3" aria-label={t('overview.title')}>
          <OverviewStat value={publishedSections} label={t('overview.published')} tone="success" />
          <OverviewStat value={draftSections} label={t('overview.drafts')} tone="neutral" />
          <OverviewStat value={incompleteSections} label={t('overview.incomplete')} tone="warning" />
        </section>

        {incompleteSections > 0 && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200/25 bg-amber-200/[0.06] px-4 py-4 text-sm text-amber-100" role="status">
            <FileWarning aria-hidden="true" className="mt-0.5 shrink-0 text-amber-200" size={17} />
            <p>{t('overview.incompleteHint', { count: incompleteSections })}</p>
          </div>
        )}

        <HeroEditor hero={initialData.hero} onSaved={refresh} />

        <section className="mt-12" aria-labelledby="home-sections-heading">
          <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="home-sections-heading" className="font-display text-2xl font-black text-white">{t('sectionsTitle')}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{t('sectionsDescription')}</p>
            </div>
            <button type="button" onClick={() => setIsCreating((current) => !current)} aria-expanded={isCreating} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              <Plus aria-hidden="true" size={16} />
              {t('newSection')}
            </button>
          </div>

          {isCreating && <NewSectionForm onSaved={() => { setIsCreating(false); refresh(); }} />}

          <div className="mt-6 space-y-5">
            {initialData.sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                isOpen={openSections.has(section.id)}
                onToggle={() => setOpenSections((current) => {
                  const next = new Set(current);
                  if (next.has(section.id)) next.delete(section.id); else next.add(section.id);
                  return next;
                })}
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
            {initialData.sections.length === 0 && !isCreating && <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-16 text-center text-sm text-zinc-500">{t('noSections')}</div>}
          </div>
        </section>

        {notice && <p role={notice.type === 'error' ? 'alert' : 'status'} className={`mt-6 rounded-xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-red-900/60 bg-red-950/20 text-red-200' : 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200'}`}>{notice.message}</p>}
      </div>
    </main>
  );
}

function OverviewStat({ value, label, tone }: { value: number; label: string; tone: 'success' | 'neutral' | 'warning' }) {
  const toneClass = tone === 'success' ? 'text-emerald-200' : tone === 'warning' ? 'text-amber-200' : 'text-zinc-200';
  return (
    <div className="bg-zinc-950 px-5 py-4">
      <p className={`font-display text-3xl font-black ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
    </div>
  );
}

function HeroEditor({ hero, onSaved }: { hero: HomeAdminData['hero']; onSaved: () => void }) {
  const t = useTranslations('admin.home');
  const tc = useTranslations('admin.catalog');
  const [form, setForm] = useState(hero);
  const [translations, setTranslations] = useState<HomeHeroTranslations>(() => getHeroTranslations(hero.translations, hero));
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const updateTranslation = (locale: 'en' | 'es', field: keyof HomeHeroTranslation, value: string) => setTranslations((current) => ({
    ...current,
    [locale]: { ...current[locale], [field]: value },
  }));
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);
    try {
      await requestJson('/api/vault/admin/home', 'PATCH', { ...form, translations });
       setNotice({ type: 'success', message: t('hero.saved') });
      onSaved();
    } catch (error) {
       setNotice({ type: 'error', message: requestError(error, t('errors.saveSection')) });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-10 rounded-3xl border border-cyan-200/20 bg-zinc-950/80 p-5 sm:p-7">
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-black text-white">{t('hero.title')}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">{t('hero.description')}</p>
        </div>
        <VisibilityToggle value={form.is_active} onChange={(value) => update('is_active', value)} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <HeroTranslationFields locale="en" title={tc('editor.languageEnglish')} values={translations.en} onChange={updateTranslation} />
        <HeroTranslationFields locale="es" title={tc('editor.languageSpanish')} values={translations.es} onChange={updateTranslation} />
      </div>
      <div className="mt-5 grid gap-4 border-t border-zinc-800 pt-5 md:grid-cols-2">
        <TextInput label={t('hero.primaryHref')} value={form.primary_href} onChange={(value) => update('primary_href', value)} required hint={t('hero.pathHint')} />
        <TextInput label={t('hero.secondaryHref')} value={form.secondary_href} onChange={(value) => update('secondary_href', value)} required hint={t('hero.pathHint')} />
      </div>
      <div className="mt-5 flex items-center gap-4">
         <SaveButton isSaving={isSaving} label={t('hero.save')} />
        {notice && <span role={notice.type === 'error' ? 'alert' : 'status'} className={notice.type === 'error' ? 'text-xs text-red-300' : 'text-xs text-emerald-300'}>{notice.message}</span>}
      </div>
    </form>
  );
}

function NewSectionForm({ onSaved }: { onSaved: () => void }) {
  const t = useTranslations('admin.home');
  const tc = useTranslations('admin.catalog');
  const [form, setForm] = useState({ content_type: 'products' as HomeContentType });
  const [translations, setTranslations] = useState<HomeEditorialTranslations>({
    en: { eyebrow: '', title: '', description: '' },
    es: { eyebrow: '', title: '', description: '' },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);
    try {
      await requestJson('/api/vault/admin/home/sections', 'POST', { ...form, translations });
      onSaved();
    } catch (error) {
       setNotice(requestError(error, t('errors.createSection')));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-5 rounded-2xl border border-cyan-200/25 bg-cyan-200/[0.04] p-5">
      <h3 className="font-display text-xl font-black text-white">{t('section.newTitle')}</h3>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">{t('section.newDescription')}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SelectInput label={t('section.content')} value={form.content_type} onChange={(value) => setForm((current) => ({ ...current, content_type: value as HomeContentType }))} options={Object.entries(SECTION_TYPE_LABELS).map(([value, label]) => ({ value, label: t(`types.${label}`) }))} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <EditorialTranslationFields locale="en" title={tc('editor.languageEnglish')} values={translations.en} onChange={(locale, field, value) => setTranslations((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))} />
        <EditorialTranslationFields locale="es" title={tc('editor.languageSpanish')} values={translations.es} onChange={(locale, field, value) => setTranslations((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4"><SaveButton isSaving={isSaving} label={t('section.create')} />{notice && <span role="alert" className="text-xs text-red-300">{notice}</span>}</div>
    </form>
  );
}

function SectionEditor({
  section,
  isOpen,
  onToggle,
  canMoveUp,
  canMoveDown,
  onMove,
  onSaved,
  onNotice,
  onReorderComparisons,
}: {
  section: HomeSection;
  isOpen: boolean;
  onToggle: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
  onSaved: () => void;
  onNotice: (notice: Notice) => void;
  onReorderComparisons: (ids: string[]) => void;
}) {
  const t = useTranslations('admin.home');
  const tc = useTranslations('admin.catalog');
  const [form, setForm] = useState({
    is_active: section.is_active,
    visual_variant: section.visual_variant,
  });
  const [translations, setTranslations] = useState<HomeEditorialTranslations>(() => getEditorialTranslations(section.translations, section));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const readiness = getSectionReadiness(section);

  const update = (field: keyof typeof form, value: boolean) => setForm((current) => ({ ...current, [field]: value }));
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.is_active && !readiness.ready) {
      onNotice({ type: 'error', message: section.content_type === 'comparisons' ? t('section.comparisonIncomplete') : t('section.listIncomplete') });
      return;
    }
    setIsSaving(true);
    try {
      await requestJson(`/api/vault/admin/home/sections/${section.id}`, 'PATCH', { ...form, translations });
      onNotice({ type: 'success', message: t('section.saved', { title: translations.en.title }) });
      onSaved();
    } catch (error) {
       onNotice({ type: 'error', message: requestError(error, t('errors.saveSection')) });
    } finally {
      setIsSaving(false);
    }
  };
  const remove = async () => {
    if (!window.confirm(t('section.deleteConfirm', { title: section.title }))) return;
    setIsDeleting(true);
    try {
      await requestJson(`/api/vault/admin/home/sections/${section.id}`, 'DELETE');
      onSaved();
    } catch (error) {
       onNotice({ type: 'error', message: requestError(error, t('errors.deleteSection')) });
      setIsDeleting(false);
    }
  };

  return (
    <section className={`rounded-3xl border bg-zinc-950/60 p-5 transition-colors sm:p-7 ${readiness.status === 'incomplete' ? 'border-amber-200/25' : 'border-zinc-800'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 flex-col rounded-lg border border-zinc-800 bg-black p-1">
            <OrderButton direction="up" disabled={!canMoveUp} onClick={() => onMove(-1)} />
            <OrderButton direction="down" disabled={!canMoveDown} onClick={() => onMove(1)} />
          </div>
          <button type="button" onClick={onToggle} aria-expanded={isOpen} aria-controls={`section-content-${section.id}`} className="min-w-0 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/75">{t(`types.${SECTION_TYPE_LABELS[section.content_type]}`)}</span>
            <span className="mt-1 block truncate font-display text-xl font-black text-white">{section.title}</span>
            <span className="mt-1 block text-xs text-zinc-500">{t('section.itemCount', { count: readiness.count })}</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={!form.is_active ? 'draft' : readiness.ready ? 'published' : 'incomplete'} />
          <VisibilityToggle value={form.is_active} onChange={(value) => update('is_active', value)} />
          <button type="button" onClick={onToggle} aria-expanded={isOpen} aria-controls={`section-content-${section.id}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200" aria-label={isOpen ? t('actions.collapse') : t('actions.expand')}>
            <ChevronDown aria-hidden="true" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} size={17} />
          </button>
          <button type="button" onClick={remove} disabled={isDeleting || isSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-900/60 px-3 text-xs font-black uppercase tracking-wider text-red-300 transition-colors hover:bg-red-950/40 disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
            {isDeleting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <Trash2 aria-hidden="true" size={14} />}
            {t('section.delete')}
          </button>
        </div>
      </div>

      {isOpen && <div id={`section-content-${section.id}`} className="mt-5 border-t border-zinc-800 pt-5">
        {!readiness.ready && form.is_active && <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200/25 bg-amber-200/[0.05] px-4 py-3 text-sm text-amber-100" role="status"><FileWarning aria-hidden="true" className="mt-0.5 shrink-0 text-amber-200" size={16} /><p>{section.content_type === 'comparisons' ? t('section.comparisonIncomplete') : t('section.listIncomplete')}</p></div>}
        <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
          <EditorialTranslationFields locale="en" title={tc('editor.languageEnglish')} values={translations.en} onChange={(locale, field, value) => setTranslations((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))} />
          <EditorialTranslationFields locale="es" title={tc('editor.languageSpanish')} values={translations.es} onChange={(locale, field, value) => setTranslations((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))} />
          <div className="md:col-span-2"><SaveButton isSaving={isSaving} label={t('section.save')} /></div>
        </form>

        {section.content_type === 'comparisons' ? (
          <ComparisonList section={section} onSaved={onSaved} onNotice={onNotice} onReorder={onReorderComparisons} />
        ) : (
          <ItemListEditor
            title={t('section.itemsTitle', { title: section.title })}
            itemType={section.content_type}
            initialItems={section.home_section_items.map(getItemContent).filter((item): item is HomeCatalogItem => Boolean(item))}
            savePath={`/api/vault/admin/home/sections/${section.id}/items`}
            onSaved={onSaved}
            emptyMessage={t('section.itemsHint', { type: t(`types.${CATALOG_TYPE_LABELS[section.content_type]}`) })}
          />
        )}
      </div>}
    </section>
  );
}

function ComparisonList({ section, onSaved, onNotice, onReorder }: { section: HomeSection; onSaved: () => void; onNotice: (notice: Notice) => void; onReorder: (ids: string[]) => void }) {
  const t = useTranslations('admin.home');
  const [isCreating, setIsCreating] = useState(false);
  return (
    <div className="mt-8 border-t border-zinc-800 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
           <h4 className="font-display text-lg font-black text-white">{t('section.comparisonsTitle')}</h4>
           <p className="mt-1 text-xs text-zinc-500">{t('section.comparisonsDescription')}</p>
        </div>
         <button type="button" onClick={() => setIsCreating((current) => !current)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 text-[10px] font-black uppercase tracking-wider text-zinc-200 transition-colors hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><Plus aria-hidden="true" size={14} />{t('section.newComparison')}</button>
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
         {section.home_comparisons.length === 0 && !isCreating && <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-xs text-zinc-600">{t('section.noComparisons')}</p>}
      </div>
    </div>
  );
}

function NewComparisonForm({ sectionId, onSaved, onNotice }: { sectionId: string; onSaved: () => void; onNotice: (notice: Notice) => void }) {
  const t = useTranslations('admin.home');
  const tc = useTranslations('admin.catalog');
  const [form, setForm] = useState({ item_type: 'products' as HomeCatalogType });
  const [translations, setTranslations] = useState<HomeEditorialTranslations>({
    en: { eyebrow: '', title: '', description: '' },
    es: { eyebrow: '', title: '', description: '' },
  });
  const [isSaving, setIsSaving] = useState(false);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await requestJson(`/api/vault/admin/home/sections/${sectionId}/comparisons`, 'POST', { ...form, translations });
      onSaved();
    } catch (error) {
       onNotice({ type: 'error', message: requestError(error, t('errors.createComparison')) });
    } finally {
      setIsSaving(false);
    }
  };
  return <form onSubmit={save} className="mt-5 grid gap-4 rounded-2xl border border-violet-200/20 bg-violet-200/[0.04] p-5 md:grid-cols-2">
    <div className="md:col-span-2"><p className="text-sm leading-relaxed text-zinc-400">{t('section.newComparisonDescription')}</p></div>
    <SelectInput label={t('section.comparisonType')} value={form.item_type} onChange={(value) => setForm((current) => ({ ...current, item_type: value as HomeCatalogType }))} options={Object.entries(CATALOG_TYPE_LABELS).map(([value, label]) => ({ value, label: t(`types.${label}`) }))} />
    <div className="md:col-span-2 grid gap-4 lg:grid-cols-2">
      <EditorialTranslationFields locale="en" title={tc('editor.languageEnglish')} values={translations.en} onChange={(locale, field, value) => setTranslations((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))} />
      <EditorialTranslationFields locale="es" title={tc('editor.languageSpanish')} values={translations.es} onChange={(locale, field, value) => setTranslations((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))} />
    </div>
    <div className="md:col-span-2"><SaveButton isSaving={isSaving} label={t('section.createComparison')} /></div>
  </form>;
}

function ComparisonEditor({ comparison, canMoveUp, canMoveDown, onMove, onSaved, onNotice }: { comparison: HomeComparison; canMoveUp: boolean; canMoveDown: boolean; onMove: (direction: -1 | 1) => void; onSaved: () => void; onNotice: (notice: Notice) => void }) {
  const t = useTranslations('admin.home');
  const tc = useTranslations('admin.catalog');
  const [form, setForm] = useState({ is_active: comparison.is_active });
  const [translations, setTranslations] = useState<HomeEditorialTranslations>(() => getEditorialTranslations(comparison.translations, comparison));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isReady = comparison.home_comparison_items.length === 2;
  const update = (field: keyof typeof form, value: boolean) => setForm((current) => ({ ...current, [field]: value }));
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.is_active && !isReady) {
      onNotice({ type: 'error', message: t('section.comparisonIncomplete') });
      return;
    }
    setIsSaving(true);
    try {
      await requestJson(`/api/vault/admin/home/comparisons/${comparison.id}`, 'PATCH', { ...form, translations });
      onSaved();
    } catch (error) {
       onNotice({ type: 'error', message: requestError(error, t('errors.saveComparison')) });
    } finally {
      setIsSaving(false);
    }
  };
  const remove = async () => {
    if (!window.confirm(t('section.deleteComparisonConfirm', { title: comparison.title }))) return;
    setIsDeleting(true);
    try {
      await requestJson(`/api/vault/admin/home/comparisons/${comparison.id}`, 'DELETE');
      onSaved();
    } catch (error) {
       onNotice({ type: 'error', message: requestError(error, t('errors.deleteComparison')) });
      setIsDeleting(false);
    }
  };
  return <article className={`rounded-2xl border bg-black/35 p-4 sm:p-5 ${form.is_active && !isReady ? 'border-amber-200/25' : 'border-zinc-800'}`}>
    <div className="flex flex-col gap-4 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950 p-1"><OrderButton direction="up" disabled={!canMoveUp} onClick={() => onMove(-1)} /><OrderButton direction="down" disabled={!canMoveDown} onClick={() => onMove(1)} /></div>
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-200/75">{t(`types.${CATALOG_TYPE_LABELS[comparison.item_type]}`)}</p><h5 className="font-display text-lg font-black text-white">{comparison.title}</h5><p className="mt-1 text-xs text-zinc-500">{t('section.comparisonProgress', { count: comparison.home_comparison_items.length })}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-3"><StatusBadge status={!form.is_active ? 'draft' : isReady ? 'published' : 'incomplete'} /><VisibilityToggle value={form.is_active} onChange={(value) => update('is_active', value)} /><button type="button" onClick={remove} disabled={isDeleting || isSaving} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-red-900/60 px-3 text-red-300 transition-colors hover:bg-red-950/40 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300" aria-label={t('section.deleteComparison')}>{isDeleting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <Trash2 aria-hidden="true" size={14} />}</button></div>
    </div>
    {form.is_active && !isReady && <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200/25 bg-amber-200/[0.05] px-4 py-3 text-sm text-amber-100" role="status"><FileWarning aria-hidden="true" className="mt-0.5 shrink-0 text-amber-200" size={16} /><p>{t('section.comparisonIncomplete')}</p></div>}
    <form onSubmit={save} className="mt-4 grid gap-4 lg:grid-cols-2">
      <EditorialTranslationFields locale="en" title={tc('editor.languageEnglish')} values={translations.en} onChange={(locale, field, value) => setTranslations((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))} />
      <EditorialTranslationFields locale="es" title={tc('editor.languageSpanish')} values={translations.es} onChange={(locale, field, value) => setTranslations((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))} />
       <div><SaveButton isSaving={isSaving} label={t('section.saveComparison')} /></div>
    </form>
    <ItemListEditor
       title={t('section.comparedItems')}
      itemType={comparison.item_type}
      initialItems={comparison.home_comparison_items.map(getItemContent).filter((item): item is HomeCatalogItem => Boolean(item))}
      savePath={`/api/vault/admin/home/comparisons/${comparison.id}/items`}
      onSaved={onSaved}
      maxItems={2}
      minItems={2}
       emptyMessage={t('section.twoItems')}
    />
  </article>;
}

function ItemListEditor({ title, itemType, initialItems, savePath, onSaved, emptyMessage, maxItems, minItems = 0 }: { title: string; itemType: HomeCatalogType; initialItems: HomeCatalogItem[]; savePath: string; onSaved: () => void; emptyMessage: string; maxItems?: number; minItems?: number }) {
  const t = useTranslations('admin.home');
  const tc = useTranslations('admin.common');
  const [items, setItems] = useState(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const save = async () => {
    if (items.length < minItems) {
      setNotice({ type: 'error', message: t('section.clearMinimum', { count: minItems }) });
      return;
    }
    setIsSaving(true);
    setNotice(null);
    try {
      await requestJson(savePath, 'PUT', { item_type: itemType, ids: items.map((item) => item.id) });
       setNotice({ type: 'success', message: t('section.listSaved') });
      onSaved();
    } catch (error) {
       setNotice({ type: 'error', message: requestError(error, t('errors.saveList')) });
    } finally {
      setIsSaving(false);
    }
  };
  const canAddItems = maxItems === undefined || items.length < maxItems;
  return <div className="mt-6 border-t border-zinc-800 pt-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h4 className="font-display text-lg font-black text-white">{title}</h4>
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{t('section.selectedCount', { count: items.length })}</span>
    </div>
    <p className="mt-1 text-sm leading-relaxed text-zinc-500">{emptyMessage}</p>
    <div className="mt-4 grid gap-3">
      {items.map((item, index) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-black/45 p-3">
        <div className="flex flex-col rounded-md border border-zinc-800 bg-zinc-950 p-0.5"><OrderButton direction="up" disabled={index === 0} onClick={() => setItems((current) => moveItem(current, index, -1))} /><OrderButton direction="down" disabled={index === items.length - 1} onClick={() => setItems((current) => moveItem(current, index, 1))} /></div>
         <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-zinc-200">{catalogItemLabel(item, tc('unknownItem'))}</p><p className="truncate text-[11px] text-zinc-600">{item.slug}</p></div>
          <button type="button" onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 transition-colors hover:border-red-900/60 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300" aria-label={t('section.removeItem', { item: catalogItemLabel(item, tc('unknownItem')) })}><Trash2 aria-hidden="true" size={14} /></button>
      </div>)}
      {items.length === 0 && <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-xs text-zinc-600">{emptyMessage}</p>}
    </div>
    {canAddItems && <CatalogPicker itemType={itemType} selectedIds={new Set(items.map((item) => item.id))} onAdd={(item) => setItems((current) => [...current, item])} />}
     {!canAddItems && <p className="mt-4 text-xs text-amber-200/75">{t('section.comparisonComplete')}</p>}
     <div className="mt-4 flex items-center gap-4"><SaveButton isSaving={isSaving} label={t('section.saveList')} onClick={save} type="button" />{notice && <span role={notice.type === 'error' ? 'alert' : 'status'} className={notice.type === 'error' ? 'text-xs text-red-300' : 'text-xs text-emerald-300'}>{notice.message}</span>}</div>
  </div>;
}

function CatalogPicker({ itemType, selectedIds, onAdd }: { itemType: HomeCatalogType; selectedIds: Set<string>; onAdd: (item: HomeCatalogItem) => void }) {
  const t = useTranslations('admin.home');
  const tc = useTranslations('admin.common');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HomeCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const search = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setNotice(t('picker.minCharacters'));
      setResults([]);
      setHasSearched(false);
      return;
    }
    setIsLoading(true);
    setNotice(null);
    setHasSearched(true);
    try {
      const response = await fetch(`/api/vault/admin/home/catalog-items?type=${itemType}&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
       if (!response.ok) throw new Error('REQUEST_FAILED');
       const payload = await response.json() as { items?: HomeCatalogItem[] };
      setResults(payload.items || []);
    } catch (error) {
       setNotice(requestError(error, t('picker.searchError')));
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="mt-4 rounded-xl border border-dashed border-zinc-700 bg-black/25 p-4">
    <p className="mb-3 text-sm font-bold text-zinc-200">{t('picker.title', { type: t(`types.${CATALOG_TYPE_LABELS[itemType]}`) })}</p>
     <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
       <label className="flex min-h-10 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 text-zinc-500 focus-within:border-cyan-200/60"><Search aria-hidden="true" size={14} /><span className="sr-only">{t('picker.searchLabel', { type: t(`types.${CATALOG_TYPE_LABELS[itemType]}`) })}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('picker.searchLabel', { type: t(`types.${CATALOG_TYPE_LABELS[itemType]}`) })} className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-600" /></label>
       <button type="submit" disabled={isLoading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 text-[10px] font-black uppercase tracking-wider text-zinc-200 transition-colors hover:border-cyan-200/60 hover:text-white disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{isLoading && <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />}{t('picker.search')}</button>
    </form>
    {notice && <p role="alert" className="mt-3 text-xs text-red-300">{notice}</p>}
      {results.length > 0 && <div className="mt-3 grid gap-2">{results.map((item) => <button key={item.id} type="button" disabled={selectedIds.has(item.id)} onClick={() => onAdd(item)} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 text-left transition-colors hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"><span className="min-w-0"><strong className="block truncate text-sm text-zinc-200">{catalogItemLabel(item, tc('unknownItem'))}</strong><span className="block truncate text-xs text-zinc-600">{item.category || item.type || item.slug}</span></span><Plus aria-hidden="true" size={14} className="shrink-0 text-cyan-200" /></button>)}</div>}
      {hasSearched && results.length === 0 && !notice && <p className="mt-3 text-sm text-zinc-500">{t('picker.noResults')}</p>}
  </div>;
}

function EditorialTranslationFields({ locale, title, values, onChange }: { locale: 'en' | 'es'; title: string; values: HomeEditorialTranslation; onChange: (locale: 'en' | 'es', field: keyof HomeEditorialTranslation, value: string) => void }) {
  const t = useTranslations('admin.home');
  return (
    <fieldset className="rounded-xl border border-zinc-800 bg-black/35 p-4">
      <legend className="px-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-200/80">{title}</legend>
      <div className="mt-2 grid gap-4">
        <TextInput label={t('section.title')} value={values.title} onChange={(value) => onChange(locale, 'title', value)} required />
        <TextArea label={t('section.description')} value={values.description} onChange={(value) => onChange(locale, 'description', value)} hint={t('section.descriptionHint')} />
      </div>
    </fieldset>
  );
}

function HeroTranslationFields({ locale, title, values, onChange }: { locale: 'en' | 'es'; title: string; values: HomeHeroTranslation; onChange: (locale: 'en' | 'es', field: keyof HomeHeroTranslation, value: string) => void }) {
  const t = useTranslations('admin.home');
  return (
    <fieldset className="rounded-xl border border-zinc-800 bg-black/35 p-4">
      <legend className="px-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-200/80">{title}</legend>
      <div className="mt-2 grid gap-4">
        <TextInput label={t('hero.headline')} value={values.title} onChange={(value) => onChange(locale, 'title', value)} required />
        <TextArea label={t('hero.descriptionField')} value={values.description} onChange={(value) => onChange(locale, 'description', value)} required />
        <TextInput label={t('hero.primaryLabel')} value={values.primary_label} onChange={(value) => onChange(locale, 'primary_label', value)} required />
        <TextInput label={t('hero.secondaryLabel')} value={values.secondary_label} onChange={(value) => onChange(locale, 'secondary_label', value)} required />
      </div>
    </fieldset>
  );
}

function TextInput({ label, value, onChange, required, hint }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; hint?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-zinc-300">{label}{required && <span aria-hidden="true" className="ml-1 text-cyan-200">*</span>}</span><input required={required} aria-required={required || undefined} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-sm text-white outline-none transition-colors focus:border-cyan-200/70 focus:ring-1 focus:ring-cyan-200/30" />{hint && <span className="mt-1.5 block text-xs leading-relaxed text-zinc-500">{hint}</span>}</label>;
}

function TextArea({ label, value, onChange, required, className, hint }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; className?: string; hint?: string }) {
  return <label className={`block ${className || ''}`}><span className="mb-2 block text-sm font-bold text-zinc-300">{label}{required && <span aria-hidden="true" className="ml-1 text-cyan-200">*</span>}</span><textarea required={required} aria-required={required || undefined} value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-zinc-800 bg-black px-3 py-2.5 text-sm leading-relaxed text-white outline-none transition-colors focus:border-cyan-200/70 focus:ring-1 focus:ring-cyan-200/30" />{hint && <span className="mt-1.5 block text-xs leading-relaxed text-zinc-500">{hint}</span>}</label>;
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-zinc-300">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-sm text-white outline-none transition-colors focus:border-cyan-200/70 focus:ring-1 focus:ring-cyan-200/30">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function VisibilityToggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  const t = useTranslations('admin.home');
  return <button type="button" onClick={() => onChange(!value)} aria-pressed={value} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-[10px] font-black uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${value ? 'border-emerald-300/30 bg-emerald-950/40 text-emerald-200' : 'border-zinc-700 bg-black/30 text-cyan-100/60'}`}>{value ? <Eye aria-hidden="true" size={14} /> : <EyeOff aria-hidden="true" size={14} />}{value ? t('actions.published') : t('actions.hidden')}</button>;
}

function StatusBadge({ status }: { status: SectionReadiness['status'] }) {
  const t = useTranslations('admin.home');
  const styles = {
    published: 'border-emerald-300/30 bg-emerald-950/40 text-emerald-200',
    draft: 'border-zinc-700 bg-zinc-900 text-zinc-300',
    incomplete: 'border-amber-200/30 bg-amber-950/30 text-amber-200',
  }[status];
  return <span className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold uppercase tracking-wider ${styles}`}>{status === 'published' ? <Check aria-hidden="true" size={13} /> : status === 'incomplete' ? <FileWarning aria-hidden="true" size={13} /> : <EyeOff aria-hidden="true" size={13} />}{t(`status.${status}`)}</span>;
}

function SaveButton({ isSaving, label, onClick, type = 'submit' }: { isSaving: boolean; label: string; onClick?: () => void; type?: 'submit' | 'button' }) {
  const t = useTranslations('admin.home');
  return <button type={type} onClick={onClick} disabled={isSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-cyan-100 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Save aria-hidden="true" size={15} />}{isSaving ? t('actions.saving') : label}</button>;
}

function OrderButton({ direction, disabled, onClick }: { direction: 'up' | 'down'; disabled: boolean; onClick: () => void }) {
  const t = useTranslations('admin.home');
  const Icon = direction === 'up' ? ArrowUp : ArrowDown;
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-11 w-11 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-200" aria-label={direction === 'up' ? t('actions.moveUp') : t('actions.moveDown')}><Icon aria-hidden="true" size={14} /></button>;
}
