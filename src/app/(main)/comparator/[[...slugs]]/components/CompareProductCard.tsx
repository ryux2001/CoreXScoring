"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { useCompareStore } from "@/store/useCompareStore";
import { getComponentNotes } from "@/lib/scoring/index";
import { getComboNotes } from "@/lib/scoringCombos";
import {
  applyComboPriceOverrides,
  getComboPartPrice,
  getComboTotalPrice,
  isComboItem,
} from "./comparisonUtils";
import type { ComboPartKey, ComboPriceOverrides } from "./comparisonUtils";

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
  comboPriceOverrides?: ComboPriceOverrides;
  setComboPriceOverrides?: (overrides: ComboPriceOverrides) => void;
  maxScores: Record<string, number>;
  masterCategories: string[];
}

type NotesMap = Record<string, number>;
type ComboPriceDraft = Partial<Record<ComboPartKey, string>>;

const comboParts: Array<{ key: ComboPartKey; label: string }> = [
  { key: "cpu", label: "CPU" },
  { key: "gpu", label: "GPU" },
  { key: "ram", label: "RAM" },
];

function getLocalImage(item: any) {
  if (!item?.type || !item?.brand) return null;

  const basePath = "/images/catalog/";
  const type = item.type.toLowerCase();
  const brand = item.brand.toLowerCase();

  if (type === "cpu") {
    if (brand.includes("intel")) return `${basePath}processor-intel.webp`;
    if (brand.includes("amd")) return `${basePath}processor-amd.webp`;
  }
  if (type === "gpu") {
    if (brand.includes("nvidia")) return `${basePath}graphics_card-nvidia.webp`;
    if (brand.includes("amd")) return `${basePath}graphics_card-amd.webp`;
    if (brand.includes("intel")) return `${basePath}graphics_card-intel.webp`;
  }
  if (type === "ram") return `${basePath}ram-ddr5.webp`;
  if (type === "storage") return `${basePath}ssd-m2.webp`;
  if (type === "motherboard") return `${basePath}motherboard-atx.webp`;
  if (type === "psu") return `${basePath}psu-atx.webp`;

  return null;
}

