"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import Link from "next/link";
import { useCompareStore } from "@/store/useCompareStore";
import { getComponentNotes } from "@/lib/scoring";
import { getComboNotes } from "@/lib/scoringCombos";
import { getBuildNotes } from "@/lib/scoringBuilds";
import { convertPrice } from "@/lib/currency";
import { getProductImage } from "@/lib/catalog/product-images";
import { getComponentIcon } from "@/lib/catalog/component-icons";
import {
  applyBuildPriceOverrides,
  applyComboPriceOverrides,
  getBuildPartPrice,
  getBuildTotalPrice,
  getComboPartPrice,
  getComboTotalPrice,
  isBuildItem,
  isComboItem,
} from "./comparisonUtils";
import type {
  BuildPartKey,
  BuildPriceOverrides,
  ComboPartKey,
  ComboPriceOverrides,
} from "./comparisonUtils";

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
  buildPriceOverrides?: BuildPriceOverrides;
  setBuildPriceOverrides?: (overrides: BuildPriceOverrides) => void;
  maxScores: Record<string, number>;
  masterCategories: string[];
}

type NotesMap = Record<string, number>;
type PricePartKey = ComboPartKey | BuildPartKey;
type PriceDraft = Partial<Record<PricePartKey, string>>;

const comboParts: Array<{ key: ComboPartKey; label: string }> = [
  { key: "cpu", label: "CPU" },
  { key: "gpu", label: "GPU" },
  { key: "ram", label: "RAM" },
];

const buildParts: Array<{ key: BuildPartKey; label: string }> = [
  { key: "cpu", label: "CPU" },
  { key: "gpu", label: "GPU" },
  { key: "ram", label: "RAM" },
  { key: "motherboard", label: "Placa base" },
  { key: "storage", label: "Almacenamiento" },
  { key: "psu", label: "Fuente" },
];

function getColorStyles(score: number) {
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
}

