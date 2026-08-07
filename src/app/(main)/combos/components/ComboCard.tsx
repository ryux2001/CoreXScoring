"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, BarChart2, Bookmark } from 'lucide-react';
import { useCompareStore } from '@/store/useCompareStore';

interface ComboCardProps {
  combo: any;
  currency: string;
}

export default function ComboCard({ combo, currency }: ComboCardProps) {
  const isEUR = currency === 'EUR';
  const addItem = useCompareStore((state) => state.addItem);
  const removeItem = useCompareStore((state) => state.removeItem);
  const items = useCompareStore((state) => state.items);
  const [customError, setCustomError] = useState<string | null>(null);
  const symbol = isEUR ? '€' : '$';

  // Lógica interna para calcular el precio final de cada pieza (Oferta vs Base)
  const getComponentPrice = (component: any, customUsd: number | null, customEur: number | null) => {
    if (!component) return 0;
    if (isEUR) {
      return customEur !== null && customEur !== undefined ? customEur : (component.price_base_eur || 0);
    }
    return customUsd !== null && customUsd !== undefined ? customUsd : (component.price_base_usd || 0);
  };

  const cpuPrice = getComponentPrice(combo.cpu, combo.custom_price_cpu_usd, combo.custom_price_cpu_eur);
  const gpuPrice = getComponentPrice(combo.gpu, combo.custom_price_gpu_usd, combo.custom_price_gpu_eur);
  const ramPrice = getComponentPrice(combo.ram, combo.custom_price_ram_usd, combo.custom_price_ram_eur);
  
  const totalPrice = cpuPrice + gpuPrice + ramPrice;
  const isInCompare = items.some((item) => item.id === combo.id);

  useEffect(() => {
    if (!customError) return;

    const timer = setTimeout(() => setCustomError(null), 4000);
    return () => clearTimeout(timer);
  }, [customError]);

  const handleCompareClick = (event: React.MouseEvent) => {
    event.preventDefault();

    if (isInCompare) {
      removeItem(combo.id);
      return;
    }

    const result = addItem({
      ...combo,
      type: 'COMBO',
      comparisonType: 'combo',
      name: combo.title,
      brand: 'Combo',
      price: totalPrice,
      currency,
    });

    if (!result.success) {
      setCustomError(result.error || 'No se pudo anadir el combo');
    }
  };

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition-all duration-300 hover:border-zinc-600 hover:bg-zinc-900/80">
      
      {/* Cabecera de la tarjeta */}
      <div className="mb-5">
        <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
          {combo.title}
        </h3>
      </div>

      {/* Lista de Componentes */}
      <div className="flex flex-col gap-2.5 flex-1">
        {[
          { label: 'CPU', item: combo.cpu, price: cpuPrice },
          { label: 'GPU', item: combo.gpu, price: gpuPrice },
          { label: 'RAM', item: combo.ram, price: ramPrice }
        ].map((part, idx) => (
          part.item && (
            <div key={idx} className="flex items-center justify-between rounded-xl bg-black/50 p-3 border border-zinc-900/50">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                  {part.label} · {part.item.brand}
                </span>
                <span className="text-xs font-medium text-zinc-300 mt-0.5 truncate max-w-[160px]">
                  {part.item.name}
                </span>
              </div>
              <span className="text-xs font-bold text-zinc-400">
                {symbol}{part.price.toFixed(0)}
              </span>
            </div>
          )
        ))}
      </div>

      {/* Pie de la tarjeta */}
      <div className="mt-6 pt-5 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Total
            </span>
            <span className="text-lg font-black text-white mt-0.5">
              {symbol}{totalPrice.toFixed(2)}
            </span>
          </div>
          <Link 
            href={`/combos/${combo.slug}?currency=${currency}`}
            className="rounded-lg bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black transition-colors hover:bg-zinc-200 active:scale-95 text-center flex items-center justify-center"
          >
            Ver Combo
          </Link>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleCompareClick}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-3 text-xs font-bold transition-all cursor-pointer active:scale-95 ${
              isInCompare
                ? 'border-white bg-zinc-900 text-white'
                : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <BarChart2 size={14} strokeWidth={2.5} />
            COMPARAR
          </button>
          <button className="flex items-center justify-center rounded-lg border border-zinc-800 px-3 py-3 text-zinc-400 transition-all hover:bg-zinc-900 hover:text-white cursor-pointer active:scale-95">
            <Bookmark size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {customError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 rounded-xl border border-red-900/40 bg-zinc-950 px-4 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm w-[90vw]">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-950/50 border border-red-800 text-red-400">
            <AlertCircle size={12} strokeWidth={3} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-red-500">
              SISTEMA DE COMPARACION
            </span>
            <span className="text-xs font-medium text-zinc-300 tracking-tight mt-0.5 leading-tight">
              {customError}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
