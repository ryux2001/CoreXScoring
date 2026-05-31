"use client";

import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import Link from 'next/link'; // 🚀 Importado para redirigir a la vista del producto
import { useCompareStore } from '@/store/useCompareStore';

interface CompareProductCardProps {
  product: {
    id: string | number;
    slug: string;
    type: string;
    brand: string;
    name: string;
    price?: number;
    currency?: string;
    price_base_eur?: number;
    price_base_usd?: number;
    [key: string]: any;
  };
  globalCurrency: string;
}

export default function CompareProductCard({ product, globalCurrency }: CompareProductCardProps) {
  const removeItem = useCompareStore((state) => state.removeItem);

  // 🪙 LÓGICA DE PRECIOS ADAPTADA DE PRICECUSTOMCARD
  const isEUR = globalCurrency === "EUR"; // Mandas tú, no el objeto de Zustand
  const priceColumn = isEUR ? "price_base_eur" : "price_base_usd";
  const basePrice = product[priceColumn] || product.price || 0; // Si no hay columna, cae al precio por defecto
  const symbol = isEUR ? "€" : "$";
  const currencyCode = isEUR ? "EUR" : "USD"

  const [selectedMarket, setSelectedMarket] = useState(basePrice);
  const [customPrice, setCustomPrice] = useState(basePrice);
  const [displayedPrice, setDisplayedPrice] = useState(basePrice); // Almacena el valor evaluado final

  // Sincronizar estados si cambia el componente base
  useEffect(() => {
    setSelectedMarket(basePrice);
    setCustomPrice(basePrice);
    setDisplayedPrice(basePrice);
  }, [basePrice]);

  const format = (val: number) =>
    `${isEUR ? "" : symbol}${val.toFixed(0)}${isEUR ? symbol : ""}`;

  const handleApply = () => {
    setDisplayedPrice(customPrice);
    // Nota: Aquí se podrá emitir un CustomEvent o callback global en el futuro para recalcular el score
  };

  const getLocalImage = () => {
    if (!product.type || !product.brand) return null;
    const basePath = '/images/catalog/';
    const t = product.type.toLowerCase();
    const b = product.brand.toLowerCase();

    if (t === 'cpu') {
      if (b.includes('intel')) return `${basePath}processor-intel.webp`;
      if (b.includes('amd')) return `${basePath}processor-amd.webp`;
    }
    if (t === 'gpu') {
      if (b.includes('nvidia')) return `${basePath}graphics_card-nvidia.webp`;
      if (b.includes('amd')) return `${basePath}graphics_card-amd.webp`;
      if (b.includes('intel')) return `${basePath}graphics_card-intel.webp`;
    }
    if (t === 'ram') return `${basePath}ram-ddr5.webp`;
    if (t === 'storage') return `${basePath}ssd-m2.webp`;
    if (t === 'motherboard') return `${basePath}motherboard-atx.webp`;
    if (t === 'psu') return `${basePath}psu-atx.webp`;
    
    return null;
  };

  const imageSrc = getLocalImage();

  return (
    <div className="relative flex flex-col justify-between p-6 h-full w-full min-h-[420px] group animate-in fade-in duration-300">
      
      {/* Botón de descarte superior derecho (X) */}
      <button 
        onClick={() => removeItem(product.id)}
        className="absolute top-4 right-4 z-10 rounded-full bg-zinc-900/80 p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer active:scale-95"
      >
        <X size={13} strokeWidth={2.5} />
      </button>

      {/* --- PARTE SUPERIOR TOTALMENTE REESTRUCTURADA --- */}
      <div className="flex flex-col flex-1 gap-5">
        
        {/* FILA 1: Nombre del producto arriba del todo */}
        <div className="text-left pr-6">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">
            {product.brand} · {product.type}
          </span>
          <h2 className="text-xs font-black text-white tracking-tight mt-0.5 line-clamp-1 leading-snug">
            {product.name}
          </h2>
        </div>

        {/* REJILLA INTERMEDIA: Mitad Izquierda (Imagen) | Mitad Derecha (Precio Módulos) */}
        <div className="grid grid-cols-2 gap-4 items-center my-auto">
          
          {/* 1. MITAD IZQUIERDA: Contenedor de la Imagen */}
          <div className="flex items-center justify-center">
            {imageSrc && (
              <div className="relative w-32 h-32 md:w-36 md:h-36 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 ease-out">
                <img 
                  src={imageSrc} 
                  alt={product.name}
                  className="object-contain max-w-full max-h-full drop-shadow-[0_0_25px_rgba(255,255,255,0.03)]"
                />
              </div>
            )}
          </div>

          {/* 2. MITAD DERECHA: Selectores de Precio y Botón de Navegación */}
          <div className="flex flex-col gap-3 text-left">
            
            {/* Desplegable de Precios Alternativos */}
            <div className="space-y-1">
              <label className="text-[7px] font-black uppercase tracking-widest text-zinc-600 ml-0.5">
                Seleccione un pre...
              </label>
              <div className="relative">
                <select
                  value={selectedMarket}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSelectedMarket(val);
                    setCustomPrice(val);
                    setDisplayedPrice(val);
                  }}
                  className="w-full appearance-none rounded-xl border border-zinc-900 bg-black/40 p-2 pr-7 text-[10px] font-bold text-white outline-none transition-all focus:border-zinc-700"
                >
                  <option value={basePrice}>MSRP - {format(basePrice)}</option>[cite: 1]
                  <option value={basePrice * 1.15}>Alto (+15%) - {format(basePrice * 1.15)}</option>
                  <option value={basePrice * 0.9}>Bajo (-10%) - {format(basePrice * 0.9)}</option>
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600">
                  <ChevronDown size={12} />
                </div>
              </div>
            </div>

            {/* Input Manual + Botón Aplicar */}
            <div className="space-y-1">
              <label className="text-[7px] font-black uppercase tracking-widest text-zinc-600 ml-0.5">
                Escriba un pre...
              </label>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
                    {symbol}
                  </span>
                  <input
                    type="number"
                    value={customPrice === 0 ? "" : customPrice}
                    onChange={(e) => setCustomPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-900 bg-black/40 p-2 pl-4.5 pr-6 text-[10px] font-bold text-white outline-none transition-all focus:border-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[6px] font-black text-zinc-600 uppercase">
                    {currencyCode}
                  </div>
                </div>
                <button
                  onClick={handleApply}
                  className="px-2 rounded-xl bg-white text-black text-[8px] font-black uppercase tracking-widest transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer"
                >
                  aplicar
                </button>
              </div>
            </div>

            {/* Bloque de Información de Evaluación y Enlace Directo */}
            <div className="mt-1 pt-2 border-t border-zinc-900/40 flex flex-col gap-2">
              <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                Evaluado: <span className="text-white font-bold tracking-tight normal-case text-xs ml-1">{format(displayedPrice)}</span>
              </div>
              
              <Link
                href={`/product/${product.slug}`}
                className="w-full text-center rounded-xl border border-zinc-900 bg-zinc-900/20 hover:bg-zinc-900 hover:text-white text-[9px] font-black uppercase tracking-widest text-zinc-400 py-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                ver producto
              </Link>
            </div>

          </div>

        </div>

      </div>

      {/* --- PARTE INFERIOR: Notas (Mantenida intacta tal cual la pediste) --- */}
      <div className="mt-4 pt-4 border-t border-zinc-900/60 flex items-center justify-between px-1">
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">
          nota
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-black text-white shadow-inner">
          8
        </div>
      </div>

    </div>
  );
}