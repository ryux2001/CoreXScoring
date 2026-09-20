'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, CircleHelp, Search, Settings2, X } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabaseClient';
import { convertPrice } from '@/lib/currency';
import { resolveProductPrice } from '@/lib/catalog/product-price';
import { formatPrice } from '@/lib/formatPrice';
import { useAiVisiblePriceStore } from '@/store/useAiVisiblePriceStore';
import BuildEvaluationSection from '@/app/[locale]/(main)/builds/[slug]/components/BuildEvaluationSection';
import FpsCard from '@/app/[locale]/(main)/combos/[slug]/components/FpsCard';
import Metrics from '@/app/[locale]/(main)/combos/[slug]/components/Metrics';
import type { Build } from '@/lib/scoringBuilds';
import { useLocale, useTranslations } from 'next-intl';

type SlotKey = 'cpu' | 'gpu' | 'ram' | 'motherboard' | 'storage' | 'psu';
type PriceMode = 'msrp' | 'custom';

interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  type: string;
  price_base_usd?: number;
  price_base_eur?: number;
  price_usd?: number;
  price_eur?: number;
  specs?: unknown;
  compatibility?: unknown;
  [key: string]: any;
}

interface DraftState {
  id?: string;
  slug?: string;
  title: string;
  cpu: Product | null;
  gpu: Product | null;
  ram: Product | null;
  motherboard: Product | null;
  storage: Product | null;
  psu: Product | null;
  customPrices: Record<SlotKey, string>;
  priceModes: Record<SlotKey, PriceMode>;
}

interface CreatedBuildWorkspaceProps {
  initialBuild?: any | null;
  games: any[];
  currency: string;
}

const slots: SlotKey[] = ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'];
function parseJson(value: unknown): Record<string, any> {
  if (typeof value !== 'string') return (value as Record<string, any>) || {};
  try {
    return JSON.parse(value) as Record<string, any>;
  } catch {
    return {};
  }
}

