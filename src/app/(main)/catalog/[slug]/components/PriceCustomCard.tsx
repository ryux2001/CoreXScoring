"use client";

import React, { useState } from 'react';
import { Info, ChevronDown } from 'lucide-react';

interface PriceCustomProps {
  product: any;
}

export default function PriceCustomCard({ product }: PriceCustomProps) {
  const basePrice = product.price_base_usd || 0;
  
  const [selectedMarket, setSelectedMarket] = useState(basePrice);
  const [customPrice, setCustomPrice] = useState(basePrice);

  return (
    <div className="flex flex-col p-4 lg:p-5 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl h-fit">
      
      {/* HEADER: mb-4 para reducir el salto al contenido */}
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

      {/* INPUTS: space-y-3 para pegar más los dos bloques */}
      <div className="space-y-3">
        
        {/* SELECT */}
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
              <option value={basePrice}>MSRP - ${basePrice}</option>
              <option value={basePrice * 1.15}>Amazon - ${(basePrice * 1.15).toFixed(0)}</option>
              <option value={basePrice * 0.9}>Oferta - ${(basePrice * 0.9).toFixed(0)}</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* INPUT PERSONALIZADO */}
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-700 ml-1">
            Precio Personalizado
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-600">
              $
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
              className="w-full rounded-xl border border-zinc-900 bg-black p-3 pl-7 text-xs font-bold text-white outline-none transition-all focus:border-zinc-700"
              placeholder="0.00"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-800 uppercase tracking-tighter">
              USD
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER: pt-3 para minimizar el espacio al final */}
      <div className="mt-3 pt-3 border-t border-zinc-900/50">
        <p className="text-[8px] text-zinc-700 uppercase tracking-wider leading-tight">
          * Evalúa la <span className="text-zinc-600 font-bold">Calidad/Precio</span>.
        </p>
      </div>
    </div>
  );
}