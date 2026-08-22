"use client";

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ArrowRightLeft } from 'lucide-react';
import { setCurrencyPreference } from '@/lib/currency';

interface ComboCurrencyToggleProps {
  currentCurrency: string;
}

export default function ComboCurrencyToggle({ currentCurrency }: ComboCurrencyToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleToggle = () => {
    // Clonamos los parámetros de búsqueda actuales para no perder filtros si los hay en el futuro
    const params = new URLSearchParams(searchParams.toString());
    const nextCurrency: 'USD' | 'EUR' = currentCurrency === 'USD' ? 'EUR' : 'USD';
    setCurrencyPreference(nextCurrency);
    
    params.set("currency", nextCurrency);
    
    // Empujamos la nueva URL. Al estar en App Router, esto refrescará el Server Component de forma reactiva.
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <button 
      onClick={handleToggle}
      className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 transition-all hover:border-zinc-600 hover:bg-zinc-900 cursor-pointer active:scale-95 shadow-lg"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-colors group-hover:text-zinc-400">
          Moneda activa:
        </span>
        <span className="text-xs font-black text-white">
          {currentCurrency}
        </span>
      </div>
      <ArrowRightLeft size={14} className="text-zinc-600 transition-colors group-hover:text-white" />
    </button>
  );
}
