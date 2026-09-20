"use client";

import React, { useState, useEffect } from 'react'; // 🚀 Importamos useState y useEffect
import { BarChart2, AlertCircle } from 'lucide-react'; // 🚀 Añadimos un icono de alerta si quieres
import { useCompareStore } from '@/store/useCompareStore';
import { getComparisonErrorMessage } from '@/lib/comparison-errors';
import { useTranslations } from 'next-intl';

interface CompareButtonProps {
  id: string | number;
  slug: string;
  type: string;
  brand: string;
  name: string;
  price: number;
  currency: string;
  specs: any;
  compatibility: any;
  release_date?: string | null;
}

export default function CompareButton(product: CompareButtonProps) {
  const t = useTranslations('common');
  const addItem = useCompareStore((state) => state.addItem);
  const removeItem = useCompareStore((state) => state.removeItem);
  const items = useCompareStore((state) => state.items);

  // 🚀 ESTADO PARA NUESTRA ALERTA PERSONALIZADA
  const [customError, setCustomError] = useState<string | null>(null);

  const isInCompare = items.some((item) => item.id === product.id);
  // 🚀 TEMPORIZADOR: Limpia el mensaje automáticamente después de 4 segundos
  useEffect(() => {
    if (customError) {
      const timer = setTimeout(() => {
        setCustomError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [customError]);

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault(); 
    
    if (isInCompare) {
      removeItem(product.id);
    } else {
      const result = addItem(product);
      if (!result.success) {
        // 🚀 En lugar de alert(), guardamos el error en nuestro estado local
         setCustomError(getComparisonErrorMessage(result.error, t));
      }
    }
  };

  return (
    <>
      <button
        onClick={handleCompareClick}
        className={`font-display flex-1 flex items-center justify-center gap-1 rounded-lg border py-2 text-[10px] font-bold transition-all cursor-pointer active:scale-95 sm:gap-2 sm:py-3 sm:text-xs ${
          isInCompare 
            ? "border-white bg-zinc-900 text-white" 
            : "border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white"
        }`}
      >
        <BarChart2 size={14} strokeWidth={2.5} />
        {t('compare')}
      </button>

      {/* 👑 TU NUEVA ALERTA PERSONALIZADA (ESTILO CYBERPUNK/TECHNICAL) */}
      {customError && (
        <div role="alert" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 rounded-xl border border-red-900/40 bg-zinc-950 px-4 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm w-[90vw]">
          {/* Indicador de Alerta */}
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-950/50 border border-red-800 text-red-400">
            <AlertCircle size={12} strokeWidth={3} />
          </div>
          
          {/* Mensaje de Error */}
          <div className="flex flex-col min-w-0">
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-red-500">
              {t('comparisonSystem')}
            </span>
            <span className="font-technical mt-0.5 text-xs font-medium leading-tight tracking-tight text-zinc-300">
              {customError}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