export default function CompareProductCard({
  product,
  globalCurrency,
  displayedPrice,
  setDisplayedPrice,
  comboPriceOverrides = {},
  setComboPriceOverrides,
  maxScores,
  masterCategories,
}: CompareProductCardProps) {
  const removeItem = useCompareStore((state) => state.removeItem);
  const itemsCount = useCompareStore((state) => state.items.length);
  const isCombo = isComboItem(product);
  const isEUR = globalCurrency === "EUR";
  const symbol = isEUR ? "€" : "$";
  const priceColumn = isEUR ? "price_base_eur" : "price_base_usd";
  const basePrice = isCombo ? displayedPrice : product[priceColumn] || product.price || 0;

  const [customPrice, setCustomPrice] = useState(basePrice);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [draftComboPrices, setDraftComboPrices] = useState<ComboPriceDraft>({});

  useEffect(() => {
    if (!isCombo) setCustomPrice(basePrice);
  }, [basePrice, isCombo]);

  const format = (value: number) =>
    `${isEUR ? "" : symbol}${Number(value).toFixed(0)}${isEUR ? symbol : ""}`;

  const effectiveCombo = useMemo(
    () => applyComboPriceOverrides(product, globalCurrency, comboPriceOverrides),
    [product, globalCurrency, comboPriceOverrides],
  );

  const precioUSD = useMemo(
    () => (isEUR ? displayedPrice * 1.08 : displayedPrice),
    [displayedPrice, isEUR],
  );

  const baseNotes = useMemo<NotesMap>(
    () => (isCombo
      ? getComboNotes(effectiveCombo, globalCurrency) || {}
      : getComponentNotes(product, precioUSD) || {}) as NotesMap,
    [effectiveCombo, globalCurrency, isCombo, precioUSD, product],
  );

  const categories = Object.keys(baseNotes);
  const calidadPrecioKey = categories.find(
    (category) =>
      category.toLowerCase().includes("precio") ||
      category.toLowerCase().includes("price") ||
      category.toLowerCase().includes("calidad"),
  );
  const finalScore = calidadPrecioKey ? baseNotes[calidadPrecioKey] || 0 : 0;

  const getColorStyles = (score: number) => {
    if (score >= 9) {
      return { border: "border-blue-500/30", bg: "bg-blue-950/20", text: "text-blue-400", label: "text-blue-500/70" };
    }
    if (score >= 7) {
      return { border: "border-emerald-500/30", bg: "bg-emerald-950/20", text: "text-emerald-400", label: "text-emerald-500/70" };
    }
    if (score >= 3) {
      return { border: "border-yellow-500/30", bg: "bg-yellow-950/20", text: "text-yellow-400", label: "text-yellow-500/70" };
    }
    return { border: "border-red-500/30", bg: "bg-red-950/20", text: "text-red-400", label: "text-red-500/70" };
  };

  const valueStyles = getColorStyles(finalScore);

  const openCustomizeModal = () => {
    const currentPrices = comboParts.reduce<ComboPriceDraft>((prices, part) => {
      prices[part.key] = String(getComboPartPrice(product, part.key, globalCurrency, comboPriceOverrides));
      return prices;
    }, {});
    setDraftComboPrices(currentPrices);
    setIsCustomizeOpen(true);
  };

  const applyComboPrices = () => {
    const numericPrices = comboParts.reduce<ComboPriceOverrides>((prices, part) => {
      const rawValue = draftComboPrices[part.key]?.trim();
      if (rawValue) {
        const numericValue = Number(rawValue);
        if (Number.isFinite(numericValue)) prices[part.key] = numericValue;
      }
      return prices;
    }, {});

    setComboPriceOverrides?.(numericPrices);
    setIsCustomizeOpen(false);
  };

  const draftNumericPrices = comboParts.reduce<ComboPriceOverrides>((prices, part) => {
    const rawValue = draftComboPrices[part.key]?.trim();
    if (rawValue) {
      const numericValue = Number(rawValue);
      if (Number.isFinite(numericValue)) prices[part.key] = numericValue;
    }
    return prices;
  }, {});

  return (
    <div className="relative flex flex-col justify-between p-2 md:p-6 h-full w-1/2 shrink-0 snap-start md:w-full md:shrink min-h-[600px] group animate-in fade-in duration-300">
      <button
        onClick={() => removeItem(product.id)}
        className="absolute top-4 right-4 z-10 rounded-full bg-zinc-900/80 p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer active:scale-95"
      >
        <X size={13} strokeWidth={2.5} />
      </button>

      <div className="flex flex-col gap-2">
        {isCombo ? (
          <>
            <div className="px-1 mb-3">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">
                {product.category || "Combo"}
              </span>
              <h3 className="mt-1 text-sm font-black tracking-tight text-white leading-snug">
                {product.title || product.name}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full">
              {comboParts.map((part) => {
                const component = product[part.key];
                const imageSrc = getLocalImage(component);

                return (
                  <div key={part.key} className="flex flex-col gap-1.5 min-w-0">
                    <div className="relative aspect-square rounded-2xl border border-zinc-900 bg-zinc-900/20 overflow-hidden flex items-center justify-center">
                      {imageSrc ? (
                        <img src={imageSrc} alt={component?.name || part.label} className="h-full w-full object-contain opacity-80" />
                      ) : (
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">Imagen</span>
                      )}
                    </div>
                    <span className="truncate text-[8px] font-bold text-zinc-400 text-center" title={component?.name}>
                      {component?.name || part.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Precio total</span>
                <span className="text-base font-black text-white tracking-tight">{format(displayedPrice)}</span>
              </div>
              <button
                onClick={openCustomizeModal}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-zinc-300 hover:border-zinc-600 hover:text-white transition-all"
              >
                Personalizar precio
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-full">
              {getLocalImage(product) && (
                <div className="relative aspect-square w-full overflow-hidden flex items-center justify-center">
                  <img
                    src={getLocalImage(product) || undefined}
                    alt={product.name}
                    className="h-full w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full items-stretch md:items-end">
              <div className="flex flex-col gap-3 flex-1 w-full max-w-[320px]">
                <div className="space-y-1">
                  <label className="text-[7px] font-black uppercase tracking-widest text-zinc-600 ml-0.5">
                    Escriba un precio...
                  </label>
                  <div className="flex gap-1 h-[36px] items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600">{symbol}</span>
                      <input
                        type="number"
                        value={customPrice === 0 ? "" : customPrice}
                        onChange={(event) => setCustomPrice(Number(event.target.value))}
                        className="h-[38px] w-full rounded-xl border border-zinc-900 bg-black/40 p-2 pl-6 pr-6 text-[10px] font-bold text-white outline-none transition-all focus:border-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <button
                      onClick={() => setDisplayedPrice(customPrice)}
                      className="h-[36px] px-2 rounded-xl bg-white text-black text-[8px] font-black uppercase tracking-widest transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer shrink-0"
                    >
                      aplicar
                    </button>
                  </div>
                </div>
              </div>

              <Link
                href={`/product/${product.slug}?currency=${globalCurrency}`}
                className="flex-none w-full md:w-25 h-9 flex items-center justify-center text-center rounded-xl border border-zinc-900 bg-zinc-900/20 hover:bg-zinc-900 hover:text-white text-[9px] font-black uppercase tracking-widest text-zinc-400 py-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                ver producto
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-zinc-900/50 flex flex-col justify-between flex-1">
        <div className="text-left">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-4">Notas</h4>
          <div className="flex flex-col gap-3.5 pl-1">
            {masterCategories.map((category) => {
              const currentScore = Number(baseNotes[category] || 0);
              const isHighest = itemsCount > 1 && currentScore === (maxScores[category] || 0) && currentScore > 0;

              return (
                <div key={category} className="flex items-center gap-3 animate-in fade-in duration-200">
                  <span className="text-xs font-black text-white tracking-tighter min-w-[22px]">{currentScore.toFixed(1)}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-medium flex items-center gap-1.5 select-none">
                    {category}
                    {isHighest && <span className="text-emerald-400 font-black text-xs leading-none animate-in zoom-in-50 duration-300 ml-0.5">^</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`mt-6 p-3.5 rounded-xl border transition-all duration-300 flex items-center justify-between ${valueStyles.bg} ${valueStyles.border}`}>
          <div className="flex flex-col text-left">
            <span className={`text-[7.5px] font-black uppercase tracking-[0.2em] ${valueStyles.label}`}>EVALUACIÓN GLOBAL</span>
            <span className="text-[10px] font-bold text-zinc-200 tracking-tight mt-0.5 uppercase">Calidad Precio</span>
          </div>
          <div className={`flex h-9 w-11 items-center justify-center rounded-lg bg-zinc-950 border border-zinc-900 text-sm font-black tracking-tighter shadow-xl transition-colors duration-300 ${valueStyles.text}`}>
            {finalScore.toFixed(1)}
          </div>
        </div>
      </div>

      {isCombo && isCustomizeOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Personalizar precio</h3>
              <button onClick={() => setIsCustomizeOpen(false)} className="rounded-full bg-zinc-900 p-2 text-zinc-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {comboParts.map((part) => (
                <label key={part.key} className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  <span>{part.label}</span>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">{symbol}</span>
                    <input
                      type="number"
                      value={draftComboPrices[part.key] ?? ""}
                      onChange={(event) => setDraftComboPrices((previous) => ({ ...previous, [part.key]: event.target.value }))}
                      className="w-full rounded-xl border border-zinc-900 bg-black px-3 py-2 pl-7 text-xs font-bold text-white outline-none focus:border-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-zinc-900 pt-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Total</span>
              <span className="text-sm font-black text-white">
                {format(getComboTotalPrice(product, globalCurrency, draftNumericPrices))}
              </span>
            </div>
            <button onClick={applyComboPrices} className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-[9px] font-black uppercase tracking-widest text-black hover:bg-zinc-200 transition-colors">
              Aplicar precios
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
