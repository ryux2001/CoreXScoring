"use client";

import React, { useState, useEffect } from 'react';
import { X, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { formatReleaseDate } from '@/lib/formatReleaseDate';
import { getProductImage } from '@/lib/catalog/product-images';
import { useCatalogPriceEvaluationStore } from '@/store/useCatalogPriceEvaluationStore';
import { resolveProductPrice } from '@/lib/catalog/product-price';

interface MainInfoProps {
  product: any;
  currency?: string;
}

export default function MainInfoCard({ product, currency = 'USD' }: MainInfoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // LÓGICA DE MONEDA
  const isEUR = currency === 'EUR';
  const symbol = isEUR ? '€' : '$';
  const resolvedPrice = resolveProductPrice(product, currency);
  const initialPrice = resolvedPrice.value;

  // NUEVO: Estado para el precio evaluado dinámico
  const evaluation = useCatalogPriceEvaluationStore((state) => state.current);
  const evaluatedPrice = evaluation?.productId === String(product?.id ?? '') && evaluation.currency === (isEUR ? 'EUR' : 'USD')
    ? evaluation.price
    : initialPrice;

  useEffect(() => {
    setIsMounted(true);
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 300); 
  };

  const imageUrl = getProductImage(product);

  const getAllDetails = () => {
    const dateValue = isMounted ? formatReleaseDate(product.release_date) : "";

    const details = [{ label: "Marca", value: product.brand }, { label: "Lanzamiento", value: dateValue }];
    
    if (product.compatibility) {
      Object.entries(product.compatibility).forEach(([key, value]) => {
        details.push({ label: key.replace(/_/g, ' '), value: Array.isArray(value) ? value.join(', ') : String(value) });
      });
    }

    if (product.specs) {
      Object.entries(product.specs).forEach(([key, value]) => {
        if (key === 'processing_units' && typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([subKey, subValue]) => {
            details.push({ label: subKey.replace(/_/g, ' '), value: String(subValue) });
          });
        } else {
          details.push({ label: key.replace(/_/g, ' '), value: String(value) });
        }
      });
    }
    return details;
  };

  const details = getAllDetails();
  const displayedDetails = isExpanded ? details : details.slice(0, 8);

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-2xl transition-all duration-500">
      <div className="flex flex-row gap-5 p-5 lg:flex-col lg:p-0 lg:gap-0">
        <div className="relative flex flex-none items-center justify-center bg-black overflow-hidden rounded-2xl border border-zinc-900 w-32 h-32 p-4 lg:w-full lg:h-80 lg:rounded-none lg:border-0 lg:border-b lg:p-12">
          <span className="absolute left-4 top-4 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white z-10">
            {product.type}
          </span>
          {imageUrl && (
            <img src={imageUrl} alt={product.name} className="max-h-full max-w-full object-contain opacity-90 drop-shadow-[0_0_50px_rgba(255,255,255,0.12)]" />
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center lg:p-8 lg:pb-0">
          <h1 className="text-base font-black uppercase leading-tight tracking-tighter text-white lg:text-2xl mb-2 lg:mb-6">
            {product.name}
          </h1>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-3">
            <div className="rounded-lg border border-zinc-900 bg-black p-2 lg:p-4 lg:rounded-xl">
              <span className="text-[10px] font-black uppercase text-zinc-600 block tracking-widest lg:mb-1">
                {resolvedPrice.source === 'current' ? 'Precio actual' : 'MSRP'}
              </span>
              <div className="text-sm font-black text-white lg:text-xl">
                {!isEUR && symbol}{Number(initialPrice).toLocaleString('es-ES')}{isEUR && symbol}
              </div>
            </div>
            
            {/* PRECIO EVALUADO DINÁMICO */}
            <div className="rounded-lg border border-zinc-800 border-dashed bg-zinc-900/10 p-2 lg:p-4 lg:rounded-xl">
              <span className="text-[10px] font-black uppercase text-zinc-400 block mb-1 tracking-widest">Evaluado</span>
              <div className="text-sm font-black text-white lg:text-xl">
                {!isEUR && symbol}{Number(evaluatedPrice).toLocaleString('es-ES')}{isEUR && symbol}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 pt-2 lg:p-8 lg:pt-0">
        <button onClick={() => setIsModalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 py-4 text-[10px] font-black uppercase tracking-widest text-white lg:hidden">
          <Info size={16} /> MOSTRAR DETALLES TÉCNICOS
        </button>

        <div className="hidden lg:flex flex-col mt-8 relative">
          <h3 className="mb-4 text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">Detalles Técnicos</h3>
          <div className="space-y-3 transition-all duration-500">
            {displayedDetails.map((detail, idx) => (
              <div key={idx} className="flex justify-between border-b border-zinc-900/30 pb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 capitalize">{detail.label}</span>
                <span className="text-[11px] font-medium text-zinc-200 text-right">{detail.value}</span>
              </div>
            ))}
          </div>
          {details.length > 8 && (
            <div className="mt-6">
              {!isExpanded && <div className="pointer-events-none absolute bottom-14 left-0 h-20 w-full bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />}
              <button onClick={() => setIsExpanded(!isExpanded)} className="group flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all hover:bg-white hover:text-black">
                {isExpanded ? <><ChevronUp size={14} /> VER MENOS</> : <><ChevronDown size={14} /> VER TODO</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md lg:hidden p-6">
          <div className="absolute inset-0 z-[-1]" onClick={handleCloseModal} />
          <div className={`w-full max-h-[80vh] flex flex-col overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl ${isClosing ? 'animate-out fade-out zoom-out-95 duration-300' : 'animate-in fade-in zoom-in-95 duration-300'}`}>
            <div className="flex-none flex items-center justify-between border-b border-zinc-900 bg-zinc-950 p-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-white">Detalles Técnicos</h2>
              <button onClick={handleCloseModal} className="rounded-full bg-zinc-900 p-2 text-zinc-400"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 pb-10">
              <div className="space-y-4">
                {details.map((detail, idx) => (
                  <div key={idx} className="flex flex-col gap-1 border-b border-zinc-900/50 pb-3 last:border-0 last:pb-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{detail.label}</span>
                    <span className="text-sm font-bold text-zinc-100">{detail.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
