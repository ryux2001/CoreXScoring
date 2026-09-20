'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { getComboPartPrice } from '@/lib/scoringCombos';
import { getComponentIcon } from '@/lib/catalog/component-icons';
import { getComponentNotes } from '@/lib/scoring';
import { getCatalogScoreLabelKey } from '@/lib/catalog/presentation';

interface ComboMainCardProps {
  combo?: object;
  currency?: string;
  showHeader?: boolean;
  className?: string;
}

type ComboComponent = Record<string, unknown> & {
  brand?: string;
  name: string;
  slug: string;
};

type ComboData = Record<string, unknown> & {
  category?: string;
  cpu?: ComboComponent;
  gpu?: ComboComponent;
  ram?: ComboComponent;
  title?: string;
};

export default function ComboMainCard({
  combo,
  currency = 'USD',
  showHeader = true,
  className = '',
}: ComboMainCardProps) {
  const t = useTranslations('combos');
  const tCatalog = useTranslations('catalog');
  const comboData = (combo ?? {}) as ComboData;
  const draftCurrency = comboData.priceModes ? currency : undefined;

  // Configuración de las partes con su etiqueta y clave de custom_price
  const parts = [
    { key: 'cpu', role: t('componentRoles.cpu'), item: comboData.cpu },
    { key: 'gpu', role: t('componentRoles.gpu'), item: comboData.gpu },
    { key: 'ram', role: t('componentRoles.ram'), item: comboData.ram },
  ].filter((part): part is { key: 'cpu' | 'gpu' | 'ram'; role: string; item: ComboComponent } => Boolean(part.item));

  // Helper para obtener el precio de cada componente respetando custom_price o base_price
  const getPartPrice = (key: string) => {
    const isEur = currency === 'EUR';
    const price = getComboPartPrice(
      comboData,
      key as 'cpu' | 'gpu' | 'ram',
      currency,
      draftCurrency,
    );

    const symbol = isEur ? '€' : '$';

    return isEur ? `${price}${symbol}` : `${symbol}${price}`;
  };

  const getPartValueScore = (key: string, item: ComboComponent) => {
    const evaluatedPrice = getComboPartPrice(
      comboData,
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
      {comboData.category}
          </span>
          <h1 className="mt-2 text-xl font-black leading-snug tracking-tighter text-white md:text-2xl">
            {comboData.title}
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
                aria-label={`${part.item.name}. ${tCatalog(getCatalogScoreLabelKey('Calidad Precio'))}: ${valueScore.toFixed(1)}`}
              >

                  {/* Bloque Nombre + Icono */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 overflow-hidden">
                    
                    {/* Icono visible también en móvil, con tamaño reducido */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-900 bg-zinc-950 sm:h-10 sm:w-10 sm:rounded-xl">
                      {iconSrc && (
                        <Image
                          src={iconSrc}
                           alt={part.role}
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
                       title={`${tCatalog(getCatalogScoreLabelKey('Calidad Precio'))}: ${valueScore.toFixed(1)}`}
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
