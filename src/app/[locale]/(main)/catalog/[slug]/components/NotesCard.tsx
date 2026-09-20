"use client";

import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { convertPrice } from '@/lib/currency';
import { getComponentNotes } from '@/lib/scoring/index';
import {
  type GpuValueProfile,
} from '@/lib/scoring/components/calculations/gpu/profiles';
import {
  type CpuValueProfile,
} from '@/lib/scoring/components/calculations/cpu/profiles';
import { useCatalogPriceEvaluationStore } from '@/store/useCatalogPriceEvaluationStore';
import { getProductPrice } from '@/lib/catalog/product-price';
import { getCatalogScoreLabelKey } from '@/lib/catalog/presentation';
import { useLocale, useTranslations } from 'next-intl';

type ValueProfile = GpuValueProfile | CpuValueProfile;

interface NotesCardProps {
  product: any;
  currency?: string;
  onSwitchView?: () => void;       // NUEVO PROP OPCIONAL
  currentMobileView?: 'numeric';  // NUEVO PROP OPCIONAL
}

export default function NotesCard({ product, currency = 'USD', onSwitchView }: NotesCardProps) {
  const t = useTranslations('catalog');
  const locale = useLocale();
  const isEUR = currency === 'EUR';
  const isGpu = String(product?.type ?? '').toUpperCase() === 'GPU';
  const isCpu = String(product?.type ?? '').toUpperCase() === 'CPU';
  const initialPrice = getProductPrice(product, currency);
  const initialPriceUSD = convertPrice(initialPrice, currency, 'USD');
  const symbol = isEUR ? '€' : '$';

  const evaluation = useCatalogPriceEvaluationStore((state) => state.current);
  const isCurrentEvaluation = evaluation?.productId === String(product?.id ?? '') && evaluation.currency === (isEUR ? 'EUR' : 'USD');
  const evaluatedPrice = isCurrentEvaluation ? evaluation.price : initialPrice;
  const precioUSD = isCurrentEvaluation ? evaluation.priceUsd : initialPriceUSD;
  const [isMounted, setIsMounted] = useState(false);
  const valueProfile: ValueProfile = isCurrentEvaluation && evaluation?.valueProfile
    ? evaluation.valueProfile as ValueProfile
    : 'balanced';

  // 1. Calcular nota de calidad/precio al montar (antes del render)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Obtenemos las 5 notas principales (el precio ya está en USD)
  const baseNotes = getComponentNotes(
    product,
    precioUSD,
    isGpu || isCpu ? valueProfile : undefined,
  );
  
  // Extraemos solo los nombres (las llaves del objeto) para el mapeo del grid
  const categories = Object.keys(baseNotes);

  const getColorStyles = (score: number) => {
    if (score >= 9) return {
      border: 'border-purple-500/50',
      bg: 'bg-purple-950/30',
      text: 'text-purple-300',
      bar: 'bg-purple-500',
      label: 'text-purple-300'
    };
    if (score >= 7) return {
      border: 'border-blue-500/50',
      bg: 'bg-blue-950/30',
      text: 'text-blue-400',
      bar: 'bg-blue-500',
      label: 'text-blue-400'
    };
    if (score >= 5) return {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-950/30',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      label: 'text-emerald-400'
    };
    if (score >= 3) return {
      border: 'border-yellow-500/50',
      bg: 'bg-yellow-950/30',
      text: 'text-yellow-400',
      bar: 'bg-yellow-500',
      label: 'text-yellow-400'
    };
    return {
      border: 'border-red-500/50',
      bg: 'bg-red-950/30',
      text: 'text-red-400',
      bar: 'bg-red-500',
      label: 'text-red-400'
    };
  };

  const formatPrice = (val: number) => {
    return `${!isEUR ? symbol : ''}${Number(val).toLocaleString(locale)}${isEUR ? symbol : ''}`;
  };

  return (
    <div className="flex flex-col p-6 lg:p-8 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl h-full justify-between overflow-visible">
      
      {/* HEADER */}
      <div className="relative mb-8">
        <div className="flex min-w-0 flex-wrap items-center gap-6 pr-28">
          <h3 className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 shrink-0">
             {t('scores')}
          </h3>
          
          <div className="hidden sm:flex items-center gap-2 whitespace-nowrap bg-zinc-900/30 px-3 py-1 rounded-full border border-zinc-900/50">
             <span className="text-[11px] font-black uppercase tracking-[0.1em] text-zinc-600">{t('evaluatedPrice')}</span>
            <span className="text-xs font-display font-black text-zinc-400">
               {isMounted ? formatPrice(evaluatedPrice) : '---'}
            </span>
            <span className="text-[12px] font-bold text-zinc-600 uppercase ml-1 mt-0.5">{currency}</span>
          </div>
        </div>
        
        {/* GRUPO DE ACCIONES DEL HEADER (INFO + TOGGLE MÓVIL) */}
        <div className="absolute right-0 top-0 flex items-center gap-3">
          {/* Botón de intercambio: Solo se renderiza si se pasa el prop onSwitchView */}
          {onSwitchView && (
            <button 
              onClick={onSwitchView}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/60 text-[8px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all active:scale-95"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               {t('viewRadar')}
            </button>
          )}

          <div className="group relative">
            <button
              type="button"
               aria-label={t('evaluationCriteriaInfoLabel')}
              className="flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/70"
            >
              <Info size={11} strokeWidth={3} />
            </button>
            <div className="invisible absolute right-0 top-9 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[12px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
               <div className="mb-2 font-bold text-white uppercase tracking-widest text-[12px]">{t('evaluationCriteria')}</div>
              <div className="mb-3 space-y-1 text-[12px]">
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-purple-500" /><span>{t('colorCriteria.purple')}</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" /><span>{t('colorCriteria.blue')}</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /><span>{t('colorCriteria.green')}</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-yellow-500" /><span>{t('colorCriteria.yellow')}</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-red-500" /><span>{t('colorCriteria.red')}</span></div>
              </div>
               <p>{t('evaluationCriteriaDescription')}</p>
               <p className="mt-2">{t('evaluationCriteriaDisclaimer')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CUERPO: GRID DINÁMICO */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4 lg:gap-2 lg:grid-cols-6">
        {categories.map((cat, idx) => {
          // Obtenemos el número real desde el objeto baseNotes usando el nombre como llave
          const score = baseNotes[cat] || 0;
          const styles = getColorStyles(score);

          return (
            <div 
              key={idx}
              className={`font-display group relative flex flex-col justify-between items-center py-3 px-3 rounded-2xl border transition-all min-h-[100px] ${styles.border} ${styles.bg}`}
            >
              {/* Título */}
              <div className="flex h-6 items-center justify-center text-center">
                <p className={`text-[8px] font-black uppercase tracking-widest leading-tight ${styles.label}`}>
                   {t(getCatalogScoreLabelKey(cat))}
                </p>
              </div>

              {/* Número real del script */}
              <div className="text-center">
                <p className={`font-bold text-[32px] leading-none tracking-[-0.03em] tabular-nums ${styles.text}`}>
                  {score.toFixed(1)}
                </p>
              </div>

              {/* Barra proporcional al número real */}
              <div className="w-1/2 h-[2px] bg-zinc-900 rounded-full overflow-hidden">
                 <div 
                   className={`h-full transition-all duration-1000 ${styles.bar}`} 
                   style={{ width: `${score * 10}%` }} 
                 />
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="mt-8 pt-4 border-t border-zinc-900/20">
        <p className="text-[10px] font-bold uppercase tracking-widest leading-tight text-zinc-500 text-center lg:text-left">
           {t('evaluationsNote')}
        </p>
      </div>
    </div>
  );
}
