"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // 🚀 Corregido el import aquí
import { useCompareStore } from '@/store/useCompareStore';
import EmptyState from './EmptyState';
import SearchModal from './SearchModal';

interface ComparatorClientProps {
  initialProducts: any[];
}

export default function ComparatorClient({ initialProducts }: ComparatorClientProps) {
  const router = useRouter();
  
  const items = useCompareStore((state) => state.items);
  const clearCompare = useCompareStore((state) => state.clearCompare);
  const addItem = useCompareStore((state) => state.addItem);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🔄 Hidratar el store si venimos de un enlace SEO con parámetros en la carpeta
  useEffect(() => {
    if (initialProducts.length > 0 && items.length === 0) {
      initialProducts.forEach((product) => {
        const priceColumn = product.price_base_eur ? 'price_base_eur' : 'price_base_usd';
        addItem({
          ...product,
          price: product[priceColumn] || 0,
          currency: product.price_base_eur ? 'EUR' : 'USD'
        });
      });
    }
  }, [initialProducts]);

  // 🔄 Sincronizar el store con la URL de la carpeta limpia
  useEffect(() => {
    if (items.length === 0) {
      router.replace('/comparator', { scroll: false });
    } else {
      const pathSlugs = items.map(item => item.slug).join('/');
      router.replace(`/comparator/${pathSlugs}`, { scroll: false });
    }
  }, [items, router]);

  if (items.length === 0) {
    return (
      <>
        <EmptyState onOpenModal={() => setIsModalOpen(true)} />
        <SearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-300 w-full max-w-4xl">
      <h1 className="text-sm md:text-xl font-black uppercase tracking-[0.2em] text-zinc-400 flex flex-wrap items-center justify-center gap-3 leading-relaxed">
        {items.map((item, idx) => (
          <React.Fragment key={item.id}>
            {idx > 0 && <span className="text-zinc-700 font-medium lowercase tracking-normal px-1">vs</span>}
            <span className="text-white border-b border-zinc-900 pb-1">{item.name}</span>
          </React.Fragment>
        ))}
      </h1>

      <div className="mt-12 flex gap-4">
        {items.length < 3 && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl border border-zinc-800 hover:border-white/20 bg-zinc-950 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all cursor-pointer"
          >
            + Añadir Componente
          </button>
        )}
        <button 
          onClick={() => clearCompare()}
          className="rounded-xl border border-zinc-900 hover:border-red-900/30 bg-black px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-red-400 transition-all cursor-pointer"
        >
          Limpiar Todo
        </button>
      </div>

      <SearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}