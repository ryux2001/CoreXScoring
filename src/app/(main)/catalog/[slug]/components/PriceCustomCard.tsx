"use client";

import React, { useState, useEffect } from "react";
import { Info, ChevronDown, X, Settings2 } from "lucide-react";
import {
  GPU_VALUE_PROFILE_OPTIONS,
  isGpuValueProfile,
  type GpuValueProfile,
} from "@/lib/scoring/components/calculations/gpu/profiles";
import {
  CPU_VALUE_PROFILE_OPTIONS,
  isCpuValueProfile,
  type CpuValueProfile,
} from "@/lib/scoring/components/calculations/cpu/profiles";
import { useCatalogPriceEvaluationStore } from "@/store/useCatalogPriceEvaluationStore";
import { resolveProductPrice } from "@/lib/catalog/product-price";

type ValueProfile = GpuValueProfile | CpuValueProfile;
type PricePreset = "current" | "msrp" | "high" | "low";

interface PriceCustomProps {
  product: any;
  currency?: string;
}

interface PriceFormProps {
  selectedPreset: PricePreset;
  setSelectedPreset: (value: PricePreset) => void;
  customPrice: number;
  setCustomPrice: (value: number) => void;
  currentPrice: number;
  msrpPrice: number | null;
  hasCurrentPrice: boolean;
  format: (value: number) => string;
  symbol: string;
  currency: string;
  handleApply: () => void;
  isValueProfileComponent: boolean;
  valueProfile: ValueProfile;
  profileOptions: readonly { value: string; label: string }[];
  isValidValueProfile: (value: unknown) => boolean;
  onValueProfileChange: (value: string) => void;
  profileSelectId: string;
  className?: string;
}

