"use client";

import React, { useState } from 'react';
import { Info, ChevronDown } from 'lucide-react';

interface PriceCustomProps {
  product: any;
  currency?: string;
}

export default function PriceCustomCard({ product, currency = 'USD' }: PriceCustomProps) {

  const isEUR = currency === 'EUR';
  const priceColumn = isEUR ? 'price_base_eur' : 'price_base_usd';
  const basePrice = product[priceColumn] || 0;
  const symbol = isEUR ? '€' : '$';
  
  const [selectedMarket, setSelectedMarket] = useState(basePrice);
  const [customPrice, setCustomPrice] = useState(basePrice);

  const format = (val: number) => `${isEUR ? '' : symbol}${val.toFixed(0)}${isEUR ? symbol : ''}`;

  return (
    <div className="flex flex-col p-4 lg:p-5 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl h-fit">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
          Evaluación de Precio
        </h3>
        
        <div className="group relative">
          <div className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors group-hover:border-zinc-600 group-hover:text-white">
            <Info size={10} strokeWidth={3} />
          </div>
          
          <div className="invisible absolute right-0 top-7 z-50 w-64 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
            <div className="mb-2 font-bold text-white uppercase tracking-widest text-[10px]">Información</div>
            Ajusta el precio para recalcular automáticamente la relación Calidad/Precio en base al mercado actual.
          </div>
        </div>
      </div>

      {/* INPUTS */}
      <div className="space-y-3">
        
        {/* SELECT: PRECIOS DE MERCADO */}
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-700 ml-1">
            Precios de Mercado
          </label>
          <div className="relative">
            <select 
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-zinc-900 bg-black p-3 text-xs font-bold text-white outline-none transition-all focus:border-zinc-700"
            >
              <option value={basePrice}>MSRP - {format(basePrice)}</option>
              <option value={basePrice * 1.15}>Amazon - {format(basePrice * 1.15)}</option>
              <option value={basePrice * 0.9}>Oferta - {format(basePrice * 0.9)}</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* INPUT: PRECIO PERSONALIZADO */}
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-700 ml-1">
            Precio Personalizado
          </label>
          <div className="relative">
            {/* Símbolo dinámico (ahora siempre visible con el símbolo correcto) */}
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-600">
              {symbol}
            </span>
            
            <input 
              type="number"
              min="0"
              max="10000"
              value={customPrice}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 0 && val <= 10000) setCustomPrice(val);
              }}
              /* 1. Eliminamos las flechas con appearance-none y clases específicas de webkit */
              className="w-full rounded-xl border border-zinc-900 bg-black p-3 pl-7 text-xs font-bold text-white outline-none transition-all focus:border-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0.00"
            />
            
            {/* 2. Mostramos el código de moneda (USD/EUR) a la derecha para mayor claridad */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-600 uppercase tracking-tighter">
              {currency}
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <div className="mt-3 pt-3 border-t border-zinc-900/50">
        <p className="text-[8px] text-zinc-700 uppercase tracking-wider leading-tight">
          * Evalúa la <span className="text-zinc-600 font-bold">Calidad/Precio</span>.
        </p>
      </div>
    </div>
  );
} 