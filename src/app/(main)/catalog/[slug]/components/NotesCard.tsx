"use client";

import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { convertPrice } from '@/lib/currency';
import { getComponentNotes } from '@/lib/scoring/index';

interface NotesCardProps {
  product: any;
  currency?: string;
  onSwitchView?: () => void;       // NUEVO PROP OPCIONAL
  currentMobileView?: 'numeric';  // NUEVO PROP OPCIONAL
}

export default function NotesCard({ product, currency = 'USD', onSwitchView }: NotesCardProps) {
  const isEUR = currency === 'EUR';
  const priceColumn = isEUR ? 'price_base_eur' : 'price_base_usd';
  const initialPrice = product[priceColumn] || 0;
  const symbol = isEUR ? '€' : '$';

  const [evaluatedPrice, setEvaluatedPrice] = useState(initialPrice);
  const [isMounted, setIsMounted] = useState(false);
  const [precioUSD, setPrecioUSD] = useState(initialPrice);

  // 1. Calcular nota de calidad/precio al montar (antes del render)
  useEffect(() => {
    setIsMounted(true);
    setEvaluatedPrice(initialPrice);
    setPrecioUSD(convertPrice(initialPrice, currency, 'USD'));

    const handlePriceUpdate = (e: any) => {
      setEvaluatedPrice(e.detail);
      setPrecioUSD(convertPrice(e.detail, currency, 'USD'));
    };

    window.addEventListener('updateProductPrice', handlePriceUpdate);
    return () => window.removeEventListener('updateProductPrice', handlePriceUpdate);
  }, [initialPrice, currency, product]);

  // Obtenemos las 5 notas principales (el precio ya está en USD)
  const baseNotes = getComponentNotes(product, precioUSD);
  
  // Extraemos solo los nombres (las llaves del objeto) para el mapeo del grid
  const categories = Object.keys(baseNotes);

  const getColorStyles = (score: number) => {
    if (score >= 9) return {
      border: 'border-blue-500/50',
      bg: 'bg-blue-950/30',
      text: 'text-blue-400',
      bar: 'bg-blue-500',
      label: 'text-blue-500/70'
    };
    if (score >= 7) return {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-950/30',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      label: 'text-emerald-500/70'
    };
    if (score >= 3) return {
      border: 'border-yellow-500/50',
      bg: 'bg-yellow-950/30',
      text: 'text-yellow-400',
      bar: 'bg-yellow-500',
      label: 'text-yellow-500/70'
    };
    return {
      border: 'border-red-500/50',
      bg: 'bg-red-950/30',
      text: 'text-red-400',
      bar: 'bg-red-500',
      label: 'text-red-500/70'
    };
  };

  const formatPrice = (val: number) => {
    return `${!isEUR ? symbol : ''}${Number(val).toLocaleString('es-ES')}${isEUR ? symbol : ''}`;
  };

  return (
    <div className="flex flex-col p-6 lg:p-8 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl h-full justify-between overflow-hidden">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 shrink-0">
            Notas
          </h3>
          
          <div className="hidden sm:flex items-center gap-2 whitespace-nowrap bg-zinc-900/30 px-3 py-1 rounded-full border border-zinc-900/50">
            <span className="text-[8px] font-black uppercase tracking-[0.1em] text-zinc-600">Precio Evaluado:</span>
            <span className="text-xs font-black text-zinc-400">
               {isMounted ? formatPrice(evaluatedPrice) : '---'}
            </span>
            <span className="text-[9px] font-bold text-zinc-600 uppercase ml-1">{currency}</span>
          </div>
        </div>
        
        {/* GRUPO DE ACCIONES DEL HEADER (INFO + TOGGLE MÓVIL) */}
        <div className="flex items-center gap-3">
          {/* Botón de intercambio: Solo se renderiza si se pasa el prop onSwitchView */}
          {onSwitchView && (
            <button 
              onClick={onSwitchView}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/60 text-[8px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all active:scale-95"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ver Radar
            </button>
          )}

          <div className="group relative">
            <div className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:text-white">
              <Info size={11} strokeWidth={3} />
            </div>
            <div className="invisible absolute right-0 top-7 z-[10000] w-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
              <div className="mb-2 font-bold text-white uppercase tracking-widest text-[9px]">Criterios de Evaluación</div>
              <p>Las notas se calculan comparando las especificaciones técnicas con el estándar actual del mercado.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CUERPO: GRID DINÁMICO */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((cat, idx) => {
          // Obtenemos el número real desde el objeto baseNotes usando el nombre como llave
          const score = baseNotes[cat] || 0;
          const styles = getColorStyles(score);

          return (
            <div 
              key={idx}
              className={`group relative flex flex-col justify-between items-center py-3 px-3 rounded-2xl border transition-all min-h-[100px] ${styles.border} ${styles.bg}`}
            >
              {/* Título */}
              <div className="text-center h-6 flex items-center justify-center">
                <p className={`text-[8px] font-black uppercase tracking-widest transition-colors leading-tight ${styles.label}`}>
                  {cat}
                </p>
              </div>

              {/* Número real del script */}
              <div className="text-center">
                <p className={`text-[26px] font-black tracking-tighter ${styles.text}`}>
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
        <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest leading-tight text-center lg:text-left">
          * Todas las evaluaciones se basan en el rendimiento relativo frente a la competencia.
        </p>
      </div>
    </div>
  );
}
