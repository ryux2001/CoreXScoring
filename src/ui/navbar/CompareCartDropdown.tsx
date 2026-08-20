"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, X, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCompareStore } from "@/store/useCompareStore";

interface CompareCartDropdownProps {
  onOpen?: () => void;
}

export default function CompareCartDropdown({ onOpen }: CompareCartDropdownProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const items = useCompareStore((state) => state.items);
  const componentType = useCompareStore((state) => state.componentType);
  const removeItem = useCompareStore((state) => state.removeItem);
  const clearCompare = useCompareStore((state) => state.clearCompare);
  const isComboComparison = componentType === "COMBO" || items.some((item) => (
    item.comparisonType === "combo" || String(item.type || "").toUpperCase() === "COMBO"
  ));
  const isBuildComparison = componentType === "BUILD" || items.some((item) => (
    item.comparisonType === "build" || String(item.type || "").toUpperCase() === "BUILD"
  ));
  const comparisonLabel = isBuildComparison ? "Builds" : isComboComparison ? "Combos" : "Componentes";

  useEffect(() => {
    if (!isCartOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCartOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isCartOpen]);

  return (
    <div className="relative">
      {/* Botón de la balanza - Siempre visible (flex) y protegido contra deformaciones (shrink-0) */}
      <button
        type="button"
        onClick={() => {
          if (!isCartOpen) onOpen?.();
          setIsCartOpen((previous) => !previous);
        }}
        aria-label={`Abrir comparativa${items.length > 0 ? ` (${items.length} seleccionados)` : ""}`}
        aria-expanded={isCartOpen}
        aria-controls="comparison-dropdown"
        className="relative flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-zinc-900 text-zinc-300 transition-all hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <ArrowLeftRight className="h-4 w-4" />
        
        {/* Burbuja indicadora con el número de componentes elegidos */}
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-black animate-in zoom-in duration-200">
            {items.length}
          </span>
        )}
      </button>

      {/* Ventanita desplegable con posicionamiento absoluto */}
      {isCartOpen && (
        <>
          {/* Capa invisible para cerrar el menú al hacer clic fuera */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsCartOpen(false)}
          />
          
          <div
            id="comparison-dropdown"
            role="dialog"
            aria-label="Comparativa de productos"
            className="fixed left-4 right-4 top-[72px] z-50 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80"
          >
            
            {/* Cabecera del Carrito */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Comparativa ({items.length}/3)
                </span>
                {items.length > 0 && (
                  <span className="mt-1 text-[8px] font-bold uppercase tracking-wider text-zinc-600">
                    Comparando: <span className="text-zinc-400">{comparisonLabel}</span>
                  </span>
                )}
              </div>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearCompare()}
                  className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-[9px] font-bold uppercase tracking-tight text-zinc-600 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <Trash2 size={10} />
                  Limpiar
                </button>
              )}
            </div>

            {/* Listado interno */}
            {items.length === 0 ? (
              <div className="flex h-24 flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                  No hay productos seleccionados
                </p>
                <p className="text-[9px] text-zinc-700 mt-1 max-w-[200px]">
                  Explora el catálogo y pulsa &quot;Comparar&quot; en los componentes.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-zinc-900/20 p-2.5 hover:border-zinc-800 transition-colors"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-xs font-bold text-white tracking-tight">
                        {item.name}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mt-0.5">
                        {item.brand} · {item.type}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Quitar ${item.name} de la comparativa`}
                      onClick={() => removeItem(item.id)}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-zinc-600 transition-all hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Enlace de acción final */}
            <div className="mt-4 pt-3 border-t border-zinc-900">
              <Link
                href="/comparator"
                onClick={() => setIsCartOpen(false)}
                className={`w-full flex items-center justify-center rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all text-center ${
                  items.length < 2 
                    ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-900" 
                    : "bg-white text-black hover:bg-zinc-200 active:scale-[0.98]"
                }`}
                aria-disabled={items.length < 2}
                tabIndex={items.length < 2 ? -1 : undefined}
                style={{ pointerEvents: items.length < 2 ? 'none' : 'auto' }}
              >
                {items.length < 2 ? "Añade al menos 2 productos" : "Comparar Componentes"}
              </Link>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
