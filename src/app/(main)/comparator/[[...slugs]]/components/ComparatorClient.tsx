"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useCompareStore } from '@/store/useCompareStore';
import { getComponentNotes } from '@/lib/scoring/index'; 
import EmptyState from './EmptyState';
import SearchModal from './SearchModal';
import CompareProductCard from './CompareProductCard';

interface ComparatorClientProps {
  initialProducts: any[];
  globalCurrency: string; 
}

export default function ComparatorClient({ initialProducts, globalCurrency }: ComparatorClientProps) {
  const router = useRouter();
  
  const items = useCompareStore((state) => state.items);
  const clearCompare = useCompareStore((state) => state.clearCompare);
  const addItem = useCompareStore((state) => state.addItem);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [evaluatedPrices, setEvaluatedPrices] = useState<Record<string | number, number>>({});

  useEffect(() => {
    if (initialProducts.length > 0 && items.length === 0) {
      initialProducts.forEach((product) => {
        const isTargetEUR = globalCurrency === 'EUR';
        const priceColumn = isTargetEUR ? 'price_base_eur' : 'price_base_usd';
        addItem({
          ...product,
          price: product[priceColumn] || 0,
          currency: globalCurrency
        });
      });
    }
  }, [initialProducts, globalCurrency]);

  useEffect(() => {
    if (items.length === 0) {
      router.replace('/comparator', { scroll: false });
    } else {
      const pathSlugs = items.map(item => item.slug).join('/');
      router.replace(`/comparator/${pathSlugs}?currency=${globalCurrency}`, { scroll: false });
    }
  }, [items, router, globalCurrency]);

  // 🧮 LÓGICA DE GANADORES GLOBALES
  const maxScoresByCategory = useMemo(() => {
    const maxes: Record<string, number> = {};

    items.forEach((item) => {
      const isTargetEUR = globalCurrency === 'EUR';
      const priceColumn = isTargetEUR ? 'price_base_eur' : 'price_base_usd';
      const basePrice = item[priceColumn] || item.price || 0;
      const currentPrice = evaluatedPrices[item.id] !== undefined ? evaluatedPrices[item.id] : basePrice;
      const precioUSD = isTargetEUR ? currentPrice * 1.08 : currentPrice;
      
      const notes = getComponentNotes(item, precioUSD) || {};

      Object.entries(notes).forEach(([category, score]) => {
        const numScore = Number(score) || 0;
        if (maxes[category] === undefined || numScore > maxes[category]) {
          maxes[category] = numScore;
        }
      });
    });

    return maxes;
  }, [items, evaluatedPrices, globalCurrency]);

  // 👑 NUEVA LÓGICA MAESTRA: Crea el molde único de filas técnicas según el componente actual
  const masterCategories = useMemo(() => {
    const categoriesSet = new Set<string>();

    items.forEach((item) => {
      const isTargetEUR = globalCurrency === 'EUR';
      const priceColumn = isTargetEUR ? 'price_base_eur' : 'price_base_usd';
      const basePrice = item[priceColumn] || item.price || 0;
      const currentPrice = evaluatedPrices[item.id] !== undefined ? evaluatedPrices[item.id] : basePrice;
      const precioUSD = isTargetEUR ? currentPrice * 1.08 : currentPrice;
      
      const notes = getComponentNotes(item, precioUSD) || {};
      
      Object.keys(notes).forEach((cat) => {
        const isCalidadPrecio = cat.toLowerCase().includes("precio") || 
                                cat.toLowerCase().includes("price") || 
                                cat.toLowerCase().includes("calidad");
        if (!isCalidadPrecio) {
          categoriesSet.add(cat); // Guardamos solo las notas técnicas puras
        }
      });
    });

    return Array.from(categoriesSet);
  }, [items, evaluatedPrices, globalCurrency]);

  if (items.length === 0) {
    return (
      <>
        <EmptyState onOpenModal={() => setIsModalOpen(true)} />
        <SearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  const hasSpace = items.length < 3;
  const totalColumns = hasSpace ? items.length + 1 : 3;
  
  const maxWidthClass = totalColumns === 2 ? "max-w-2xl" : "max-w-5xl";

  return (
    <div className="flex flex-col items-center w-full px-4 py-8 animate-in fade-in duration-300">
      
      {/* EL CONTENEDOR MAESTRO UNIFICADO */}
      <div className={`w-full ${maxWidthClass} bg-zinc-950/50 border border-zinc-900 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ease-out`}>
        
        {/* REJILLA INTERNA */}
        <div className={`grid grid-cols-1 divide-y divide-zinc-900 md:divide-y-0 md:divide-x md:divide-zinc-900`}
             style={{ gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))` }}>
          
          {items.map((item) => {
            const isTargetEUR = globalCurrency === 'EUR';
            const priceColumn = isTargetEUR ? 'price_base_eur' : 'price_base_usd';
            const basePrice = item[priceColumn] || item.price || 0;
            const currentPrice = evaluatedPrices[item.id] !== undefined ? evaluatedPrices[item.id] : basePrice;

            return (
              <CompareProductCard 
                key={item.id} 
                product={item} 
                globalCurrency={globalCurrency}
                displayedPrice={currentPrice}
                setDisplayedPrice={(newPrice) => setEvaluatedPrices(prev => ({ ...prev, [item.id]: newPrice }))}
                maxScores={maxScoresByCategory}
                masterCategories={masterCategories} // 🚀 Pasamos la lista unificada de filas
              />
            );
          })}

          {hasSpace && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex flex-col items-center justify-center p-6 h-full min-h-[380px] w-full text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/10 transition-all duration-300 group cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-zinc-800 bg-zinc-950 text-zinc-500 group-hover:text-white group-hover:border-zinc-700 transition-colors">
                <Plus size={16} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] mt-4">
                Añadir Componente
              </span>
            </button>
          )}
        </div>

      </div>

      {/* BOTÓN INFERIOR DE RESETEO */}
      <div className="mt-12 flex justify-center">
        <button 
          onClick={() => {
            setEvaluatedPrices({});
            clearCompare();
          }}
          className="rounded-xl border border-zinc-900 hover:border-red-900/20 bg-zinc-950/40 px-5 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:text-red-400 transition-all cursor-pointer active:scale-95"
        >
          Limpiar Todo
        </button>
      </div>

      <SearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}