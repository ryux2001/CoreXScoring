"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useCompareStore } from "@/store/useCompareStore";
import { getComponentNotes } from "@/lib/scoring/index";

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
  displayedPrice: number; 
  setDisplayedPrice: (price: number) => void; 
  maxScores: Record<string, number>; 
  masterCategories: string[]; // 🚀 NUEVO PROP: Recibe el molde unificado del padre
}

export default function CompareProductCard({
  product,
  globalCurrency,
  displayedPrice,
  setDisplayedPrice,
  maxScores,
  masterCategories, // 🚀 Desestructurado
}: CompareProductCardProps) {
  const removeItem = useCompareStore((state) => state.removeItem);
  const itemsCount = useCompareStore((state) => state.items.length);

  // 🪙 GESTIÓN DE DIVISAS Y PRECIOS
  const isEUR = globalCurrency === "EUR";
  const priceColumn = isEUR ? "price_base_eur" : "price_base_usd";
  const basePrice = product[priceColumn] || product.price || 0; 
  const symbol = isEUR ? "€" : "$"; 
  const currencyCode = isEUR ? "EUR" : "USD";

  const [selectedMarket, setSelectedMarket] = useState(basePrice); 
  const [customPrice, setCustomPrice] = useState(displayedPrice); 

  useEffect(() => {
    setSelectedMarket(basePrice); 
    setCustomPrice(displayedPrice);
  }, [basePrice, displayedPrice]);

  const format = (val: number) =>
    `${isEUR ? "" : symbol}${val.toFixed(0)}${isEUR ? symbol : ""}`; 

  const handleApply = () => {
    setDisplayedPrice(customPrice); 
  };

  // 🧮 MOTOR DE SCORING NATIVO
  const precioUSD = useMemo(
    () => (isEUR ? displayedPrice * 1.08 : displayedPrice),
    [displayedPrice, isEUR],
  ); 
  const baseNotes = useMemo(
    () => getComponentNotes(product, precioUSD) || {},
    [product, precioUSD],
  ); 

  const categories = Object.keys(baseNotes);

  const calidadPrecioKey = categories.find(
    (cat) =>
      cat.toLowerCase().includes("precio") ||
      cat.toLowerCase().includes("price") ||
      cat.toLowerCase().includes("calidad"),
  );

  const finalScore = calidadPrecioKey ? baseNotes[calidadPrecioKey] || 0 : 0;

  // 🎨 ESTILOS CROMÁTICOS DINÁMICOS
  const getColorStyles = (score: number) => {
    if (score >= 9)
      return {
        border: "border-blue-500/30",
        bg: "bg-blue-950/20",
        text: "text-blue-400",
        label: "text-blue-500/70",
      };
    if (score >= 7)
      return {
        border: "border-emerald-500/30",
        bg: "bg-emerald-950/20",
        text: "text-emerald-400",
        label: "text-emerald-500/70",
      };
    if (score >= 3)
      return {
        border: "border-yellow-500/30",
        bg: "bg-yellow-950/20",
        text: "text-yellow-400",
        label: "text-yellow-500/70",
      };
    return {
      border: "border-red-500/30",
      bg: "bg-red-950/20",
      text: "text-red-400",
      label: "text-red-500/70",
    };
  };

  const valueStyles = getColorStyles(finalScore);

  const getLocalImage = () => {
    if (!product.type || !product.brand) return null;
    const basePath = "/images/catalog/";
    const t = product.type.toLowerCase();
    const b = product.brand.toLowerCase();

    if (t === "cpu") {
      if (b.includes("intel")) return `${basePath}processor-intel.webp`;
      if (b.includes("amd")) return `${basePath}processor-amd.webp`;
    }
    if (t === "gpu") {
      if (b.includes("nvidia")) return `${basePath}graphics_card-nvidia.webp`;
      if (b.includes("amd")) return `${basePath}graphics_card-amd.webp`;
      if (b.includes("intel")) return `${basePath}graphics_card-intel.webp`;
    }
    if (t === "ram") return `${basePath}ram-ddr5.webp`;
    if (t === "storage") return `${basePath}ssd-m2.webp`;
    if (t === "motherboard") return `${basePath}motherboard-atx.webp`;
    if (t === "psu") return `${basePath}psu-atx.webp`;

    return null;
  };

  const imageSrc = getLocalImage();

  return (
    <div className="relative flex flex-col justify-between p-2 md:p-6 h-full w-1/2 shrink-0 snap-start md:w-full md:shrink min-h-[600px] group animate-in fade-in duration-300">
      <button
        onClick={() => removeItem(product.id)}
        className="absolute top-4 right-4 z-10 rounded-full bg-zinc-900/80 p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer active:scale-95"
      >
        <X size={13} strokeWidth={2.5} />
      </button>

      {/* --- BLOQUE SUPERIOR (Identidad + Imagen + Controles) --- */}
      <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center w-full">
            {imageSrc && (
              <div className="relative aspect-square w-full overflow-hidden flex items-center justify-center">
                <img
                  src={imageSrc}
                  alt={product.name}
                  className="h-full w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </div>
            )}
          </div>

          {/* 📱 SOLUCIÓN: Apilado vertical en móviles, horizontal en escritorio */}
          <div className="flex flex-col md:flex-row gap-3 w-full items-stretch md:items-end">
            <div className="flex flex-col gap-3 flex-1 w-full max-w-[320px]">
              <div className="space-y-1">
                <label className="text-[7px] font-black uppercase tracking-widest text-zinc-600 ml-0.5">
                  Escriba un precio...
                </label>
                <div className="flex gap-1 h-[36px] items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
                      {symbol}
                    </span>
                    <input
                      type="number"
                      value={customPrice === 0 ? "" : customPrice}
                      onChange={(e) => setCustomPrice(Number(e.target.value))}
                      className="h-[38px] w-full rounded-xl border border-zinc-900 bg-black/40 p-2 pl-6 pr-6 text-[10px] font-bold text-white outline-none transition-all focus:border-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <button
                    onClick={handleApply}
                    className="h-[36px] px-2 rounded-xl bg-white text-black text-[8px] font-black uppercase tracking-widest transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer shrink-0"
                  >
                    aplicar
                  </button>
                </div>
              </div>
            </div>

            {/* 📱 En móvil ocupa el ancho completo del espacio disponible; en escritorio vuelve a w-25 */}
            <Link
              href={`/product/${product.slug}?currency=${globalCurrency}`}
              className="flex-none w-full md:w-25 h-9 flex items-center justify-center text-center rounded-xl border border-zinc-900 bg-zinc-900/20 hover:bg-zinc-900 hover:text-white text-[9px] font-black uppercase tracking-widest text-zinc-400 py-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              ver producto
            </Link>
          </div>
        </div>

      {/* --- PARTE INFERIOR (Notas unificadas por el molde maestro) --- */}
      <div className="mt-8 pt-6 border-t border-zinc-900/50 flex flex-col justify-between flex-1">
        <div className="text-left">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-4">
            Notas
          </h4>

          <div className="flex flex-col gap-3.5 pl-1">
            {/* 🚀 Recorremos el 'masterCategories' enviado por el padre */}
            {masterCategories.map((cat) => {
              // Si la categoría existe en este componente, extrae su nota; si no, por seguridad cae a 0.0
              const currentScore = Number(baseNotes[cat] || 0);
              
              // El indicador '^' se activa comparando contra el valor real unificado
              const isHighest = itemsCount > 1 && currentScore === (maxScores[cat] || 0) && currentScore > 0;

              return (
                <div
                  key={cat}
                  className="flex items-center gap-3 animate-in fade-in duration-200"
                >
                  <span className="text-xs font-black text-white tracking-tighter min-w-[22px]">
                    {currentScore.toFixed(1)}
                  </span>
                  
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-medium flex items-center gap-1.5 select-none">
                    {cat}
                    {isHighest && (
                      <span className="text-emerald-400 font-black text-xs leading-none animate-in zoom-in-50 duration-300 ml-0.5">
                        ^
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`mt-6 p-3.5 rounded-xl border transition-all duration-300 flex items-center justify-between ${valueStyles.bg} ${valueStyles.border}`}>
          <div className="flex flex-col text-left">
            <span className={`text-[7.5px] font-black uppercase tracking-[0.2em] ${valueStyles.label}`}>
              EVALUACIÓN GLOBAL
            </span>
            <span className="text-[10px] font-bold text-zinc-200 tracking-tight mt-0.5 uppercase">
              Calidad Precio
            </span>
          </div>

          <div className={`flex h-9 w-11 items-center justify-center rounded-lg bg-zinc-950 border border-zinc-900 text-sm font-black tracking-tighter shadow-xl transition-colors duration-300 ${valueStyles.text}`}>
            {finalScore.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}