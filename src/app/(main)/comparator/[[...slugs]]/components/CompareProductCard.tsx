"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useCompareStore } from "@/store/useCompareStore";
import { getComponentNotes } from "@/lib/scoring/index"; // 🚀 Tu motor de scoring real

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

export default function CompareProductCard({
  product,
  globalCurrency,
}: CompareProductCardProps) {
  const removeItem = useCompareStore((state) => state.removeItem);

  // 🪙 GESTIÓN DE DIVISAS Y PRECIOS
  const isEUR = globalCurrency === "EUR";
  const priceColumn = isEUR ? "price_base_eur" : "price_base_usd";
  const basePrice = product[priceColumn] || product.price || 0; //
  const symbol = isEUR ? "€" : "$"; //
  const currencyCode = isEUR ? "EUR" : "USD";

  const [selectedMarket, setSelectedMarket] = useState(basePrice); //
  const [customPrice, setCustomPrice] = useState(basePrice); //
  const [displayedPrice, setDisplayedPrice] = useState(basePrice);

  useEffect(() => {
    setSelectedMarket(basePrice); //
    setCustomPrice(basePrice); //
    setDisplayedPrice(basePrice);
  }, [basePrice]);

  const format = (val: number) =>
    `${isEUR ? "" : symbol}${val.toFixed(0)}${isEUR ? symbol : ""}`; //

  const handleApply = () => {
    setDisplayedPrice(customPrice);
  };

  // 🧮 🚀 CORRECCIÓN CRÍTICA DEL MOTOR DE SCORING (2 parámetros como en NotesCard)
  const precioUSD = useMemo(
    () => (isEUR ? displayedPrice * 1.08 : displayedPrice),
    [displayedPrice, isEUR],
  ); //
  const baseNotes = useMemo(
    () => getComponentNotes(product, precioUSD) || {},
    [product, precioUSD],
  ); //

  // Extraemos todas las categorías (mismo enfoque que NotesCard.tsx)
  const categories = Object.keys(baseNotes);

  // Buscador de la clave "Calidad Precio" (independiente de cómo esté escrita en tu JSON)
  const calidadPrecioKey = categories.find(
    (cat) =>
      cat.toLowerCase().includes("precio") ||
      cat.toLowerCase().includes("price") ||
      cat.toLowerCase().includes("calidad"),
  );

  // Extraemos la nota global de Calidad Precio
  const finalScore = calidadPrecioKey ? baseNotes[calidadPrecioKey] || 0 : 0;

  // Filtramos para quedarnos únicamente con las notas técnicas (excluyendo calidad precio)
  const technicalNotes = categories.filter((cat) => cat !== calidadPrecioKey);

  // 🎨 ESTILOS CROMÁTICOS DINÁMICOS EXTRAÍDOS DE TU NOTESCARD
  const getColorStyles = (score: number) => {
    if (score >= 9)
      return {
        //
        border: "border-blue-500/30",
        bg: "bg-blue-950/20",
        text: "text-blue-400",
        label: "text-blue-500/70",
      };
    if (score >= 7)
      return {
        //
        border: "border-emerald-500/30",
        bg: "bg-emerald-950/20",
        text: "text-emerald-400",
        label: "text-emerald-500/70",
      };
    if (score >= 3)
      return {
        //
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
    <div className="relative flex flex-col justify-between p-6 h-full w-full min-h-[600px] group animate-in fade-in duration-300">
      {/* Botón de descarte superior derecho (X) */}
      <button
        onClick={() => removeItem(product.id)}
        className="absolute top-4 right-4 z-10 rounded-full bg-zinc-900/80 p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer active:scale-95"
      >
        <X size={13} strokeWidth={2.5} />
      </button>

      {/* --- BLOQUE SUPERIOR (Identidad + Imagen + Controles) --- */}
      <div className="flex flex-col gap-5">
        <div className="text-left pr-6">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">
            {product.brand} · {product.type}
          </span>
          <h2 className="text-xs font-black text-white tracking-tight mt-0.5 line-clamp-1 leading-snug">
            {product.name}
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          {/* Imagen que escala al ancho */}
          <div className="flex items-center justify-center w-full">
            {imageSrc && (
              <div className="relative aspect-square w-full overflow-hidden flex items-center justify-center">
                <img
                  src={imageSrc}
                  alt={product.name}
                  className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </div>
            )}
          </div>

          {/* Controles de Precio */}
          <div className="flex gap-3 w-full">
            {/* Input + Botón */}
            <div className="flex flex-col gap-3 flex-1 max-w-[320px]">
              <div className="space-y-1">
                <label className="text-[7px] font-black uppercase tracking-widest text-zinc-600 ml-0.5">
                  Escriba un precio...
                </label>
                <div className="flex gap-1 h-[36px] items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
                      {isEUR ? "€" : "$"}
                    </span>
                    <input
                      type="number"
                      value={customPrice === 0 ? "" : customPrice} //[cite: 1]
                      onChange={(e) => setCustomPrice(Number(e.target.value))} //[cite: 1]
                      className="h-[38px] w-full rounded-xl border border-zinc-900 bg-black/40 p-2 pl-6 pr-6 text-[10px] font-bold text-white outline-none transition-all focus:border-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <button
                    onClick={handleApply}
                    className="h-[36px] px-2 rounded-xl bg-white text-black text-[8px] font-black uppercase tracking-widest transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer"
                  >
                    aplicar
                  </button>{" "}
                  {/*[cite: 1] */}
                </div>
              </div>
            </div>

            {/* Link */}
            <Link
              href={`/product/${product.slug}?currency=${globalCurrency}`}
              className="flex-none w-25 h-9 flex items-center justify-center mt-auto text-center rounded-xl border border-zinc-900 bg-zinc-900/20 hover:bg-zinc-900 hover:text-white text-[9px] font-black uppercase tracking-widest text-zinc-400 py-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              ver producto
            </Link>
          </div>
        </div>
      </div>

      {/* --- PARTE INFERIOR TOTALMENTE FIEL A IMAGE_8ACF72.PNG --- */}
      <div className="mt-8 pt-6 border-t border-zinc-900/50 flex flex-col justify-between flex-1">
        {/* Bloque "Notas" + Lista Vertical Limpia */}
        <div className="text-left">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-4">
            Notas
          </h4>

          <div className="flex flex-col gap-3.5 pl-1">
            {technicalNotes.map((cat) => {
              const currentScore = Number(baseNotes[cat] || 0);
              return (
                <div
                  key={cat}
                  className="flex items-center gap-3 animate-in fade-in duration-200"
                >
                  {/* Puntuación */}
                  <span className="text-xs font-black text-white tracking-tighter min-w-[22px]">
                    {currentScore.toFixed(1)}
                  </span>
                  {/* Etiqueta de la categoría */}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-medium">
                    {cat}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Módulo Destacado de Calidad Precio al pie de la columna */}
        <div
          className={`mt-6 p-3.5 rounded-xl border transition-all duration-300 flex items-center justify-between ${valueStyles.bg} ${valueStyles.border}`}
        >
          <div className="flex flex-col text-left">
            <span
              className={`text-[7.5px] font-black uppercase tracking-[0.2em] ${valueStyles.label}`}
            >
              EVALUACIÓN GLOBAL
            </span>
            <span className="text-[10px] font-bold text-zinc-200 tracking-tight mt-0.5 uppercase">
              Precio evaluado: {format(displayedPrice)}
            </span>
          </div>

          <div
            className={`flex h-9 w-11 items-center justify-center rounded-lg bg-zinc-950 border border-zinc-900 text-sm font-black tracking-tighter shadow-xl transition-colors duration-300 ${valueStyles.text}`}
          >
            {finalScore.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}