export default function PriceCustomCard({
  product,
  currency = "USD",
}: PriceCustomProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const isEUR = currency === "EUR";
  const isGpu = String(product?.type ?? "").toUpperCase() === "GPU";
  const isCpu = String(product?.type ?? "").toUpperCase() === "CPU";
  const isValueProfileComponent = isGpu || isCpu;
  const profileOptions = isGpu ? GPU_VALUE_PROFILE_OPTIONS : CPU_VALUE_PROFILE_OPTIONS;
  const resolvedPrice = resolveProductPrice(product, currency);
  const currentPrice = resolvedPrice.value;
  const msrpPrice = resolvedPrice.msrpPrice;
  const symbol = isEUR ? "€" : "$";

  const [selectedPreset, setSelectedPreset] = useState<PricePreset>(
    resolvedPrice.hasCurrentPrice ? "current" : "msrp",
  );
  const [customPrice, setCustomPrice] = useState(currentPrice);
  const [valueProfile, setValueProfile] = useState<ValueProfile>("balanced");
  const evaluation = useCatalogPriceEvaluationStore((state) => state.current);
  const initializeEvaluation = useCatalogPriceEvaluationStore((state) => state.initialize);
  const applyEvaluation = useCatalogPriceEvaluationStore((state) => state.apply);

  useEffect(() => {
    setValueProfile("balanced");
    initializeEvaluation({
      product,
      productId: String(product?.id ?? ""),
      price: currentPrice,
      currency: isEUR ? "EUR" : "USD",
      source: resolvedPrice.hasCurrentPrice ? "market" : "base",
    });
  }, [currentPrice, initializeEvaluation, isEUR, product, resolvedPrice.hasCurrentPrice]);

  // Restablece los presets únicamente al cambiar de producto, moneda o precio de catálogo.
  useEffect(() => {
    setSelectedPreset(resolvedPrice.hasCurrentPrice ? "current" : "msrp");
    setCustomPrice(currentPrice);
  }, [currentPrice, isEUR, product?.id, resolvedPrice.hasCurrentPrice]);

  // Bloqueo de scroll mientras el modal está abierto.
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!evaluation || evaluation.productId !== String(product?.id ?? "") || evaluation.currency !== (isEUR ? "EUR" : "USD")) return;
    setCustomPrice(evaluation.price);
    if (evaluation.valueProfile) setValueProfile(evaluation.valueProfile as ValueProfile);
  }, [evaluation, isEUR, product?.id]);

  const format = (val: number) =>
    `${isEUR ? "" : symbol}${val.toFixed(0)}${isEUR ? symbol : ""}`;

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 300);
  };

  const handleApply = () => {
    applyEvaluation({
      product,
      productId: String(product?.id ?? ""),
      price: customPrice,
      currency: isEUR ? "EUR" : "USD",
      valueProfile: isValueProfileComponent ? valueProfile : undefined,
      source: selectedPreset === "current" && customPrice === currentPrice ? "market" : "manual",
    });
    if (isModalOpen) handleCloseModal();
  };

  const handleValueProfileChange = (value: string) => {
    if (isGpu && isGpuValueProfile(value)) {
      setValueProfile(value);
      applyEvaluation({
        product,
        productId: String(product?.id ?? ""),
        price: customPrice,
        currency: isEUR ? "EUR" : "USD",
        valueProfile: value,
        source: selectedPreset === "current" && customPrice === currentPrice ? "market" : "manual",
      });
      return;
    }

    if (isCpu && isCpuValueProfile(value)) {
      setValueProfile(value);
      applyEvaluation({
        product,
        productId: String(product?.id ?? ""),
        price: customPrice,
        currency: isEUR ? "EUR" : "USD",
        valueProfile: value,
        source: selectedPreset === "current" && customPrice === currentPrice ? "market" : "manual",
      });
    }
  };

  // El contenido del formulario lo extraemos para reutilizarlo en desktop y modal

  return (
    <>
      {/* --- VERSIÓN DESKTOP (Visible solo en LG) --- */}
      <div className="hidden lg:flex flex-col p-6 rounded-3xl border border-zinc-900 bg-zinc-950/50 shadow-xl h-full justify-between">
        <div>
          <div className="relative mb-2 pr-10">
            <h3 className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
              Evaluación de Precio
            </h3>
            <div className="group absolute right-0 top-0">
              <button
                type="button"
                aria-label="Información sobre la evaluación de precio"
                className="flex h-7 w-7 cursor-help items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/70"
              >
                <Info size={11} strokeWidth={3} />
              </button>
              <div className="invisible absolute right-0 top-9 z-40 w-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-[12px] leading-relaxed text-zinc-400 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                Ajusta el precio para recalcular automáticamente la relación
                Calidad/Precio.
              </div>
            </div>
          </div>
        </div>

        <PriceForm
          selectedPreset={selectedPreset}
          setSelectedPreset={setSelectedPreset}
          customPrice={customPrice}
          setCustomPrice={setCustomPrice}
          currentPrice={currentPrice}
          msrpPrice={msrpPrice}
          hasCurrentPrice={resolvedPrice.hasCurrentPrice}
          format={format}
          symbol={symbol}
          currency={currency}
          handleApply={handleApply}
          isValueProfileComponent={isValueProfileComponent}
          valueProfile={valueProfile}
          profileOptions={profileOptions}
           isValidValueProfile={isGpu ? isGpuValueProfile : isCpuValueProfile}
           onValueProfileChange={handleValueProfileChange}
           profileSelectId="value-profile-desktop"
           className="catalog-price-form-desktop"
         />

        <div className="pt-3 border-t border-zinc-900/50">
          <p className="text-[9px] font-bold uppercase tracking-widest leading-tight text-zinc-500 text-center lg:text-left">
            * Evalúa la{" "}
            <span className="text-zinc-400 font-bold">Calidad/Precio</span>.
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 lg:hidden">
          <div className="absolute inset-0 z-[-1]" onClick={handleCloseModal} />

          <div
            className={`w-full max-w-sm flex flex-col overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl ${isClosing ? "animate-out fade-out zoom-out-95 duration-300" : "animate-in fade-in zoom-in-95 duration-300"}`}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-zinc-900 p-5">
              <div className="flex items-center gap-2">
                <Settings2 size={14} className="text-zinc-500" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-white">
                  Ajustar Evaluación
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="rounded-full bg-zinc-900 p-2 text-zinc-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="p-6">
              <PriceForm
                selectedPreset={selectedPreset}
                setSelectedPreset={setSelectedPreset}
                customPrice={customPrice}
                setCustomPrice={setCustomPrice}
                currentPrice={currentPrice}
                msrpPrice={msrpPrice}
                hasCurrentPrice={resolvedPrice.hasCurrentPrice}
                format={format}
                symbol={symbol}
                currency={currency}
                handleApply={handleApply}
                isValueProfileComponent={isValueProfileComponent}
                valueProfile={valueProfile}
                profileOptions={profileOptions}
                isValidValueProfile={isGpu ? isGpuValueProfile : isCpuValueProfile}
                onValueProfileChange={handleValueProfileChange}
                profileSelectId="value-profile-mobile"
              />
              <p className="mt-6 text-center text-[9px] font-bold uppercase tracking-widest leading-tight text-zinc-500">
                El cambio se verá reflejado en la <br /> tarjeta principal del
                producto.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const PriceForm = ({
  selectedPreset,
  setSelectedPreset,
  customPrice,
  setCustomPrice,
  currentPrice,
  msrpPrice,
  hasCurrentPrice,
  format,
  symbol,
  currency,
  handleApply,
  isValueProfileComponent,
  valueProfile,
  profileOptions,
  isValidValueProfile,
  onValueProfileChange,
  profileSelectId,
  className,
}: PriceFormProps) => (
  <div className={`space-y-4 ${className ?? ""}`}>
    {/* PRECIOS ALTERNATIVOS */}
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
        Precios Alternativos
      </label>
      <div className="relative">
        <select
          value={selectedPreset}
          onChange={(e) => {
            const preset = e.target.value as PricePreset;
            const price = preset === "current"
              ? currentPrice
              : preset === "msrp"
                ? msrpPrice ?? currentPrice
                : preset === "high"
                  ? currentPrice * 1.15
                  : currentPrice * 0.9;
            setSelectedPreset(preset);
            setCustomPrice(price);
          }}
          className="w-full appearance-none rounded-xl border border-zinc-900 bg-black p-3 text-xs font-bold text-white outline-none transition-all focus:border-zinc-700"
        >
          {hasCurrentPrice ? <option value="current">Precio actual - {format(currentPrice)}</option> : null}
          {msrpPrice !== null ? <option value="msrp">MSRP - {format(msrpPrice)}</option> : null}
          <option value="high">
            Estimado Alto (+15%) - {format(currentPrice * 1.15)}
          </option>
          <option value="low">
            Estimado Bajo (-10%) - {format(currentPrice * 0.9)}
          </option>
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600">
          <ChevronDown size={14} />
        </div>
      </div>
    </div>

    {isValueProfileComponent && (
      <div className="space-y-1.5">
        <label
          htmlFor={profileSelectId}
          className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-500"
        >
          Perfil de valor
        </label>
        <div className="relative">
          <select
            id={profileSelectId}
            value={valueProfile}
            onChange={(event) => {
              const value = event.target.value;
              if (isValidValueProfile(value)) onValueProfileChange(value);
            }}
            aria-describedby={`${profileSelectId}-description`}
            className="w-full appearance-none rounded-xl border border-zinc-900 bg-black p-3 pr-9 text-xs font-bold text-white outline-none transition-all focus:border-zinc-700 focus:ring-2 focus:ring-zinc-700/60"
          >
            {profileOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600">
            <ChevronDown size={14} />
          </div>
        </div>
        {/* <p id={`${profileSelectId}-description`} className="px-1 text-[10px] leading-relaxed text-zinc-500">
          Cambia qué tipo de rendimiento pesa más en Calidad/Precio.
        </p> */}
      </div>
    )}

    {/* PRECIO PERSONALIZADO */}
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
        Precio Personalizado
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-600">
            {symbol}
          </span>
          <input
            type="number"
            value={customPrice === 0 ? "" : customPrice}
            onChange={(e) => setCustomPrice(Number(e.target.value))}
            onKeyDown={(e) => {
              if (
                !/[0-9]/.test(e.key) &&
                ![
                  "Backspace",
                  "Delete",
                  "Tab",
                  "Escape",
                  "Enter",
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                  "End",
                ].includes(e.key) &&
                !(e.ctrlKey || e.metaKey)
              ) {
                e.preventDefault();
              }
            }}
            className="w-full rounded-xl border border-zinc-900 bg-black p-3 pl-7 text-xs font-bold text-white outline-none transition-all focus:border-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-600 uppercase tracking-tighter">
            {currency}
          </div>
        </div>
        <button
          onClick={handleApply}
          className="px-4 rounded-xl bg-zinc-900 text-[#ffffffbe] text-[10px] font-black uppercase tracking-widest transition-all hover:bg-zinc-800 hover:cursor-pointer active:scale-95"
        >
          APLICAR
        </button>
      </div>
    </div>
  </div>
);
