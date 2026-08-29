'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, CircleHelp, Search, Settings2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { convertPrice } from '@/lib/currency';
import { resolveProductPrice } from '@/lib/catalog/product-price';
import { useAiVisiblePriceStore } from '@/store/useAiVisiblePriceStore';
import ComboEvaluationSection from '@/app/(main)/combos/[slug]/components/ComboEvaluationSection';
import FpsCard from '@/app/(main)/combos/[slug]/components/FpsCard';
import Metrics from '@/app/(main)/combos/[slug]/components/Metrics';

type SlotKey = 'cpu' | 'gpu' | 'ram';
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
  specs?: any;
  compatibility?: any;
  [key: string]: any;
}

interface CreatedComboWorkspaceProps {
  initialCombo?: any | null;
  games: any[];
  currency: string;
}

interface DraftState {
  id?: string;
  slug?: string;
  title: string;
  cpu: Product | null;
  gpu: Product | null;
  ram: Product | null;
  customPrices: Record<SlotKey, string>;
  priceModes: Record<SlotKey, PriceMode>;
}

const slotLabels: Record<SlotKey, string> = {
  cpu: 'Procesador',
  gpu: 'Gráfica',
  ram: 'RAM',
};

function parseJson(value: any) {
  if (typeof value !== 'string') return value || {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function getInitialPrice(combo: any, slot: SlotKey, currency: string) {
  const suffix = currency === 'EUR' ? 'eur' : 'usd';
  const customPrice = combo?.[`custom_price_${slot}_${suffix}`];
  if (customPrice !== null && customPrice !== undefined && customPrice !== '') {
    return String(customPrice);
  }

  const otherSuffix = suffix === 'eur' ? 'usd' : 'eur';
  const otherCustomPrice = combo?.[`custom_price_${slot}_${otherSuffix}`];
  if (otherCustomPrice !== null && otherCustomPrice !== undefined && otherCustomPrice !== '') {
    const otherCurrency = suffix === 'eur' ? 'USD' : 'EUR';
    return String(convertPrice(Number(otherCustomPrice), otherCurrency, currency));
  }

  return '';
}

function createInitialDraft(combo: any, currency: string): DraftState {
  const slots: SlotKey[] = ['cpu', 'gpu', 'ram'];
  const customPrices = slots.reduce<Record<SlotKey, string>>((prices, slot) => {
    prices[slot] = getInitialPrice(combo, slot, currency);
    return prices;
  }, { cpu: '', gpu: '', ram: '' });
  const priceModes = slots.reduce<Record<SlotKey, PriceMode>>((modes, slot) => {
    modes[slot] = customPrices[slot] ? 'custom' : 'msrp';
    return modes;
  }, { cpu: 'msrp', gpu: 'msrp', ram: 'msrp' });

  return {
    id: combo?.id,
    slug: combo?.slug,
    title: combo?.title || '',
    cpu: combo?.cpu || null,
    gpu: combo?.gpu || null,
    ram: combo?.ram || null,
    customPrices,
    priceModes,
  };
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'combo';
}

function getProductPrice(product: Product | null, slot: SlotKey, combo: DraftState, currency: string) {
  if (!product) return 0;
  if (combo.priceModes[slot] === 'custom' && combo.customPrices[slot]) {
    return Number(combo.customPrices[slot]) || 0;
  }
  return resolveProductPrice(product, currency).value;
}

function getAiPriceContext(draft: DraftState, currency: string) {
  const slots: SlotKey[] = ['cpu', 'gpu', 'ram'];
  return {
    scope: 'draft_combo' as const,
    currency: currency === 'EUR' ? 'EUR' as const : 'USD' as const,
    items: slots.flatMap((slot) => {
      const product = draft[slot];
      if (!product) return [];
      const isCustom = draft.priceModes[slot] === 'custom';
      return [{ productId: product.id, price: getProductPrice(product, slot, draft, currency), isCustom, slot }];
    }),
  };
}

function normalizeRamType(value: any) {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

function validateCompatibility(nextSlot: SlotKey, nextProduct: Product, draft: DraftState) {
  const cpu = nextSlot === 'cpu' ? nextProduct : draft.cpu;
  const ram = nextSlot === 'ram' ? nextProduct : draft.ram;

  if (!cpu || !ram) return null;

  const cpuCompatibility = parseJson(cpu.compatibility);
  const ramSpecs = parseJson(ram.specs);
  const expectedRamType = normalizeRamType(cpuCompatibility.ram_type);
  const actualRamType = normalizeRamType(ramSpecs.technology || ramSpecs.memory_type);

  if (expectedRamType && actualRamType && !actualRamType.includes(expectedRamType) && !expectedRamType.includes(actualRamType)) {
    return `${cpu.name} requiere memoria ${cpuCompatibility.ram_type}.`;
  }

  const maxRam = Number(cpuCompatibility.ram_max_support || 0);
  const ramCapacity = Number(ramSpecs.capacity || 0);
  if (maxRam > 0 && ramCapacity > maxRam) {
    return `${cpu.name} admite un máximo de ${maxRam} GB de RAM.`;
  }

  return null;
}

export default function CreatedComboWorkspace({
  initialCombo = null,
  games,
  currency,
}: CreatedComboWorkspaceProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>(() => createInitialDraft(initialCombo, currency));
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [modalPriceMode, setModalPriceMode] = useState<PriceMode>('msrp');
  const [modalPrice, setModalPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const isComplete = Boolean(draft.cpu && draft.gpu && draft.ram);
  const totalPrice = useMemo(
    () => (['cpu', 'gpu', 'ram'] as SlotKey[]).reduce(
      (total, slot) => total + getProductPrice(draft[slot], slot, draft, currency),
      0,
    ),
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
        setNotification({ type: 'error', message: 'No se pudieron buscar componentes.' });
      } else {
        setSuggestions((data || []) as Product[]);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [activeSlot, isModalOpen, searchTerm]);

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
    const compatibilityError = validateCompatibility(activeSlot, product, draft);
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
    setNotification({ type: 'success', message: `${slotLabels[activeSlot]} limpiado.` });
    closeModal();
  };

  const applyModal = () => {
    if (!activeSlot || !draft[activeSlot]) {
      setNotification({ type: 'error', message: 'Selecciona un componente antes de aplicar.' });
      return;
    }

    if (modalPriceMode === 'custom' && (!modalPrice || Number(modalPrice) <= 0)) {
      setNotification({ type: 'error', message: 'Introduce un precio personalizado válido.' });
      return;
    }

    setDraft((current) => ({
      ...current,
      customPrices: {
        ...current.customPrices,
        [activeSlot]: modalPriceMode === 'custom' ? modalPrice : '',
      },
      priceModes: {
        ...current.priceModes,
        [activeSlot]: modalPriceMode,
      },
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
      customPrices: { cpu: '', gpu: '', ram: '' },
      priceModes: { cpu: 'msrp', gpu: 'msrp', ram: 'msrp' },
    }));
    setNotification({ type: 'success', message: 'Componentes limpiados.' });
  };

  const saveDraft = async () => {
    if (!draft.title.trim()) {
      setNotification({ type: 'error', message: 'Escribe un nombre para el combo.' });
      return;
    }
    if (!isComplete) {
      setNotification({ type: 'error', message: 'Selecciona CPU, GPU y RAM antes de guardar.' });
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

        const initialProductId = initialCombo?.[slot]?.id || initialCombo?.[`${slot}_id`];
        const currentProductId = draft[slot]?.id;
        const existingPrice = initialCombo?.[`custom_price_${slot}_${targetSuffix}`];
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
        title: draft.title.trim(),
        slug: draft.slug || `${slugify(draft.title)}-${crypto.randomUUID().slice(0, 8)}`,
        cpu_id: draft.cpu!.id,
        gpu_id: draft.gpu!.id,
        ram_id: draft.ram!.id,
        custom_price_cpu_usd: getCustomPrice('cpu', 'usd'),
        custom_price_cpu_eur: getCustomPrice('cpu', 'eur'),
        custom_price_gpu_usd: getCustomPrice('gpu', 'usd'),
        custom_price_gpu_eur: getCustomPrice('gpu', 'eur'),
        custom_price_ram_usd: getCustomPrice('ram', 'usd'),
        custom_price_ram_eur: getCustomPrice('ram', 'eur'),
      };

      const response = draft.id
        ? await supabase.from('created_combos').update(payload).eq('id', draft.id).eq('user_id', user.id)
        : await supabase.from('created_combos').insert(payload);

      if (response.error) throw response.error;

      setNotification({ type: 'success', message: 'Combo guardado exitosamente.' });
      setTimeout(() => router.push(`/vault/combos-created?currency=${currency}`), 700);
    } catch (error) {
      console.error('Error saving created combo:', error);
      setNotification({ type: 'error', message: 'No se pudo guardar el combo.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="vault-page font-technical min-h-screen bg-black p-4 md:p-8 lg:p-12">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-4">
            <CreatedComboEditorCard
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
                <ComboEvaluationSection combo={draft} currency={currency} />
                <div className="lg:col-span-6">
                  <Metrics combo={draft} />
                </div>
                <div className="lg:col-span-6">
                  <FpsCard combo={draft} games={games} />
                </div>
              </>
            ) : (
              <UnavailableAnalysis />
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur lg:hidden">
        <button type="button" onClick={clearDraft} className="flex-1 rounded-xl border border-zinc-800 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">
          Limpiar
        </button>
        <button type="button" onClick={saveDraft} disabled={isSaving} className="flex-1 rounded-xl bg-white px-4 py-3 text-[9px] font-black uppercase tracking-widest text-black transition-colors hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-50">
          {isSaving ? 'Guardando' : 'Guardar'}
        </button>
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

function CreatedComboEditorCard({
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
  const symbol = currency === 'EUR' ? '€' : '$';

  return (
    <div className="rounded-3xl border border-zinc-900 bg-zinc-950/50 p-5 shadow-2xl lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Combo personalizado</span>
          <h1 className="mt-2 text-xl font-black tracking-tight text-white">Componentes</h1>
        </div>
        <CircleHelp size={17} className="text-zinc-600" />
      </div>

      <div className="space-y-3">
        {(['cpu', 'gpu', 'ram'] as SlotKey[]).map((slot) => {
          const product = draft[slot];
          const price = getProductPrice(product, slot, draft, currency);

          return (
            <button
              key={slot}
              type="button"
              onClick={() => onOpenSlot(slot)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-900 bg-black/50 p-3 text-left transition-colors hover:border-zinc-700"
            >
              <div className="min-w-0">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">{slotLabels[slot]}</span>
                <span className={`mt-1 block truncate text-xs font-bold ${product ? 'text-zinc-200' : 'text-zinc-700'}`}>
                  {product?.name || 'Seleccionar componente'}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs font-black text-zinc-300">{product ? `${symbol}${price.toFixed(2)}` : '0.00'}</span>
                <Settings2 size={16} className="text-zinc-500" />
              </div>
            </button>
          );
        })}
      </div>

      <label className="mt-5 block">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Nombre del combo</span>
        <input
          value={draft.title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Escribe un nombre..."
          className="mt-2 w-full rounded-2xl border border-zinc-900 bg-black px-4 py-3 text-sm font-bold text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-zinc-600"
        />
      </label>

      <div className="mt-5 hidden items-center justify-between border-t border-zinc-900 pt-5 lg:flex">
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Precio total</span>
          <span className="mt-1 block text-lg font-black text-white">{symbol}{totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClear} className="rounded-xl border border-zinc-800 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">
            Limpiar
          </button>
          <button type="button" onClick={onSave} disabled={isSaving} className="rounded-xl bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest text-black transition-colors hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-50">
            {isSaving ? 'Guardando' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ComponentModal({
  slot,
  product,
  searchTerm,
  suggestions,
  isSearching,
  priceMode,
  price,
  currency,
  onSearchChange,
  onSelectProduct,
  onPriceModeChange,
  onPriceChange,
  onClear,
  onApply,
  onClose,
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
  const catalogPrice = product ? resolveProductPrice(product, currency) : null;
  const currentPrice = catalogPrice?.value || 0;
  const symbol = currency === 'EUR' ? '€' : '$';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Componente elegido</span>
            <h2 className="mt-1 text-sm font-black uppercase text-white">{slotLabels[slot]}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-zinc-900 p-2 text-zinc-500 transition-colors hover:text-white" aria-label="Cerrar">
            <X size={15} />
          </button>
        </div>

        <div className="relative mt-5">
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar componente..."
            className="w-full rounded-xl border border-zinc-900 bg-black px-4 py-3 pl-10 text-xs font-bold text-white outline-none placeholder:text-zinc-700 focus:border-zinc-700"
          />
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
          {isSearching && <span className="absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />}
        </div>

        <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button key={suggestion.id} type="button" onClick={() => onSelectProduct(suggestion)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${product?.id === suggestion.id ? 'border-white bg-zinc-900' : 'border-transparent bg-zinc-900/30 hover:border-zinc-700'}`}>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-zinc-200">{suggestion.name}</span>
                <span className="mt-1 block text-[8px] font-black uppercase tracking-widest text-zinc-600">{suggestion.brand}</span>
              </span>
              <span className="ml-3 shrink-0 text-[10px] font-bold text-zinc-500">{symbol}{resolveProductPrice(suggestion, currency).value.toFixed(0)}</span>
            </button>
          ))}
          {!isSearching && searchTerm.trim().length >= 2 && suggestions.length === 0 && <p className="py-4 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-700">Sin resultados</p>}
          {searchTerm.trim().length < 2 && <p className="py-4 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-700">Introduce al menos 2 letras</p>}
        </div>

        {product && (
          <div className="mt-5 border-t border-zinc-900 pt-5">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Precio del componente</label>
            <div className="mt-3 grid grid-cols-[1fr_110px] gap-2">
              <select value={priceMode} onChange={(event) => onPriceModeChange(event.target.value as PriceMode)} className="rounded-xl border border-zinc-900 bg-black px-3 py-2 text-xs font-bold text-white outline-none focus:border-zinc-700">
                <option value="msrp">{catalogPrice?.source === 'current' ? 'Precio actual' : 'MSRP'} ({symbol}{currentPrice.toFixed(2)})</option>
                <option value="custom">Precio personalizado</option>
              </select>
              <input type="number" min="0" step="0.01" value={priceMode === 'custom' ? price : currentPrice} onChange={(event) => onPriceChange(event.target.value)} disabled={priceMode !== 'custom'} className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none rounded-xl border border-zinc-900 bg-black px-3 py-2 text-xs font-bold text-white outline-none disabled:text-zinc-700 focus:border-zinc-700" />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClear} className="rounded-xl border border-zinc-800 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">Limpiar</button>
          <button type="button" onClick={onApply} className="rounded-xl bg-white px-4 py-2 text-[9px] font-black uppercase tracking-widest text-black transition-colors hover:bg-zinc-200">Aplicar</button>
        </div>
      </div>
    </div>
  );
}

function UnavailableAnalysis() {
  return (
    <div className="lg:col-span-12 flex min-h-[400px] items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center">
      <p className="max-w-sm text-xs font-black uppercase leading-relaxed tracking-[0.15em] text-zinc-600">
        Disponible cuando todos los componentes hayan sido seleccionados
      </p>
    </div>
  );
}
