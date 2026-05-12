"use client";

import React, { useState, useEffect } from 'react';
import { Info, ChevronDown, X, Settings2 } from 'lucide-react';

interface PriceCustomProps {
  product: any;
  currency?: string;
}

export default function PriceCustomCard({ product, currency = 'USD' }: PriceCustomProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const isEUR = currency === 'EUR';
  const priceColumn = isEUR ? 'price_base_eur' : 'price_base_usd';
  const basePrice = product[priceColumn] || 0;
  const symbol = isEUR ? '€' : '$';
  
  const [selectedMarket, setSelectedMarket] = useState(basePrice);
  const [customPrice, setCustomPrice] = useState(basePrice);

  // Sincronización y bloqueo de scroll
  useEffect(() => {
    setSelectedMarket(basePrice);
    setCustomPrice(basePrice);

    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [basePrice, isModalOpen]);

  const format = (val: number) => `${isEUR ? '' : symbol}${val.toFixed(0)}${isEUR ? symbol : ''}`;

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 300);
  };

  const handleApply = () => {
    const event = new CustomEvent('updateProductPrice', { detail: customPrice });
    window.dispatchEvent(event);
    if (isModalOpen) handleCloseModal();
  };

  // El contenido del formulario lo extraemos para reutilizarlo en desktop y modal
  const PriceForm = () => (
    <div className="space-y-4">
      {/* PRECIOS ALTERNATIVOS */}
      <div className="space-y-1.5">
        <label className="text-[8px] font-black uppercase tracking-widest text-zinc-700 ml-1">
          Precios Alternativos
        </label>
        <div className="relative">
          <select 
            value={selectedMarket}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSelectedMarket(val);
              setCustomPrice(val);
            }}
            className="w-full appearance-none rounded-xl border border-zinc-900 bg-black p-3 text-xs font-bold text-white outline-none transition-all focus:border-zinc-700"
          >
            <option value={basePrice}>MSRP - {format(basePrice)}</option>
            <option value={basePrice * 1.15}>Estimado Alto (+15%) - {format(basePrice * 1.15)}</option>
            <option value={basePrice * 0.9}>Estimado Bajo (-10%) - {format(basePrice * 0.9)}</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600">
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* PRECIO PERSONALIZADO */}
      <div className="space-y-1.5">
        <label className="text-[8px] font-black uppercase tracking-widest text-zinc-700 ml-1">
          Precio Personalizado
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-600">
              {symbol}
            </span>
            <input 
              type="number"
              value={customPrice}
              onChange={(e) => setCustomPrice(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-900 bg-black p-3 pl-7 text-xs font-bold text-white outline-none transition-all focus:border-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-600 uppercase tracking-tighter">
              {currency}
            </div>
          </div>
          <button 
            onClick={handleApply}
            className="px-4 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest transition-all hover:bg-zinc-200 active:scale-95"
          >
            APLICAR
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* --- VERSIÓN DESKTOP (Visible solo en LG) --- */}
      <div className="hidden lg:flex flex-col p-6 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl h-full justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Evaluación de Precio</h3>
            <div className="group relative">
              <div className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-white transition-colors">
                <Info size={10} strokeWidth={3} />
              </div>
              <div className="invisible absolute right-0 top-7 z-50 w-64 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                Ajusta el precio para recalcular automáticamente la relación Calidad/Precio.
              </div>
            </div>
          </div>
        </div>

        <PriceForm />

        <div className="pt-3 border-t border-zinc-900/50">
          <p className="text-[8px] text-zinc-700 uppercase tracking-wider leading-tight">
            * Evalúa la <span className="text-zinc-600 font-bold">Calidad/Precio</span>.
          </p>
        </div>
      </div>

      {/* --- VERSIÓN MÓVIL (Botón que dispara Modal) --- */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="lg:hidden flex w-full items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 py-4 text-[11px] font-black uppercase tracking-[0.15em] text-white active:scale-[0.98] transition-all"
      >
        <Settings2 size={16} />
        Personalizar Precio
      </button>

      {/* --- MODAL DE PRECIO (Móvil) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 lg:hidden">
          <div className="absolute inset-0 z-[-1]" onClick={handleCloseModal} />
          
          <div className={`w-full max-w-sm flex flex-col overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl ${isClosing ? 'animate-out fade-out zoom-out-95 duration-300' : 'animate-in fade-in zoom-in-95 duration-300'}`}>
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-zinc-900 p-5">
              <div className="flex items-center gap-2">
                <Settings2 size={14} className="text-zinc-500" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-white">Ajustar Evaluación</h2>
              </div>
              <button onClick={handleCloseModal} className="rounded-full bg-zinc-900 p-2 text-zinc-400">
                <X size={18} />
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="p-6">
              <PriceForm />
              <p className="mt-6 text-center text-[9px] text-zinc-600 uppercase tracking-widest leading-relaxed">
                El cambio se verá reflejado en la <br/> tarjeta principal del producto.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}