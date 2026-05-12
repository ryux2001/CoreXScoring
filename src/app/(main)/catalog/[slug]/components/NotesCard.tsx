"use client";

import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';

interface NotesCardProps {
  product: any;
  currency?: string;
}

export default function NotesCard({ product, currency = 'USD' }: NotesCardProps) {
  const isEUR = currency === 'EUR';
  const priceColumn = isEUR ? 'price_base_eur' : 'price_base_usd';
  const initialPrice = product[priceColumn] || 0;
  const symbol = isEUR ? '€' : '$';

  const [evaluatedPrice, setEvaluatedPrice] = useState(initialPrice);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setEvaluatedPrice(initialPrice);

    const handlePriceUpdate = (e: any) => {
      setEvaluatedPrice(e.detail);
    };

    window.addEventListener('updateProductPrice', handlePriceUpdate);
    return () => window.removeEventListener('updateProductPrice', handlePriceUpdate);
  }, [initialPrice]);

  const getCategories = (type: string) => {
    const t = type?.toUpperCase();
    switch (t) {
      case 'CPU':
      case 'GPU':
        return ['Potencia', 'Tecnologías', 'Productividad', 'Juegos', 'Eficiencia', 'Calidad precio'];
      case 'RAM':
        return ['Velocidad', 'Tecnologías', 'Latencia', 'Compatibilidad', 'Eficiencia', 'Calidad precio'];
      case 'STORAGE':
        return ['Velocidad', 'Tecnologías', 'Temperaturas', 'Durabilidad', 'Eficiencia', 'Calidad Precio'];
      case 'MOTHERBOARD':
        return ['Conectividad', 'Tecnologías', 'Construcción', 'Compatibilidad', 'Estabilidad', 'Calidad precio'];
      case 'PSU':
        return ['Estabilidad', 'Conectividad', 'Protecciones', 'Construcción', 'Eficiencia', 'Calidad Precio'];
      default:
        return ['Rendimiento', 'Características', 'Construcción', 'Eficiencia', 'Calidad precio'];
    }
  };

  const categories = getCategories(product.type);

  const formatPrice = (val: number) => {
    return `${!isEUR ? symbol : ''}${Number(val).toLocaleString('es-ES')}${isEUR ? symbol : ''}`;
  };

  return (
    <div className="flex flex-col p-6 lg:p-8 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl h-full justify-between overflow-hidden">
      
      {/* HEADER: Precio Evaluado movido arriba y alineado */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 shrink-0">
            Notas de Evaluación
          </h3>
          
          {/* Precio Evaluado en una sola línea */}
          <div className="hidden sm:flex items-center gap-2 whitespace-nowrap bg-zinc-900/30 px-3 py-1 rounded-full border border-zinc-900/50">
            <span className="text-[8px] font-black uppercase tracking-[0.1em] text-zinc-700">Precio Evaluado:</span>
            <span className="text-xs font-black text-zinc-400">
               {isMounted ? formatPrice(evaluatedPrice) : '---'}
            </span>
            <span className="text-[9px] font-bold text-zinc-800 uppercase ml-1">{currency}</span>
          </div>
        </div>
        
        <div className="group relative">
          <div className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:text-white">
            <Info size={11} strokeWidth={3} />
          </div>
          <div className="invisible absolute right-0 top-7 z-[9999] w-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
            <div className="mb-2 font-bold text-white uppercase tracking-widest text-[9px]">Criterios de Evaluación</div>
            <p>Las notas se calculan comparando las especificaciones técnicas con el estándar actual del mercado.</p>
          </div>
        </div>
      </div>

      {/* CUERPO: GRID DE NOTAS CON CAJAS MÁS GRANDES Y SIMÉTRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
        {categories.map((cat, idx) => (
          <div 
            key={idx}
            className="group relative flex flex-col justify-between items-center py-3 px-3 rounded-2xl border border-zinc-900 bg-black/40 transition-all hover:border-zinc-700 hover:bg-zinc-900/20 min-h-[100px]"
          >
            {/* Título de la nota con altura mínima para evitar saltos si hay 2 líneas */}
            <div className="text-center h-6 flex items-center justify-center">
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors leading-tight">
                {cat}
              </p>
            </div>

            {/* Número central con tamaño ligeramente reducido */}
            <div className="text-center">
              <p className="text-[26px] font-black text-white tracking-tighter">
                7.5
              </p>
            </div>

            {/* Pequeña barra decorativa */}
            <div className="w-1/2 h-[2px] bg-zinc-900 rounded-full overflow-hidden">
               <div className="h-full bg-zinc-700 w-[75%]" />
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER: Texto informativo sutil */}
      <div className="mt-8 pt-4 border-t border-zinc-900/20">
        <p className="text-[8px] text-zinc-700 uppercase tracking-widest leading-tight text-center lg:text-left">
          * Todas las evaluaciones se basan en el rendimiento relativo frente a la competencia.
        </p>
      </div>
    </div>
  );
}