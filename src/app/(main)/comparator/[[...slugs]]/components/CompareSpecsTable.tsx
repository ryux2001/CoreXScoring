"use client";

import React from "react";
import { COMPONENT_SPECS, getProductSpecValue } from "@/lib/config/specs-mapping";

interface CompareSpecsTableProps {
  items: any[];
}

export default function CompareSpecsTable({ items }: CompareSpecsTableProps) {
  if (items.length === 0) return null;

  const componentType = items[0]?.type?.toUpperCase();
  const specs = COMPONENT_SPECS[componentType];

  if (!specs) return null;

  return (
    /* 📱 Añadido overflow-x-auto para permitir scroll lateral manteniendo tu max-w-255 */
    <div className="mt-12 w-full rounded-2xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-sm overflow-x-auto md:overflow-x-visible animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-255 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      
      {/* CABECERA DE LA TABLA */}
      {/* 📱 min-w-[650px] asegura que haya espacio suficiente para las columnas en móvil */}
      <div className="grid grid-cols-12 border-b border-zinc-900 bg-zinc-950/60 px-6 py-4 items-center min-w-[650px] md:min-w-0">
        <div className="col-span-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Especificaciones
          </span>
        </div>
        
        <div className="col-span-9 grid grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="truncate pr-2">
              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tight truncate block">
                {item.name}
              </span>
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mt-0.5">
                {item.brand}
              </span>
            </div>
          ))}
          {Array.from({ length: 3 - items.length }).map((_, index) => (
            <div key={`empty-head-${index}`} className="hidden md:block" />
          ))}
        </div>
      </div>

      {/* CUERPO DE LA TABLA (FILAS DINÁMICAS) */}
      <div className="divide-y divide-zinc-900/50">
        {specs.map((spec) => (
          /* 📱 Añadido min-w-[650px] a cada fila para alinearse perfectamente con la cabecera */
          <div 
            key={spec.key} 
            className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-zinc-900/10 transition-colors duration-200 group min-w-[650px] md:min-w-0"
          >
            <div className="col-span-3 pr-4">
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                {spec.label}
              </span>
            </div>

            <div className="col-span-9 grid grid-cols-3 gap-6">
              {items.map((item) => {
                const rawValue = getProductSpecValue(item, spec.key);
                const formattedValue = rawValue !== null && rawValue !== "" 
                  ? (spec.format ? spec.format(rawValue) : rawValue)
                  : null;

                return (
                  <div key={`${item.id}-${spec.key}`} className="text-left">
                    {formattedValue !== null ? (
                      <span className="text-xs font-medium text-zinc-300 tracking-wide">
                        {formattedValue}
                      </span>
                    ) : (
                      <span className="text-xs font-black text-zinc-700 uppercase tracking-wider select-none">
                        No
                      </span>
                    )}
                  </div>
                );
              })}
              
              {Array.from({ length: 3 - items.length }).map((_, index) => (
                <div key={`empty-val-${index}`} className="hidden md:block" />
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}