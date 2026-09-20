"use client";

import React, { useEffect, useState } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import { useCompareStore } from '@/store/useCompareStore';
import { getComparisonErrorMessage } from '@/lib/comparison-errors';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabaseClient';
import {
  getProductPrice,
  normalizeBuild,
  normalizeCombo,
} from './comparisonUtils';
import type { ComparisonMode } from './comparisonUtils';
import { useTranslations } from 'next-intl';

type SearchSource = 'default' | 'saved' | 'created';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparisonMode: ComparisonMode;
  setComparisonMode: (mode: ComparisonMode) => void;
  globalCurrency: string;
}

function unwrapRelation(row: any, key: string) {
  const relation = row?.[key];
  return Array.isArray(relation) ? relation[0] : relation;
}

function matchesSearch(item: any, comparisonMode: ComparisonMode, searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) return true;

  const values = comparisonMode === 'components'
    ? [item?.name, item?.brand, item?.type, item?.slug]
    : [item?.title, item?.category, item?.slug];

  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
}

export default function SearchModal({
  isOpen,
  onClose,
  comparisonMode,
  setComparisonMode,
  globalCurrency,
}: SearchModalProps) {
  const t = useTranslations('comparator');
  const tCommon = useTranslations('common');
  const addItem = useCompareStore((state) => state.addItem);
  const componentType = useCompareStore((state) => state.componentType);
  const itemsCount = useCompareStore((state) => state.items.length);
  const user = useAuthStore((state) => state.user);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchSource, setSearchSource] = useState<SearchSource>('default');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  useEffect(() => {
    if (user) return;

    setSearchSource('default');
  }, [user]);

  useEffect(() => {
    if (errorNotification) {
      const timer = setTimeout(() => setErrorNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorNotification]);

  useEffect(() => {
    if (!isOpen) return;

    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      if (searchSource !== 'default' && !user) {
        setSuggestions([]);
        return;
      }

      if (searchSource === 'created' && comparisonMode === 'components') {
        setSuggestions([]);
        return;
      }

      setLoading(true);

      try {
        const search = `%${searchTerm.trim()}%`;
        let resultItems: any[] = [];

        if (searchSource === 'default') {
          if (comparisonMode === 'components') {
            const productQuery = supabase
              .from('products_with_priority')
              .select('*')
              .ilike('name', search)
              .limit(5);

            if (componentType) productQuery.ilike('type', componentType);

            const result = await productQuery;
            if (result.error) throw result.error;
            resultItems = result.data || [];
          } else if (comparisonMode === 'combos') {
            const result = await supabase
              .from('combos')
              .select(`
                *,
                cpu:products!cpu_id(*),
                gpu:products!gpu_id(*),
                ram:products!ram_id(*)
              `)
              .eq('is_active', true)
              .ilike('title', search)
              .limit(5);

            if (result.error) throw result.error;
            resultItems = result.data || [];
          } else {
            const result = await supabase
              .from('builds')
              .select(`
                *,
                cpu:products!cpu_id(*),
                gpu:products!gpu_id(*),
                ram:products!ram_id(*),
                motherboard:products!motherboard_id(*),
                storage:products!storage_id(*),
                psu:products!psu_id(*)
              `)
              .eq('is_active', true)
              .ilike('title', search)
              .limit(5);

            if (result.error) throw result.error;
            resultItems = result.data || [];
          }
        } else if (searchSource === 'saved' && user) {
          if (comparisonMode === 'components') {
            const result = await supabase
              .from('saved_products')
              .select('product:products(*)')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (result.error) throw result.error;
            resultItems = (result.data || [])
              .map((row) => unwrapRelation(row, 'product'))
              .filter(Boolean)
              .filter((item) => !componentType || String(item.type).toUpperCase() === componentType);
          } else if (comparisonMode === 'combos') {
            const result = await supabase
              .from('saved_combos')
              .select(`
                combo:combos(
                  *,
                  cpu:products!cpu_id(*),
                  gpu:products!gpu_id(*),
                  ram:products!ram_id(*)
                )
              `)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (result.error) throw result.error;
            resultItems = (result.data || [])
              .map((row) => unwrapRelation(row, 'combo'))
              .filter(Boolean);
          } else {
            const result = await supabase
              .from('saved_builds')
              .select(`
                build:builds(
                  *,
                  cpu:products!cpu_id(*),
                  gpu:products!gpu_id(*),
                  ram:products!ram_id(*),
                  motherboard:products!motherboard_id(*),
                  storage:products!storage_id(*),
                  psu:products!psu_id(*)
                )
              `)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (result.error) throw result.error;
            resultItems = (result.data || [])
              .map((row) => unwrapRelation(row, 'build'))
              .filter(Boolean);
          }
        } else if (searchSource === 'created' && user) {
          if (comparisonMode === 'combos') {
            const result = await supabase
              .from('created_combos')
              .select(`
                *,
                cpu:products!cpu_id(*),
                gpu:products!gpu_id(*),
                ram:products!ram_id(*)
              `)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (result.error) throw result.error;
            resultItems = result.data || [];
          } else {
            const result = await supabase
              .from('created_builds')
              .select(`
                *,
                cpu:products!cpu_id(*),
                gpu:products!gpu_id(*),
                ram:products!ram_id(*),
                motherboard:products!motherboard_id(*),
                storage:products!storage_id(*),
                psu:products!psu_id(*)
              `)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (result.error) throw result.error;
            resultItems = result.data || [];
          }
        }

        setSuggestions(
          resultItems
            .filter((item) => matchesSearch(item, comparisonMode, searchTerm))
            .slice(0, 5),
        );
      } catch (error) {
        console.error('Error fetching comparison suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchSource, comparisonMode, componentType, isOpen, user]);

  if (!isOpen) return null;

  const handleSelectItem = (item: any) => {
    const normalizedItem = comparisonMode === 'combos'
      ? normalizeCombo(item, globalCurrency)
      : comparisonMode === 'builds'
        ? normalizeBuild(item, globalCurrency)
        : {
            ...item,
            comparisonType: 'product',
            price: getProductPrice(item, globalCurrency),
            currency: globalCurrency,
          };

    const result = addItem(normalizedItem);
    if (result.success) {
      onClose();
      setSearchTerm('');
      setSuggestions([]);
    } else {
       setErrorNotification(getComparisonErrorMessage(result.error, tCommon));
    }
  };

  const isComboMode = comparisonMode === 'combos';
  const isBuildMode = comparisonMode === 'builds';
  const isCreatedSource = searchSource === 'created';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0 z-[-1]" onClick={onClose} />

      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950 p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-4">
          <div className="flex flex-col">
            <h3 className="text-[14px] font-extrabold uppercase tracking-widest text-white">
               {t('searchTitle', { type: isComboMode ? t('combo') : isBuildMode ? t('build') : t('component') })}
            </h3>
            {!isComboMode && !isBuildMode && componentType && (
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                 {t('restrictedTo')} <span className="text-zinc-400">{componentType}</span>
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-900 p-2 text-zinc-500 transition-colors hover:text-white">
            <X size={16} />
          </button>
        </div>

        <label className="mb-3 flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {t('compare')}
          </span>
          <select
            value={comparisonMode}
            disabled={itemsCount > 0}
            onChange={(event) => {
              setComparisonMode(event.target.value as ComparisonMode);
              setSearchTerm('');
              setSuggestions([]);
            }}
            className="w-full rounded-xl border border-zinc-900 bg-black px-3 py-3 text-xs font-bold text-white outline-none transition-colors focus:border-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="components" disabled={isCreatedSource}>{t('components')}</option>
            <option value="combos">{t('combos')}</option>
            <option value="builds">{t('builds')}</option>
          </select>
        </label>

        {user && (
          <label className="mb-3 flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {t('source')}
            </span>
            <select
              value={searchSource}
              onChange={(event) => {
                const nextSource = event.target.value as SearchSource;
                setSearchSource(nextSource);
                if (nextSource === 'created' && comparisonMode === 'components' && itemsCount === 0) {
                  setComparisonMode('combos');
                }
                setSearchTerm('');
                setSuggestions([]);
              }}
              className="w-full rounded-xl border border-zinc-900 bg-black px-3 py-3 text-xs font-bold text-white outline-none transition-colors focus:border-zinc-700"
            >
              <option value="default">{t('defaultSource')}</option>
              <option value="saved">{t('savedSource')}</option>
              <option value="created">{t('createdSource')}</option>
            </select>
          </label>
        )}

        <div className="relative mb-2 flex items-center">
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={isComboMode ? t('comboSearchPlaceholder') : isBuildMode ? t('buildSearchPlaceholder') : t('componentSearchPlaceholder')}
            className="w-full rounded-xl border border-zinc-900 bg-black px-4 py-3 pl-10 text-xs font-bold text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-700"
          />
          <Search size={14} className="absolute left-4 text-zinc-600" />
          {loading && (
            <div className="absolute right-4 h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
          )}
        </div>

        <div className="mt-2 max-h-60 space-y-1 overflow-y-auto pr-1">
          {suggestions.length > 0 ? (
            suggestions.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className="group flex w-full flex-col rounded-xl border border-transparent bg-zinc-900/10 p-3 text-left transition-all hover:border-zinc-800 hover:bg-zinc-900/40 animate-in fade-in duration-150"
              >
                <span className="truncate text-xs font-bold text-zinc-300 group-hover:text-white">
                  {isComboMode || isBuildMode ? item.title : item.name}
                </span>
                <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-zinc-600">
                  {isComboMode || isBuildMode ? item.category : `${item.brand} · ${item.type}`}
                </span>
              </button>
            ))
          ) : searchTerm.trim().length >= 2 && !loading ? (
            <p className="py-6 text-center text-[9px] font-bold uppercase tracking-wider text-zinc-600">{t('noResults')}</p>
          ) : (
            <p className="py-6 text-center text-[9px] font-bold uppercase tracking-wider text-zinc-700">{t('minimumSearchCharacters')}</p>
          )}
        </div>
      </div>

      {errorNotification && (
        <div className="fixed bottom-6 left-1/2 z-[10001] flex w-[90vw] max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl border border-red-900/40 bg-zinc-950 px-4 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-800 bg-red-950/50 text-red-400">
            <AlertCircle size={12} strokeWidth={3} />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-red-500">{t('comparisonSystem')}</span>
            <span className="mt-0.5 text-xs font-medium leading-tight tracking-tight text-zinc-300">{errorNotification}</span>
          </div>
        </div>
      )}
    </div>
  );
}
