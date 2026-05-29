"use client";

import React, { useState, useEffect } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import { useCompareStore } from '@/store/useCompareStore';
import { supabase } from '@/lib/supabaseClient';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const addItem = useCompareStore((state) => state.addItem);
  const componentType = useCompareStore((state) => state.componentType);

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
        let query = supabase
          .from('products_with_priority')
          .select('id, slug, name, type, brand, price_base_usd, price_base_eur, specs, compatibility, release_date')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);

        if (componentType) {
          query = query.ilike('type', componentType);
        }

        const { data } = await query;
        if (data) setSuggestions(data);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, componentType, isOpen]);

  if (!isOpen) return null;

  const handleSelectProduct = (product: any) => {
    const priceColumn = product.price_base_eur ? 'price_base_eur' : 'price_base_usd';
    const normalizedProduct = {
      ...product,
      price: product[priceColumn] || 0,
      currency: product.price_base_eur ? 'EUR' : 'USD'
    };

    const result = addItem(normalizedProduct);
    if (result.success) {
      onClose();
      setSearchTerm('');
      setSuggestions([]);
    } else {
      setErrorNotification(result.error || "No se pudo añadir");
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 z-[-1]" onClick={onClose} />

      <div className="w-full max-w-md flex flex-col overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-900 shadow-2xl p-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900 mb-4">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Buscar Componente</h3>
            {componentType && (
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">
                Restringido a: <span className="text-zinc-400">{componentType}</span>
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-900 p-2 text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="relative flex items-center mb-2">
          <input 
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Escribe el nombre del hardware..."
            className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 pl-10 text-xs font-bold text-white outline-none focus:border-zinc-700 transition-colors placeholder:text-zinc-600"
          />
          <Search size={14} className="absolute left-4 text-zinc-600" />
          {loading && (
            <div className="absolute right-4 h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
          )}
        </div>

        <div className="mt-2 space-y-1 max-h-60 overflow-y-auto pr-1">
          {suggestions.length > 0 ? (
            suggestions.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="flex w-full flex-col p-3 rounded-xl border border-transparent hover:border-zinc-800 bg-zinc-900/10 hover:bg-zinc-900/40 text-left transition-all group animate-in fade-in duration-150"
              >
                <span className="text-xs font-bold text-zinc-300 group-hover:text-white truncate">{product.name}</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mt-1">{product.brand} · {product.type}</span>
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