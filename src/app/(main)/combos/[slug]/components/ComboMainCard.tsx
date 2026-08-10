import React from 'react';
import Link from 'next/link';
import { getComboPartPrice } from '@/lib/scoringCombos';

interface ComboMainCardProps {
  combo: any;
  currency?: string;
}

export default function ComboMainCard({ combo, currency = 'USD' }: ComboMainCardProps) {
  // Configuración de las partes con su etiqueta y clave de custom_price
  const parts = [
    { key: 'cpu', role: 'Procesador', item: combo.cpu },
    { key: 'gpu', role: 'Tarjeta Gráfica', item: combo.gpu },
    { key: 'ram', role: 'Memoria RAM', item: combo.ram },
  ].filter((p) => p.item);

  // Helper para obtener el precio de cada componente respetando custom_price o base_price
  const getPartPrice = (key: string) => {
    const isEur = currency === 'EUR';
    const price = getComboPartPrice(combo, key as 'cpu' | 'gpu' | 'ram', currency);

    const symbol = isEur ? '€' : '$';

    return isEur ? `${price}${symbol}` : `${symbol}${price}`;
  };

  return (
    <div className="flex h-full flex-col rounded-3xl border border-zinc-900 bg-zinc-950/40 p-5 lg:p-8 shadow-2xl backdrop-blur-sm w-full overflow-hidden">
      
      {/* Título y Categoría del Combo */}
      <div className="mb-6 lg:mb-8">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
          {combo.category}
        </span>
        <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tighter text-white leading-snug">
          {combo.title}
        </h1>
      </div>

      {/* Lista de Componentes */}
      <div className="flex flex-col gap-4 sm:gap-5 mt-auto w-full">
        {parts.map((part) => {
          const priceFormatted = getPartPrice(part.key);

          return (
            <div key={part.key} className="flex flex-col gap-1.5 w-full min-w-0">
              
              {/* Etiqueta del Componente */}
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 pl-1">
                {part.role}
              </span>

              {/* Fila: Contenedor Principal + Botón Ver */}
              <div className="flex items-stretch gap-2 sm:gap-2.5 w-full min-w-0">
                
                {/* Caja Principal (Icono + Nombre + Precio) */}
                <div className="flex flex-1 min-w-0 items-center justify-between gap-2 sm:gap-3 rounded-2xl border border-zinc-900/60 bg-zinc-900/20 p-3 sm:p-3.5 transition-colors hover:border-zinc-800">
                  
                  {/* Bloque Nombre + Icono */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 overflow-hidden">
                    
                    {/* Icono (Oculto en móvil, visible en sm+) */}
                    <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 border border-zinc-900 text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                      Icon
                    </div>
                    
                    {/* Nombre y Marca */}
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 truncate">
                        {part.item.brand}
                      </span>
                      <span 
                        className="truncate text-xs font-bold text-zinc-200"
                        title={part.item.name}
                      >
                        {part.item.name}
                      </span>
                    </div>
                  </div>

                  {/* Precio del Componente */}
                  <div className="shrink-0 pl-1 sm:pl-2 text-right">
                    <span className="text-xs sm:text-sm font-black text-white tracking-tight whitespace-nowrap">
                      {priceFormatted}
                    </span>
                  </div>

                </div>

                {/* Botón Ver */}
                <Link
                  href={`/catalog/${part.item.slug}?currency=${currency}`}
                  className="flex shrink-0 items-center min-w-17 justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/80 px-3.5 sm:px-4 text-xs font-bold text-zinc-200 transition-all hover:bg-zinc-800 hover:text-white hover:border-zinc-700 active:scale-95"
                >
                  Ver
                </Link>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
