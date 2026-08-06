"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useCompareStore } from '@/store/useCompareStore';
import { getComponentNotes } from '@/lib/scoring/index';
import { getComboNotes } from '@/lib/scoringCombos';
import EmptyState from './EmptyState';
import SearchModal from './SearchModal';
import CompareProductCard from './CompareProductCard';
import CompareSpecsTable from './CompareSpecsTable';
import {
  applyComboPriceOverrides,
  getComboTotalPrice,
  getProductPrice,
  isComboItem,
} from './comparisonUtils';
import type { ComparisonMode, ComboPriceOverrides } from './comparisonUtils';

interface ComparatorClientProps {
  initialItems: any[];
  globalCurrency: string;
}

function getCurrentPrice(
  item: any,
  currency: string,
  evaluatedPrices: Record<string | number, number>,
  comboPriceOverrides: Record<string | number, ComboPriceOverrides>,
): number {
  if (isComboItem(item)) {
    return getComboTotalPrice(item, currency, comboPriceOverrides[item.id] || {});
  }

  return evaluatedPrices[item.id] !== undefined
    ? evaluatedPrices[item.id]
    : getProductPrice(item, currency);
}

function getItemNotes(
  item: any,
  currency: string,
  currentPrice: number,
  comboOverrides: ComboPriceOverrides,
) {
  if (isComboItem(item)) {
    return getComboNotes(applyComboPriceOverrides(item, currency, comboOverrides), currency) || {};
  }

  const priceUSD = currency === 'EUR' ? currentPrice * 1.08 : currentPrice;
  return getComponentNotes(item, priceUSD) || {};
}

export default function ComparatorClient({ initialItems, globalCurrency }: ComparatorClientProps) {
  const router = useRouter();

  const items = useCompareStore((state) => state.items);
  const clearCompare = useCompareStore((state) => state.clearCompare);
  const addItem = useCompareStore((state) => state.addItem);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>(() => (
    items.some((item) => isComboItem(item)) ? 'combos' : 'components'
  ));
  const [evaluatedPrices, setEvaluatedPrices] = useState<Record<string | number, number>>({});
  const [comboPriceOverrides, setComboPriceOverrides] = useState<
    Record<string | number, ComboPriceOverrides>
  >({});

  useEffect(() => {
    if (initialItems.length > 0 && items.length === 0) {
      initialItems.forEach((item) => {
        addItem({
          ...item,
          price: getCurrentPrice(item, globalCurrency, {}, {}),
          currency: globalCurrency,
        });
      });
    }
  }, [initialItems, items.length, addItem, globalCurrency]);

  useEffect(() => {
    if (items.length === 0) {
      router.replace('/comparator', { scroll: false });
    } else {
      const pathSlugs = items.map((item) => item.slug).join('/');
      router.replace(`/comparator/${pathSlugs}?currency=${globalCurrency}`, { scroll: false });
    }
  }, [items, router, globalCurrency]);

  const maxScoresByCategory = useMemo(() => {
    const maxes: Record<string, number> = {};

    items.forEach((item) => {
      const currentPrice = getCurrentPrice(item, globalCurrency, evaluatedPrices, comboPriceOverrides);
      const notes = getItemNotes(
        item,
        globalCurrency,
        currentPrice,
        comboPriceOverrides[item.id] || {},
      );

      Object.entries(notes).forEach(([category, score]) => {
        const numScore = Number(score) || 0;
        if (maxes[category] === undefined || numScore > maxes[category]) {
          maxes[category] = numScore;
        }
      });
    });

    return maxes;
  }, [items, evaluatedPrices, comboPriceOverrides, globalCurrency]);

  const masterCategories = useMemo(() => {
    const categoriesSet = new Set<string>();

    items.forEach((item) => {
      const currentPrice = getCurrentPrice(item, globalCurrency, evaluatedPrices, comboPriceOverrides);
      const notes = getItemNotes(
        item,
        globalCurrency,
        currentPrice,
        comboPriceOverrides[item.id] || {},
      );

      Object.keys(notes).forEach((category) => {
        const normalizedCategory = category.toLowerCase();
        if (
          !normalizedCategory.includes('precio') &&
          !normalizedCategory.includes('price') &&
          !normalizedCategory.includes('calidad')
        ) {
          categoriesSet.add(category);
        }
      });
    });

    return Array.from(categoriesSet);
  }, [items, evaluatedPrices, comboPriceOverrides, globalCurrency]);

  if (items.length === 0) {
    return (
      <>
        <EmptyState onOpenModal={() => setIsModalOpen(true)} />
        <SearchModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          comparisonMode={comparisonMode}
          setComparisonMode={setComparisonMode}
          globalCurrency={globalCurrency}
        />
      </>
    );
  }

  const hasSpace = items.length < 3;
  const totalColumns = hasSpace ? items.length + 1 : 3;
  const maxWidthClass = totalColumns === 2 ? 'max-w-2xl' : 'max-w-5xl';

  return (
    <div className="flex flex-col items-center w-full px-0 md:px-4 py-8 animate-in fade-in duration-300">
      <div className={`w-full ${maxWidthClass} bg-zinc-950/50 border border-zinc-900 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ease-out`}>
        <div
          className="flex overflow-x-auto snap-x snap-mandatory divide-x divide-zinc-900 md:grid md:divide-y-0 md:divide-x md:divide-zinc-900 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const itemComboOverrides = comboPriceOverrides[item.id] || {};
            const currentPrice = getCurrentPrice(
              item,
              globalCurrency,
              evaluatedPrices,
              comboPriceOverrides,
            );

            return (
              <CompareProductCard
                key={item.id}
                product={item}
                globalCurrency={globalCurrency}
                displayedPrice={currentPrice}
                setDisplayedPrice={(newPrice) => {
                  if (!isComboItem(item)) {
                    setEvaluatedPrices((previous) => ({ ...previous, [item.id]: newPrice }));
                  }
                }}
                comboPriceOverrides={itemComboOverrides}
                setComboPriceOverrides={(overrides) => {
                  setComboPriceOverrides((previous) => ({ ...previous, [item.id]: overrides }));
                }}
                maxScores={maxScoresByCategory}
                masterCategories={masterCategories}
              />
            );
          })}

          {hasSpace && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex flex-col items-center justify-center p-6 h-full min-h-[380px] w-1/2 shrink-0 snap-start md:w-full text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/10 transition-all duration-300 group cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-zinc-800 bg-zinc-950 text-zinc-500 group-hover:text-white group-hover:border-zinc-700 transition-colors">
                <Plus size={16} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] mt-4">
                Añadir {comparisonMode === 'combos' ? 'Combo' : 'Componente'}
              </span>
            </button>
          )}
        </div>
      </div>

      <CompareSpecsTable items={items} />

      <div className="mt-12 flex justify-center">
        <button
          onClick={() => {
            setEvaluatedPrices({});
            setComboPriceOverrides({});
            clearCompare();
          }}
          className="rounded-xl border border-zinc-900 hover:border-red-900/20 bg-zinc-950/40 px-5 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:text-red-400 transition-all cursor-pointer active:scale-95"
        >
          Limpiar Todo
        </button>
      </div>

      <SearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        comparisonMode={comparisonMode}
        setComparisonMode={setComparisonMode}
        globalCurrency={globalCurrency}
      />
    </div>
  );
}
