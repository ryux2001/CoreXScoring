"use client";

import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// 1. AÑADIMOS 'currency' A LA INTERFAZ
interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableBrands: string[];
  availableTypes: string[];
  currency: string; 
}

// 2. RECIBIMOS 'currency' EN LOS PARÁMETROS DEL COMPONENTE
export default function FilterModal({ isOpen, onClose, availableBrands, availableTypes, currency }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    searchParams.get("brand")?.split(",") || []
  );
  const [selectedType, setSelectedType] = useState<string>(searchParams.get("type") || "");
  const [priceRange, setPriceRange] = useState({
    min: searchParams.get("minPrice") || "",
    max: searchParams.get("maxPrice") || "",
  });

  if (!isOpen) return null;

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams);
    
    if (selectedBrands.length > 0) params.set("brand", selectedBrands.join(","));
    else params.delete("brand");

    if (selectedType) params.set("type", selectedType);
    else params.delete("type");

    if (priceRange.min) params.set("minPrice", priceRange.min);
    else params.delete("minPrice");

    if (priceRange.max) params.set("maxPrice", priceRange.max);
    else params.delete("maxPrice");

    router.push(`/catalog?${params.toString()}`);
    onClose();
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  // --- VALIDACIONES DE PRECIO ---
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val !== "") {
      let num = Number(val);
      if (num < 0) num = 0;
      if (priceRange.max && num > Number(priceRange.max)) {
        num = Number(priceRange.max);
      }
      val = num.toString();
    }
    setPriceRange({ ...priceRange, min: val });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val !== "") {
      let num = Number(val);
      if (num < 0) num = 0;
      if (num > 10000) num = 10000;
      val = num.toString();
    }
    setPriceRange({ ...priceRange, max: val });
  };

  const handleMaxBlur = () => {
    if (priceRange.min && priceRange.max) {
      if (Number(priceRange.max) < Number(priceRange.min)) {
        setPriceRange({ ...priceRange, max: priceRange.min });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-hidden px-4 pt-4 sm:pt-32">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl touch-pan-y animate-in fade-in zoom-in-95 duration-200 sm:max-h-none sm:overflow-visible sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white tracking-tighter uppercase">Filtros</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white cursor-pointer"><X size={20} /></button>
        </div>

        <div className="space-y-10">
          {/* MARCA */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-4">Marca</span>
            <div className="flex flex-wrap gap-2">
              {availableBrands.map(brand => (
                <button
                  key={brand}
                  onClick={() => toggleBrand(brand)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    selectedBrands.includes(brand) 
                    ? "bg-white text-black border-white" 
                    : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 cursor-pointer"
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          {/* TIPO */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-4">Tipo de Componente</span>
            <div className="grid grid-cols-3 gap-2">
              {availableTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(selectedType === type ? "" : type)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                    selectedType === type 
                    ? "bg-white text-black border-white" 
                    : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 cursor-pointer"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* PRECIO */}
          <div>
            {/* 3. MOSTRAMOS EL SÍMBOLO DINÁMICO EN EL TÍTULO */}
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-4">
              Rango de Precio ({currency === 'EUR' ? '€' : '$'})
            </span>
            <div className="flex items-center gap-4">
              <input 
                type="number" 
                placeholder="Min" 
                value={priceRange.min}
                onChange={handleMinChange}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="h-px w-8 bg-zinc-800" />
              <input 
                type="number" 
                placeholder="Max" 
                value={priceRange.max}
                onChange={handleMaxChange}
                onBlur={handleMaxBlur}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        </div>

         <button 
            onClick={applyFilters}
            className="w-full mt-12 bg-white text-black py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all cursor-pointer"
          >
            Aplicar Filtros
          </button>
      </div>
    </div>
  );
}