export default function CompareProductCard({
  product,
  globalCurrency,
  displayedPrice,
  setDisplayedPrice,
  comboPriceOverrides = {},
  setComboPriceOverrides,
  buildPriceOverrides = {},
  setBuildPriceOverrides,
  maxScores,
  masterCategories,
}: CompareProductCardProps) {
  const removeItem = useCompareStore((state) => state.removeItem);
  const itemsCount = useCompareStore((state) => state.items.length);
  const isCombo = isComboItem(product);
  const isBuild = isBuildItem(product);
  const isCollection = isCombo || isBuild;
  const cardHeightClass = isCollection ? "min-h-[600px]" : "min-h-[520px]";
  const cardPaddingClass = isCollection ? "md:p-6" : "md:px-6 md:py-4";
  const notesSpacingClass = isCollection ? "mt-8 pt-6" : "mt-6 pt-4";
  const notesHeaderSpacingClass = isCollection ? "mb-4" : "mb-3";
  const notesListGapClass = isCollection ? "gap-3.5" : "gap-2.5";
  const evaluationSpacingClass = isCollection ? "mt-6 p-3.5" : "mt-4 p-3";
  const collectionParts: Array<{ key: PricePartKey; label: string }> = isBuild ? buildParts : comboParts;
  const isEUR = globalCurrency === "EUR";
  const symbol = isEUR ? "€" : "$";
  const priceColumn = isEUR ? "price_base_eur" : "price_base_usd";
  const basePrice = isCollection ? displayedPrice : product[priceColumn] || product.price || 0;

  const [customPrice, setCustomPrice] = useState(basePrice);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [draftPrices, setDraftPrices] = useState<PriceDraft>({});

  useEffect(() => {
    if (!isCollection) setCustomPrice(basePrice);
  }, [basePrice, isCollection]);

  const format = (value: number) =>
    `${isEUR ? "" : symbol}${Number(value).toFixed(0)}${isEUR ? symbol : ""}`;

  const effectiveCombo = useMemo(
    () => applyComboPriceOverrides(product, globalCurrency, comboPriceOverrides),
    [product, globalCurrency, comboPriceOverrides],
  );
  const effectiveBuild = useMemo(
    () => applyBuildPriceOverrides(product, globalCurrency, buildPriceOverrides),
    [product, globalCurrency, buildPriceOverrides],
  );
  const precioUSD = useMemo(
    () => convertPrice(displayedPrice, globalCurrency, "USD"),
    [displayedPrice, globalCurrency],
  );
  const baseNotes = useMemo<NotesMap>(() => {
    if (isCombo) return (getComboNotes(effectiveCombo, globalCurrency) || {}) as NotesMap;
    if (isBuild) return (getBuildNotes(effectiveBuild, globalCurrency) || {}) as NotesMap;
    return (getComponentNotes(product, precioUSD) || {}) as NotesMap;
  }, [effectiveBuild, effectiveCombo, globalCurrency, isBuild, isCombo, precioUSD, product]);

  const categories = Object.keys(baseNotes);
  const calidadPrecioKey = categories.find(
    (category) =>
      category.toLowerCase().includes("precio") ||
      category.toLowerCase().includes("price") ||
      category.toLowerCase().includes("calidad"),
  );
  const finalScore = calidadPrecioKey ? baseNotes[calidadPrecioKey] || 0 : 0;
  const valueStyles = getColorStyles(finalScore);

  const getPartPrice = (part: PricePartKey) => (
    isBuild
      ? getBuildPartPrice(product, part as BuildPartKey, globalCurrency, buildPriceOverrides)
      : getComboPartPrice(product, part as ComboPartKey, globalCurrency, comboPriceOverrides)
  );

  const openCustomizeModal = () => {
    const currentPrices = collectionParts.reduce<PriceDraft>((prices, part) => {
      prices[part.key] = String(getPartPrice(part.key));
      return prices;
    }, {});
    setDraftPrices(currentPrices);
    setIsCustomizeOpen(true);
  };

  const getNumericDraftPrices = (): PriceDraft => collectionParts.reduce<PriceDraft>((prices, part) => {
    const rawValue = draftPrices[part.key]?.trim();
    if (rawValue) {
      const numericValue = Number(rawValue);
      if (Number.isFinite(numericValue)) prices[part.key] = String(numericValue);
    }
    return prices;
  }, {});

  const getNumericOverrides = () => Object.entries(getNumericDraftPrices()).reduce<Record<string, number>>(
    (prices, [part, value]) => {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) prices[part] = numericValue;
      return prices;
    },
    {},
  );

  const applyCollectionPrices = () => {
    const numericPrices = getNumericOverrides();
    if (isBuild) {
      setBuildPriceOverrides?.(numericPrices as BuildPriceOverrides);
    } else {
      setComboPriceOverrides?.(numericPrices as ComboPriceOverrides);
    }
    setIsCustomizeOpen(false);
  };

  const draftNumericPrices = getNumericOverrides();
  const draftTotal = isBuild
    ? getBuildTotalPrice(product, globalCurrency, draftNumericPrices as BuildPriceOverrides)
    : getComboTotalPrice(product, globalCurrency, draftNumericPrices as ComboPriceOverrides);

  return (
    <div className={`relative flex h-full ${cardHeightClass} w-1/2 shrink-0 snap-start flex-col justify-between p-2 group animate-in fade-in duration-300 md:w-full md:shrink ${cardPaddingClass}`}>
      <button
        onClick={() => removeItem(product.id)}
        className="absolute top-4 right-4 z-10 rounded-full bg-zinc-900/80 p-2 text-zinc-500 transition-all hover:bg-zinc-900 hover:text-white cursor-pointer active:scale-95"
      >
        <X size={13} strokeWidth={2.5} />
      </button>

      <div className="flex flex-col gap-2">
        {isCombo && (
          <>
            <div className="mb-3 px-1">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">
                {product.category || "Combo"}
              </span>
              <h3 className="mt-1 text-sm font-black leading-snug tracking-tight text-white">
                {product.title || product.name}
              </h3>
            </div>

            <div className="grid w-full grid-cols-3 gap-2">
              {comboParts.map((part) => {
                const component = product[part.key];
                if (!component) return null;
                const imageSrc = getComponentIcon(part.key);

                return (
                  <div key={part.key} className="flex min-w-0 flex-col gap-1.5">
                    <Link
                      href={`/catalog/${component.slug}?currency=${globalCurrency}`}
                      aria-label={`Ver ${component.name} en el catálogo`}
                      className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-900/20 transition-colors hover:border-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    >
                      {imageSrc ? (
                        <img src={imageSrc} alt={`Icono de ${component.name}`} className="h-full w-full object-contain opacity-80 transition-opacity group-hover:opacity-100" />
                      ) : (
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">Imagen</span>
                      )}
                    </Link>
                    <Link
                      href={`/catalog/${component.slug}?currency=${globalCurrency}`}
                      className="truncate text-center text-[8px] font-bold text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white"
                      title={component.name}
                    >
                      {component.name}
                    </Link>
                  </div>
                );
              })}
            </div>

            <CollectionPriceFooter displayedPrice={displayedPrice} format={format} onCustomize={openCustomizeModal} />
          </>
        )}

        {isBuild && (
          <>
            <div className="mb-3 px-1">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">
                {product.category || "Build"}
              </span>
              <h3 className="mt-1 text-sm font-black leading-snug tracking-tight text-white">
                {product.title || product.name}
              </h3>
            </div>

            <div className="mt-1 space-y-2 border-l border-zinc-800 pl-3">
              {buildParts.map((part) => {
                const component = product[part.key];
                if (!component) return null;

                  return (
                  <Link
                    key={part.key}
                    href={`/catalog/${component.slug}?currency=${globalCurrency}`}
                    aria-label={`Ver ${component.name} en el catálogo`}
                    className="group flex min-w-0 items-baseline rounded-md py-0.5 text-[10px] font-bold text-zinc-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    <span className="truncate" title={component.name}>
                      {component.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            <CollectionPriceFooter displayedPrice={displayedPrice} format={format} onCustomize={openCustomizeModal} />
          </>
        )}

        {!isCollection && (
          <>
            <div className="mb-3 px-1">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">
                {product.type || "Componente"}
              </span>
              <h3 className="mt-1 truncate text-sm font-black leading-snug tracking-tight text-white" title={product.name}>
                {product.name}
              </h3>
            </div>

            <div className="flex w-full items-center justify-center">
              {getProductImage(product) && (
                <div className="relative mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center overflow-hidden">
                  <img
                    src={getProductImage(product) || undefined}
                    alt={product.name}
                    className="h-full w-full object-contain opacity-80 transition-opacity group-hover:opacity-100"
                  />
                </div>
              )}
            </div>

            <div className="flex w-full flex-col items-stretch gap-3 md:flex-row md:items-end">
              <div className="flex w-full max-w-[320px] flex-1 flex-col gap-3">
                <div className="space-y-1">
                  <label className="ml-0.5 text-[7px] font-black uppercase tracking-widest text-zinc-600">
                    Escriba un precio...
                  </label>
                  <div className="flex h-[36px] items-center gap-1">
                    <div className="relative flex-1">
                      <span className="absolute top-1/2 left-2 -translate-y-1/2 text-[10px] font-bold text-zinc-600">{symbol}</span>
                      <input
                        type="number"
                        value={customPrice === 0 ? "" : customPrice}
                        onChange={(event) => setCustomPrice(Number(event.target.value))}
                        className="h-[38px] w-full rounded-xl border border-zinc-900 bg-black/40 p-2 pr-6 pl-6 text-[10px] font-bold text-white outline-none transition-all focus:border-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <button
                      onClick={() => setDisplayedPrice(customPrice)}
                      className="h-[36px] shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2 text-[8px] font-black uppercase tracking-widest text-zinc-300 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:text-white cursor-pointer active:scale-95"
                    >
                      aplicar
                    </button>
                  </div>
                </div>
              </div>

              <Link
                href={`/catalog/${product.slug}?currency=${globalCurrency}`}
                className="flex h-9 w-full flex-none items-center justify-center rounded-xl border border-zinc-900 bg-zinc-900/20 py-2 text-center text-[9px] font-black uppercase tracking-widest text-zinc-400 transition-all hover:bg-zinc-900 hover:text-white cursor-pointer active:scale-[0.98] md:w-25"
              >
                ver producto
              </Link>
            </div>
          </>
        )}
      </div>

      <div className={`flex flex-1 flex-col justify-between border-t border-zinc-900/50 ${notesSpacingClass}`}>
        <div className="text-left">
          <div className={`${notesHeaderSpacingClass} border-b border-zinc-900/70 pb-3`}>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-200">Notas</h4>
          </div>
          <div className={`grid grid-cols-2 ${notesListGapClass} gap-x-3 pl-1`}>
            {masterCategories.map((category) => {
              const currentScore = Number(baseNotes[category] || 0);
              const normalizedScore = Math.min(Math.max(currentScore, 0), 10);
              const isHighest = itemsCount > 1 && currentScore === (maxScores[category] || 0) && currentScore > 0;

              return (
                <div key={category} className="group min-w-0 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[9px] font-bold uppercase tracking-wider text-zinc-400" title={category}>
                      {category}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[12px] uppercase tracking-wider font-thin tabular-nums text-zinc-300">
                      {isHighest && (
                        <span className="text-emerald-400" title="Mejor nota">
                          <ArrowUp aria-hidden="true" size={10} strokeWidth={3} />
                        </span>
                      )}
                      {normalizedScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full border border-zinc-900/30 bg-zinc-900/60 p-[2px]">
                    <div
                      className="h-full rounded-full bg-zinc-400 shadow-[0_0_10px_rgba(255,255,255,0.05)] transition-all duration-1000 ease-out group-hover:bg-zinc-200"
                      style={{ width: `${normalizedScore * 10}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${evaluationSpacingClass} flex items-center justify-between rounded-xl border transition-all duration-300 ${valueStyles.bg} ${valueStyles.border}`}>
          <div className="flex flex-col text-left">
            <span className={`text-[7.5px] font-black uppercase tracking-[0.2em] ${valueStyles.label}`}>Evaluacion global</span>
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-tight text-zinc-200">Calidad Precio</span>
          </div>
          <div className={`flex h-9 w-11 items-center justify-center rounded-lg border border-zinc-900 bg-zinc-950 text-sm font-black tracking-tighter shadow-xl transition-colors duration-300 ${valueStyles.text}`}>
            {finalScore.toFixed(1)}
          </div>
        </div>
      </div>

      {isCollection && isCustomizeOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Personalizar precio</h3>
              <button onClick={() => setIsCustomizeOpen(false)} className="rounded-full bg-zinc-900 p-2 text-zinc-500 transition-colors hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {collectionParts.map((part) => (
                <label key={part.key} className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  <span>{part.label}</span>
                  <div className="relative w-32">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-600">{symbol}</span>
                    <input
                      type="number"
                      value={draftPrices[part.key] ?? ""}
                      onChange={(event) => setDraftPrices((previous) => ({ ...previous, [part.key]: event.target.value }))}
                      className="w-full rounded-xl border border-zinc-900 bg-black py-2 pr-3 pl-7 text-xs font-bold text-white outline-none focus:border-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-zinc-900 pt-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Total</span>
              <span className="text-sm font-black text-white">{format(draftTotal)}</span>
            </div>
            <button onClick={applyCollectionPrices} className="mt-5 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-200 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:text-white active:scale-[0.98]">
              Aplicar precios
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CollectionPriceFooter({
  displayedPrice,
  format,
  onCustomize,
}: {
  displayedPrice: number;
  format: (value: number) => string;
  onCustomize: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <div className="flex flex-col">
        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Precio total</span>
        <span className="text-base font-black tracking-tight text-white">{format(displayedPrice)}</span>
      </div>
      <button
        onClick={onCustomize}
        className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-zinc-300 transition-all hover:border-zinc-600 hover:text-white"
      >
        Personalizar precio
      </button>
    </div>
  );
}