function normalize(value: unknown) {
  return String(value || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
}

function getSocket(product: Product | null) {
  const compatibility = parseJson(product?.compatibility);
  return normalize(compatibility.socket || product?.['socket']);
}

function getRamType(product: Product | null) {
  const specs = parseJson(product?.specs);
  const compatibility = parseJson(product?.compatibility);
  return normalize(specs.type || specs.technology || specs.memory_type || compatibility.ram_type);
}

function getRamCapacity(product: Product | null) {
  const specs = parseJson(product?.specs);
  return Number(specs.capacity_gb || specs.capacity || 0);
}

function getInitialPrice(build: any, slot: SlotKey, currency: string) {
  const suffix = currency === 'EUR' ? 'eur' : 'usd';
  const value = build?.[`custom_price_${slot}_${suffix}`];
  if (value !== null && value !== undefined && value !== '') return String(value);

  const otherSuffix = suffix === 'eur' ? 'usd' : 'eur';
  const otherValue = build?.[`custom_price_${slot}_${otherSuffix}`];
  if (otherValue !== null && otherValue !== undefined && otherValue !== '') {
    const otherCurrency = suffix === 'eur' ? 'USD' : 'EUR';
    return String(convertPrice(Number(otherValue), otherCurrency, currency));
  }

  return '';
}

function createInitialDraft(build: any, currency: string): DraftState {
  const customPrices = slots.reduce<Record<SlotKey, string>>((prices, slot) => {
    prices[slot] = getInitialPrice(build, slot, currency);
    return prices;
  }, { cpu: '', gpu: '', ram: '', motherboard: '', storage: '', psu: '' });
  const priceModes = slots.reduce<Record<SlotKey, PriceMode>>((modes, slot) => {
    modes[slot] = customPrices[slot] ? 'custom' : 'msrp';
    return modes;
  }, { cpu: 'msrp', gpu: 'msrp', ram: 'msrp', motherboard: 'msrp', storage: 'msrp', psu: 'msrp' });

  return {
    id: build?.id,
    slug: build?.slug,
    title: build?.title || '',
    cpu: build?.cpu || null,
    gpu: build?.gpu || null,
    ram: build?.ram || null,
    motherboard: build?.motherboard || null,
    storage: build?.storage || null,
    psu: build?.psu || null,
    customPrices,
    priceModes,
  };
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'build';
}

function getProductPrice(product: Product | null, slot: SlotKey, draft: DraftState, currency: string) {
  if (!product) return 0;
  if (draft.priceModes[slot] === 'custom' && draft.customPrices[slot]) {
    return Number(draft.customPrices[slot]) || 0;
  }
  return resolveProductPrice(product, currency).value;
}

function getAiPriceContext(draft: DraftState, currency: string) {
  return {
    scope: 'draft_build' as const,
    currency: currency === 'EUR' ? 'EUR' as const : 'USD' as const,
    items: slots.flatMap((slot) => {
      const product = draft[slot];
      if (!product) return [];
      const isCustom = draft.priceModes[slot] === 'custom';
      return [{ productId: product.id, price: getProductPrice(product, slot, draft, currency), isCustom, slot }];
    }),
  };
}

function validateCompatibility(nextSlot: SlotKey, nextProduct: Product, draft: DraftState, t: ReturnType<typeof useTranslations>) {
  const build = { ...draft, [nextSlot]: nextProduct };
  const cpu = build.cpu;
  const ram = build.ram;
  const motherboard = build.motherboard;

  if (cpu && motherboard) {
    const cpuSocket = getSocket(cpu);
    const motherboardSocket = getSocket(motherboard);
    if (cpuSocket && motherboardSocket && cpuSocket !== motherboardSocket) {
      return t('workspace.compatibility.socket', { cpu: cpu.name, motherboard: motherboard.name });
    }

    const cpuCompatibility = parseJson(cpu.compatibility);
    const chipsets = String(cpuCompatibility.chipsets || '').toLowerCase();
    const motherboardSpecs = parseJson(motherboard.specs);
    const motherboardCompatibility = parseJson(motherboard.compatibility);
    const chipset = String(motherboardCompatibility.chipset || motherboardSpecs.chipset || '').toLowerCase();
    if (chipsets && chipset && !chipsets.includes(chipset)) {
      return t('workspace.compatibility.chipset', { cpu: cpu.name, motherboard: motherboard.name });
    }
  }

  if (cpu && ram) {
    const cpuCompatibility = parseJson(cpu.compatibility);
    const expectedRamType = normalize(cpuCompatibility.ram_type);
    const actualRamType = getRamType(ram);
    if (expectedRamType && actualRamType && !actualRamType.includes(expectedRamType) && !expectedRamType.includes(actualRamType)) {
      return t('workspace.compatibility.ramType', { cpu: cpu.name, type: cpuCompatibility.ram_type });
    }
    const maxRam = Number(cpuCompatibility.ram_max_support || 0);
    if (maxRam > 0 && getRamCapacity(ram) > maxRam) {
      return t('workspace.compatibility.ramCapacity', { cpu: cpu.name, max: maxRam });
    }
  }

  if (motherboard && ram) {
    const compatibility = parseJson(motherboard.compatibility);
    const supportedType = normalize(compatibility.ram_type);
    const ramType = getRamType(ram);
    if (supportedType && ramType && !supportedType.includes(ramType) && !ramType.includes(supportedType)) {
      return t('workspace.compatibility.motherboardRamType', { motherboard: motherboard.name, type: ramType.toUpperCase() });
    }
    const maxCapacity = Number(compatibility.ram_max_capacity || 0);
    if (maxCapacity > 0 && getRamCapacity(ram) > maxCapacity) {
      return t('workspace.compatibility.motherboardRamCapacity', { motherboard: motherboard.name, max: maxCapacity });
    }
  }

  return null;
}

export default function CreatedBuildWorkspace({
  initialBuild = null,
  games,
  currency,
}: CreatedBuildWorkspaceProps) {
  const t = useTranslations('vault');
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>(() => createInitialDraft(initialBuild, currency));
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [modalPriceMode, setModalPriceMode] = useState<PriceMode>('msrp');
  const [modalPrice, setModalPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const isComplete = slots.every((slot) => Boolean(draft[slot]));
  const totalPrice = useMemo(
    () => slots.reduce((total, slot) => total + getProductPrice(draft[slot], slot, draft, currency), 0),
    [draft, currency],
  );

  useEffect(() => {
    useAiVisiblePriceStore.getState().setContext(getAiPriceContext(draft, currency));
    return () => useAiVisiblePriceStore.getState().clear();
  }, [draft, currency]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    if (!isModalOpen || !activeSlot) return;
    const timer = setTimeout(async () => {
      if (searchTerm.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      const { data, error } = await supabase
        .from('products_with_priority')
        .select('*')
        .eq('type', activeSlot)
        .ilike('name', `%${searchTerm.trim()}%`)
        .limit(12);
      if (error) {
        setSuggestions([]);
        setNotification({ type: 'error', message: t('workspace.searchError') });
      } else {
        setSuggestions((data || []) as Product[]);
      }
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [activeSlot, isModalOpen, searchTerm, t]);

  const openSlotModal = (slot: SlotKey) => {
    setActiveSlot(slot);
    setSearchTerm('');
    setSuggestions([]);
    setModalPriceMode(draft.priceModes[slot]);
    setModalPrice(draft.customPrices[slot]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveSlot(null);
    setSearchTerm('');
    setSuggestions([]);
  };

  const selectProduct = (product: Product) => {
    if (!activeSlot) return;
    const compatibilityError = validateCompatibility(activeSlot, product, draft, t);
    if (compatibilityError) {
      setNotification({ type: 'error', message: compatibilityError });
      return;
    }
    setDraft((current) => ({
      ...current,
      [activeSlot]: product,
      customPrices: { ...current.customPrices, [activeSlot]: '' },
      priceModes: { ...current.priceModes, [activeSlot]: 'msrp' },
    }));
    setModalPriceMode('msrp');
    setModalPrice('');
    setSearchTerm(product.name);
  };

  const clearSlot = () => {
    if (!activeSlot) return;
    setDraft((current) => ({
      ...current,
      [activeSlot]: null,
      customPrices: { ...current.customPrices, [activeSlot]: '' },
      priceModes: { ...current.priceModes, [activeSlot]: 'msrp' },
    }));
    setNotification({ type: 'success', message: t('workspace.slotCleared', { slot: t(`workspace.slots.${activeSlot}`) }) });
    closeModal();
  };

  const applyModal = () => {
    if (!activeSlot || !draft[activeSlot]) {
      setNotification({ type: 'error', message: t('workspace.selectComponent') });
      return;
    }
    const customPrice = Number(modalPrice);
    if (modalPriceMode === 'custom' && (!modalPrice || !Number.isFinite(customPrice) || customPrice <= 0)) {
      setNotification({ type: 'error', message: t('workspace.invalidCustomPrice') });
      return;
    }
    setDraft((current) => ({
      ...current,
      customPrices: { ...current.customPrices, [activeSlot]: modalPriceMode === 'custom' ? modalPrice : '' },
      priceModes: { ...current.priceModes, [activeSlot]: modalPriceMode },
    }));
    closeModal();
  };

  const clearDraft = () => {
    setDraft((current) => ({
      ...current,
      title: '',
      cpu: null,
      gpu: null,
      ram: null,
      motherboard: null,
      storage: null,
      psu: null,
      customPrices: { cpu: '', gpu: '', ram: '', motherboard: '', storage: '', psu: '' },
      priceModes: { cpu: 'msrp', gpu: 'msrp', ram: 'msrp', motherboard: 'msrp', storage: 'msrp', psu: 'msrp' },
    }));
    setNotification({ type: 'success', message: t('workspace.componentsCleared') });
  };

  const saveDraft = async () => {
    const title = draft.title.trim();
    if (!title || title.length > 120) {
      setNotification({ type: 'error', message: t('workspace.buildTitleInvalid') });
      return;
    }
    if (!isComplete) {
      setNotification({ type: 'error', message: t('workspace.buildIncomplete') });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      const suffix = currency === 'EUR' ? 'eur' : 'usd';
      const getCustomPrice = (slot: SlotKey, targetSuffix: 'usd' | 'eur') => {
        if (draft.priceModes[slot] !== 'custom') return null;

        const customPrice = Number(draft.customPrices[slot]);
        if (!Number.isFinite(customPrice)) return null;

        if (targetSuffix === suffix) {
          return customPrice;
        }

        const initialProductId = initialBuild?.[slot]?.id || initialBuild?.[`${slot}_id`];
        const currentProductId = draft[slot]?.id;
        const existingPrice = initialBuild?.[`custom_price_${slot}_${targetSuffix}`];
        const hasExistingPrice =
          initialProductId === currentProductId &&
          existingPrice !== null &&
          existingPrice !== undefined &&
          existingPrice !== '';

        if (hasExistingPrice && Number.isFinite(Number(existingPrice))) {
          return Number(existingPrice);
        }

        const targetCurrency = targetSuffix === 'eur' ? 'EUR' : 'USD';
        return convertPrice(customPrice, currency, targetCurrency);
      };
      const payload = {
        user_id: user.id,
        title,
        slug: draft.slug || `${slugify(draft.title)}-${crypto.randomUUID().slice(0, 8)}`,
        cpu_id: draft.cpu!.id,
        gpu_id: draft.gpu!.id,
        ram_id: draft.ram!.id,
        motherboard_id: draft.motherboard!.id,
        storage_id: draft.storage!.id,
        psu_id: draft.psu!.id,
        custom_price_cpu_usd: getCustomPrice('cpu', 'usd'),
        custom_price_cpu_eur: getCustomPrice('cpu', 'eur'),
        custom_price_gpu_usd: getCustomPrice('gpu', 'usd'),
        custom_price_gpu_eur: getCustomPrice('gpu', 'eur'),
        custom_price_ram_usd: getCustomPrice('ram', 'usd'),
        custom_price_ram_eur: getCustomPrice('ram', 'eur'),
        custom_price_motherboard_usd: getCustomPrice('motherboard', 'usd'),
        custom_price_motherboard_eur: getCustomPrice('motherboard', 'eur'),
        custom_price_storage_usd: getCustomPrice('storage', 'usd'),
        custom_price_storage_eur: getCustomPrice('storage', 'eur'),
        custom_price_psu_usd: getCustomPrice('psu', 'usd'),
        custom_price_psu_eur: getCustomPrice('psu', 'eur'),
      };
      const response = draft.id
        ? await supabase.from('created_builds').update(payload).eq('id', draft.id).eq('user_id', user.id)
        : await supabase.from('created_builds').insert(payload);
      if (response.error) throw response.error;
      setNotification({ type: 'success', message: t('workspace.buildSaved') });
      setTimeout(() => router.push(`/vault/builds-created?currency=${currency}`), 700);
    } catch (error) {
      console.error('Error saving created build:', error);
      setNotification({ type: 'error', message: t('workspace.buildSaveError') });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="vault-page font-technical min-h-screen bg-black p-4 md:p-8 lg:p-12">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-4">
            <CreatedBuildEditorCard
              draft={draft}
              currency={currency}
              totalPrice={totalPrice}
              onTitleChange={(title) => setDraft((current) => ({ ...current, title }))}
              onOpenSlot={openSlotModal}
              onClear={clearDraft}
              onSave={saveDraft}
              isSaving={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:col-span-8 lg:grid-cols-12">
            {isComplete ? (
              <>
                <BuildEvaluationSection build={draft as unknown as Build} currency={currency} />
                <div className="lg:col-span-6 lg:col-start-1 lg:row-start-2"><Metrics combo={draft} /></div>
                <div className="lg:col-span-12 lg:col-start-1 lg:row-start-3"><FpsCard combo={draft} games={games} /></div>
              </>
            ) : (
              <UnavailableAnalysis />
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur lg:hidden">
         <button type="button" onClick={clearDraft} className="flex-1 rounded-xl border border-zinc-800 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">{t('workspace.clear')}</button>
         <button type="button" onClick={saveDraft} disabled={isSaving} className="flex-1 rounded-xl bg-white px-4 py-3 text-[9px] font-black uppercase tracking-widest text-black transition-colors hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-50">{isSaving ? t('workspace.saving') : t('workspace.save')}</button>
      </div>

      {isModalOpen && activeSlot && (
        <ComponentModal
          slot={activeSlot}
          product={draft[activeSlot]}
          searchTerm={searchTerm}
          suggestions={suggestions}
          isSearching={isSearching}
          priceMode={modalPriceMode}
          price={modalPrice}
          currency={currency}
          onSearchChange={setSearchTerm}
          onSelectProduct={selectProduct}
          onPriceModeChange={setModalPriceMode}
          onPriceChange={setModalPrice}
          onClear={clearSlot}
          onApply={applyModal}
          onClose={closeModal}
        />
      )}

      {notification && (
        <div className={`fixed bottom-6 left-1/2 z-[10001] flex w-[90vw] max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl border bg-zinc-950 px-4 py-3 shadow-2xl ${notification.type === 'error' ? 'border-red-900/50' : 'border-emerald-900/50'}`}>
          {notification.type === 'error' ? <AlertCircle className="text-red-400" size={16} /> : <Check className="text-emerald-400" size={16} />}
          <span className="text-xs font-medium text-zinc-300">{notification.message}</span>
        </div>
      )}
    </main>
  );
}

function CreatedBuildEditorCard({
  draft,
  currency,
  totalPrice,
  onTitleChange,
  onOpenSlot,
  onClear,
  onSave,
  isSaving,
}: {
  draft: DraftState;
  currency: string;
  totalPrice: number;
  onTitleChange: (title: string) => void;
  onOpenSlot: (slot: SlotKey) => void;
  onClear: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const t = useTranslations('vault');
  const locale = useLocale();
  const symbol = currency === 'EUR' ? '€' : '$';
  return (
    <div className="rounded-3xl border border-zinc-900 bg-zinc-950/50 p-5 shadow-2xl lg:p-8">
      <div className="mb-6 flex items-center justify-between">
         <div><span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">{t('workspace.customBuild')}</span><h1 className="mt-2 text-xl font-black tracking-tight text-white">{t('workspace.components')}</h1></div>
        <CircleHelp size={17} className="text-zinc-600" />
      </div>
      <div className="space-y-3">
        {slots.map((slot) => {
          const product = draft[slot];
          const price = getProductPrice(product, slot, draft, currency);
          return (
            <button key={slot} type="button" onClick={() => onOpenSlot(slot)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-900 bg-black/50 p-3 text-left transition-colors hover:border-zinc-700">
               <div className="min-w-0"><span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">{t(`workspace.slots.${slot}`)}</span><span className={`mt-1 block truncate text-xs font-bold ${product ? 'text-zinc-200' : 'text-zinc-700'}`}>{product?.name || t('workspace.selectComponentLabel')}</span></div>
               <div className="flex shrink-0 items-center gap-3"><span className="text-xs font-black text-zinc-300">{product ? `${symbol}${formatPrice(price, locale)}` : formatPrice(0, locale)}</span><Settings2 size={16} className="text-zinc-500" /></div>
            </button>
          );
        })}
      </div>
       <label className="mt-5 block"><span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">{t('workspace.buildName')}</span><input value={draft.title} onChange={(event) => onTitleChange(event.target.value)} maxLength={120} placeholder={t('workspace.namePlaceholder')} className="mt-2 w-full rounded-2xl border border-zinc-900 bg-black px-4 py-3 text-sm font-bold font-display text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-zinc-600" /></label>
       <div className="mt-5 hidden items-center justify-between border-t border-zinc-900 pt-5 lg:flex"><div><span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{t('workspace.totalPrice')}</span><span className="mt-1 block text-xl font-black font-display text-white">{symbol}{formatPrice(totalPrice, locale)}</span></div><div className="flex gap-2"><button type="button" onClick={onClear} className="rounded-xl border border-zinc-800 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">{t('workspace.clear')}</button><button type="button" onClick={onSave} disabled={isSaving} className="rounded-xl bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest text-black transition-colors hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-50">{isSaving ? t('workspace.saving') : t('workspace.save')}</button></div></div>
    </div>
  );
}

function ComponentModal({
  slot, product, searchTerm, suggestions, isSearching, priceMode, price, currency,
  onSearchChange, onSelectProduct, onPriceModeChange, onPriceChange, onClear, onApply, onClose,
}: {
  slot: SlotKey;
  product: Product | null;
  searchTerm: string;
  suggestions: Product[];
  isSearching: boolean;
  priceMode: PriceMode;
  price: string;
  currency: string;
  onSearchChange: (value: string) => void;
  onSelectProduct: (product: Product) => void;
  onPriceModeChange: (mode: PriceMode) => void;
  onPriceChange: (price: string) => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('vault');
  const locale = useLocale();
  const catalogPrice = product ? resolveProductPrice(product, currency) : null;
  const currentPrice = catalogPrice?.value || 0;
  const symbol = currency === 'EUR' ? '€' : '$';
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
         <div className="flex items-center justify-between border-b border-zinc-900 pb-4"><div><span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{t('workspace.selectedComponent')}</span><h2 className="mt-1 text-sm font-black uppercase text-white">{t(`workspace.slots.${slot}`)}</h2></div><button type="button" onClick={onClose} className="rounded-full bg-zinc-900 p-2 text-zinc-500 transition-colors hover:text-white" aria-label={t('workspace.close')}><X aria-hidden="true" size={15} /></button></div>
         <div className="relative mt-5"><input value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder={t('workspace.searchComponent')} className="w-full rounded-xl border border-zinc-900 bg-black px-4 py-3 pl-10 text-xs font-bold text-white outline-none placeholder:text-zinc-700 focus:border-zinc-700" /><Search aria-hidden="true" size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />{isSearching && <span aria-label={t('workspace.searching')} className="absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />}</div>
          <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">{suggestions.map((suggestion) => <button key={suggestion.id} type="button" onClick={() => onSelectProduct(suggestion)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${product?.id === suggestion.id ? 'border-white bg-zinc-900' : 'border-transparent bg-zinc-900/30 hover:border-zinc-700'}`}><span className="min-w-0"><span className="block truncate text-xs font-bold text-zinc-200">{suggestion.name}</span><span className="mt-1 block text-[8px] font-black uppercase tracking-widest text-zinc-600">{suggestion.brand}</span></span><span className="ml-3 shrink-0 text-[10px] font-bold text-zinc-500">{symbol}{formatPrice(resolveProductPrice(suggestion, currency).value, locale, 0)}</span></button>)}{!isSearching && searchTerm.trim().length >= 2 && suggestions.length === 0 && <p className="py-4 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-700">{t('workspace.noResults')}</p>}{searchTerm.trim().length < 2 && <p className="py-4 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-700">{t('workspace.minimumSearch')}</p>}</div>
          {product && <div className="mt-5 border-t border-zinc-900 pt-5"><label className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{t('workspace.componentPrice')}</label><div className="mt-3 grid grid-cols-[1fr_110px] gap-2"><select value={priceMode} onChange={(event) => onPriceModeChange(event.target.value as PriceMode)} className="rounded-xl border border-zinc-900 bg-black px-3 py-2 text-xs font-bold text-white outline-none focus:border-zinc-700"><option value="msrp">{catalogPrice?.source === 'current' ? t('workspace.currentPrice') : t('workspace.msrp')} ({symbol}{formatPrice(currentPrice, locale)})</option><option value="custom">{t('workspace.customPrice')}</option></select><input type="number" min="0" step="0.01" value={priceMode === 'custom' ? price : currentPrice} onChange={(event) => onPriceChange(event.target.value)} disabled={priceMode !== 'custom'} className="[appearance:textfield] rounded-xl border border-zinc-900 bg-black px-3 py-2 text-xs font-bold text-white outline-none disabled:text-zinc-700 focus:border-zinc-700" /></div></div>}
         <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClear} className="rounded-xl border border-zinc-800 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">{t('workspace.clear')}</button><button type="button" onClick={onApply} className="rounded-xl bg-white px-4 py-2 text-[9px] font-black uppercase tracking-widest text-black transition-colors hover:bg-zinc-200">{t('workspace.apply')}</button></div>
      </div>
    </div>
  );
}

function UnavailableAnalysis() {
  const t = useTranslations('vault');
  return <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center lg:col-span-12"><p className="max-w-sm text-xs font-black uppercase leading-relaxed tracking-[0.15em] text-zinc-600">{t('workspace.analysisUnavailable')}</p></div>;
}
