"use client";

import { useState } from "react";
import { Settings2Icon, X, ChevronDown } from "lucide-react"; // Cambiamos Plus por Filter
import { useRouter, useSearchParams } from "next/navigation";
import FilterModal from "./FilterModal";

interface Props {
  count: number;
  availableBrands: string[];
  availableTypes: string[];
}

export default function FilterBar({ count, availableBrands, availableTypes }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeBrands = searchParams.get("brand")?.split(",") || [];
  const activeType = searchParams.get("type");
  const hasPrice = searchParams.get("minPrice") || searchParams.get("maxPrice");

  const removeFilter = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams);
    if (key === "brand" && value) {
      const newBrands = activeBrands.filter(b => b !== value);
      if (newBrands.length > 0) params.set("brand", newBrands.join(","));
      else params.delete("brand");
    } else {
      params.delete(key);
    }
    router.push(`/catalog?${params.toString()}`);
  };

  return (
    <div className="mb-10 w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* BOTÓN DE FILTRO: Ahora solo icono y circular */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-white hover:border-white/20 transition-all cursor-pointer active:scale-95 shadow-lg"
            title="Filtros"
          >
            <Settings2Icon size={18} strokeWidth={2.5} />
          </button>
          
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">
            {count} Productos
          </span>
        </div>

        {/* Selector de Moneda (Estético) */}
        <button className="flex items-center gap-2 rounded-full border border-zinc-800 px-5 py-2.5 text-[10px] font-black text-zinc-400 hover:text-white transition-all uppercase cursor-default">
          $ USD
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Chips de Filtros Activos */}
      {(activeBrands.length > 0 || activeType || hasPrice) && (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {activeBrands.map(brand => (
            <button key={brand} onClick={() => removeFilter("brand", brand)} className="group flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-[10px] font-bold text-white uppercase transition-colors hover:border-zinc-600">
              {brand} <X size={12} className="text-zinc-600 group-hover:text-white" />
            </button>
          ))}
          {activeType && (
            <button onClick={() => removeFilter("type")} className="group flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-[10px] font-bold text-white uppercase transition-colors hover:border-zinc-600">
              {activeType} <X size={12} className="text-zinc-600 group-hover:text-white" />
            </button>
          )}
          {hasPrice && (
            <button onClick={() => {removeFilter("minPrice"); removeFilter("maxPrice")}} className="group flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-[10px] font-bold text-white uppercase transition-colors hover:border-zinc-600">
              Precio <X size={12} className="text-zinc-600 group-hover:text-white" />
            </button>
          )}
        </div>
      )}

      <FilterModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        availableBrands={availableBrands}
        availableTypes={availableTypes}
      />
    </div>
  );
}