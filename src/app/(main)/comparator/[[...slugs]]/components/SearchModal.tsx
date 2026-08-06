"use client";

import React, { useEffect, useState } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import { useCompareStore } from '@/store/useCompareStore';
import { supabase } from '@/lib/supabaseClient';
import {
  getProductPrice,
  normalizeCombo,
} from './comparisonUtils';
import type { ComparisonMode } from './comparisonUtils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparisonMode: ComparisonMode;
  setComparisonMode: (mode: ComparisonMode) => void;
  globalCurrency: string;
}

export default function SearchModal({
  isOpen,
  onClose,
  comparisonMode,
  setComparisonMode,
  globalCurrency,
}: SearchModalProps) {
  const addItem = useCompareStore((state) => state.addItem);
  const componentType = useCompareStore((state) => state.componentType);
  const itemsCount = useCompareStore((state) => state.items.length);

  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

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

      setLoading(true);
      try {
        const search = `%${searchTerm}%`;
        const productQuery = supabase
          .from('products_with_priority')
          .select('*')
          .ilike('name', search)
          .limit(5);

        if (componentType) productQuery.ilike('type', componentType);

        const result = comparisonMode === 'combos'
          ? await supabase
              .from('combos')
              .select(`
                *,
                cpu:products!cpu_id(*),
                gpu:products!gpu_id(*),
                ram:products!ram_id(*)
              `)
              .eq('is_active', true)
              .ilike('title', search)
              .limit(5)
          : await productQuery;

        if (result.error) throw result.error;
        setSuggestions(result.data || []);
      } catch (error) {
        console.error('Error fetching comparison suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, comparisonMode, componentType, isOpen]);

  if (!isOpen) return null;

  const handleSelectItem = (item: any) => {
    const normalizedItem = comparisonMode === 'combos'
      ? normalizeCombo(item, globalCurrency)
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
      setErrorNotification(result.error || 'No se pudo añadir');
    }
  };

  const isComboMode = comparisonMode === 'combos';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 z-[-1]" onClick={onClose} />

      <div className="w-full max-w-md flex flex-col overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-900 shadow-2xl p-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900 mb-4">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white">
              Buscar {isComboMode ? 'Combo' : 'Componente'}
            </h3>
            {!isComboMode && componentType && (
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">
                Restringido a: <span className="text-zinc-400">{componentType}</span>
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-900 p-2 text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <label className="flex flex-col gap-1.5 mb-3">
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">
            Comparar
          </span>
          <select
            value={comparisonMode}
            disabled={itemsCount > 0}
            onChange={(event) => {
              setComparisonMode(event.target.value as ComparisonMode);
              setSearchTerm('');
              setSuggestions([]);
            }}
            className="w-full rounded-xl border border-zinc-900 bg-black px-3 py-3 text-xs font-bold text-white outline-none focus:border-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="components">Componentes</option>
            <option value="combos">Combos</option>
          </select>
        </label>

        <div className="relative flex items-center mb-2">
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={isComboMode ? 'Escribe el nombre del combo...' : 'Escribe el nombre del hardware...'}
            className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 pl-10 text-xs font-bold text-white outline-none focus:border-zinc-700 transition-colors placeholder:text-zinc-600"
          />
          <Search size={14} className="absolute left-4 text-zinc-600" />
          {loading && (
            <div className="absolute right-4 h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
          )}
        </div>

        <div className="mt-2 space-y-1 max-h-60 overflow-y-auto pr-1">
          {suggestions.length > 0 ? (
            suggestions.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className="flex w-full flex-col p-3 rounded-xl border border-transparent hover:border-zinc-800 bg-zinc-900/10 hover:bg-zinc-900/40 text-left transition-all group animate-in fade-in duration-150"
              >
                <span className="text-xs font-bold text-zinc-300 group-hover:text-white truncate">
                  {isComboMode ? item.title : item.name}
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mt-1">
                  {isComboMode ? item.category : `${item.brand} · ${item.type}`}
                </span>
              </button>
            ))
          ) : searchTerm.trim().length >= 2 && !loading ? (
            <p className="text-[9px] font-bold text-zinc-600 text-center py-6 uppercase tracking-wider">Sin resultados</p>
          ) : (
            <p className="text-[9px] font-bold text-zinc-700 text-center py-6 uppercase tracking-wider">Introduce al menos 2 letras</p>
          )}
        </div>
      </div>

      {errorNotification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-3 rounded-xl border border-red-900/40 bg-zinc-950 px-4 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm w-[90vw]">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-950/50 border border-red-800 text-red-400">
            <AlertCircle size={12} strokeWidth={3} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-red-500">SISTEMA DE COMPARACIÓN</span>
            <span className="text-xs font-medium text-zinc-300 tracking-tight mt-0.5 leading-tight">{errorNotification}</span>
          </div>
        </div>
      )}
    </div>
  );
}
