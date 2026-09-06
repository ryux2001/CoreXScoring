import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getComboPartPrice } from '@/lib/scoringCombos';
import { getComponentIcon } from '@/lib/catalog/component-icons';
import { getComponentNotes } from '@/lib/scoring';

interface ComboMainCardProps {
  combo: any;
  currency?: string;
  showHeader?: boolean;
  className?: string;
}

export default function ComboMainCard({
  combo,
  currency = 'USD',
  showHeader = true,
  className = '',
}: ComboMainCardProps) {
  const draftCurrency = combo?.priceModes ? currency : undefined;

  // Configuración de las partes con su etiqueta y clave de custom_price
  const parts = [
    { key: 'cpu', role: 'Procesador', item: combo.cpu },
    { key: 'gpu', role: 'Tarjeta Gráfica', item: combo.gpu },
    { key: 'ram', role: 'Memoria RAM', item: combo.ram },
  ].filter((p) => p.item);

  // Helper para obtener el precio de cada componente respetando custom_price o base_price
  const getPartPrice = (key: string) => {
    const isEur = currency === 'EUR';
    const price = getComboPartPrice(
      combo,
      key as 'cpu' | 'gpu' | 'ram',
      currency,
      draftCurrency,
    );

    const symbol = isEur ? '€' : '$';

    return isEur ? `${price}${symbol}` : `${symbol}${price}`;
  };

  const getPartValueScore = (key: string, item: any) => {
    const evaluatedPrice = getComboPartPrice(
      combo,
      key as 'cpu' | 'gpu' | 'ram',
      'USD',
      draftCurrency,
    );
    const notes = getComponentNotes(item, evaluatedPrice);
    const score = notes['Calidad precio'] ?? notes['Calidad Precio'] ?? 0;

    return Number.isFinite(score) ? score : 0;
  };

  const getValueIndicatorColor = (score: number) => {
    if (score >= 9) return 'bg-purple-500';
    if (score >= 7) return 'bg-blue-500';
    if (score >= 5) return 'bg-emerald-500';
    if (score >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`flex h-full w-full flex-col overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950/40 p-5 shadow-2xl backdrop-blur-sm lg:p-8 ${className}`}>
      {/* Título y Categoría del Combo */}
      {showHeader && (
        <div className="mb-6 lg:mb-8">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            {combo.category}
          </span>
          <h1 className="mt-2 text-xl font-black leading-snug tracking-tighter text-white md:text-2xl">
            {combo.title}
          </h1>
        </div>
      )}

      {/* Lista de Componentes */}
      <div className="flex flex-col gap-4 sm:gap-5 mt-auto w-full">
        {parts.map((part) => {
          const priceFormatted = getPartPrice(part.key);
          const iconSrc = getComponentIcon(part.key);
          const valueScore = getPartValueScore(part.key, part.item);

          return (
            <div key={part.key} className="flex flex-col gap-1.5 w-full min-w-0">
              
              {/* Etiqueta del Componente */}
              <span className="text-[10px] font-display font-black uppercase tracking-[0.15em] text-zinc-500 pl-1">
                {part.role}
              </span>

              {/* Caja Principal (Icono + Nombre + Precio + Calidad/Precio) */}
              <Link
                href={`/catalog/${part.item.slug}?currency=${currency}`}
                className="group flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl border border-zinc-900/60 bg-zinc-900/20 p-3 transition-colors hover:border-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:gap-3 sm:p-3.5"
                aria-label={`Ver ${part.item.name} en el catálogo. Calidad precio: ${valueScore.toFixed(1)}`}
              >

                  {/* Bloque Nombre + Icono */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 overflow-hidden">
                    
                    {/* Icono (Oculto en móvil, visible en sm+) */}
                    <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 border border-zinc-900">
                      {iconSrc && (
                        <Image
                          src={iconSrc}
                          alt={`Icono de ${part.role}`}
                          width={40}
                          height={40}
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    
                    {/* Nombre y Marca */}
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 truncate">
                        {part.item.brand}
                      </span>
                      <span 
                        className="truncate text-xs font-display font-bold text-zinc-200"
                        title={part.item.name}
                      >
                        {part.item.name}
                      </span>
                    </div>
                  </div>

                  {/* Precio e indicador de calidad/precio */}
                  <div className="flex shrink-0 items-center gap-3 pl-1 text-right sm:pl-2">
                    <span className="text-xs sm:text-sm font-black font-display text-white tracking-tight whitespace-nowrap">
                      {priceFormatted}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 shrink-0 rounded-full transition-transform group-hover:scale-125 motion-reduce:animate-none animate-pulse ${getValueIndicatorColor(valueScore)}`}
                      title={`Calidad precio: ${valueScore.toFixed(1)}`}
                    />
                  </div>
              </Link>
            </div>
          );
        })}
      </div>

    </div>
  );
}
