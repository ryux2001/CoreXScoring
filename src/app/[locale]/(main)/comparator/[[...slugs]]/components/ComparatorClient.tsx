"use client";

import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Plus } from 'lucide-react';
import { useCompareStore, type CompareProduct } from '@/store/useCompareStore';
import { supabase } from '@/lib/supabaseClient';
import { convertPrice } from '@/lib/currency';
import { getComponentNotes } from '@/lib/scoring/index';
import { getComboNotes } from '@/lib/scoringCombos';
import { getBuildNotes } from '@/lib/scoringBuilds';
import EmptyState from './EmptyState';
import SearchModal from './SearchModal';
import CompareProductCard from './CompareProductCard';
import CompareSpecsTable from './CompareSpecsTable';
import ComparatorFpsIsland from './ComparatorFpsIsland';
import type { GameData } from '@/lib/fpsCombos/types';
import {
  applyBuildPriceOverrides,
  applyComboPriceOverrides,
  getBuildTotalPrice,
  getComboTotalPrice,
  getProductPrice,
  isBuildItem,
  isComboItem,
} from './comparisonUtils';
import type {
  BuildPriceOverrides,
  ComparisonMode,
  ComboPriceOverrides,
} from './comparisonUtils';
import { useTranslations } from 'next-intl';

interface ComparatorClientProps {
  initialItems: CompareProduct[];
  globalCurrency: string;
  games: GameData[];
}

type ScrollSource = 'comparison' | 'fps';

function getCurrentPrice(
  item: CompareProduct,
  currency: string,
  evaluatedPrices: Record<string | number, number>,
  comboPriceOverrides: Record<string | number, ComboPriceOverrides>,
  buildPriceOverrides: Record<string | number, BuildPriceOverrides>,
): number {
  if (isComboItem(item)) {
    return getComboTotalPrice(item, currency, comboPriceOverrides[item.id] || {});
  }

  if (isBuildItem(item)) {
    return getBuildTotalPrice(item, currency, buildPriceOverrides[item.id] || {});
  }

  return evaluatedPrices[item.id] !== undefined
    ? evaluatedPrices[item.id]
    : getProductPrice(item, currency);
}

function getItemNotes(
  item: CompareProduct,
  currency: string,
  currentPrice: number,
  comboOverrides: ComboPriceOverrides,
  buildOverrides: BuildPriceOverrides,
) {
  if (isComboItem(item)) {
    return getComboNotes(applyComboPriceOverrides(item, currency, comboOverrides), currency) || {};
  }

  if (isBuildItem(item)) {
    return getBuildNotes(applyBuildPriceOverrides(item, currency, buildOverrides), currency) || {};
  }

  const priceUSD = convertPrice(currentPrice, currency, 'USD');
  return getComponentNotes(item as unknown as Record<string, unknown>, priceUSD) || {};
}

export default function ComparatorClient({ initialItems, globalCurrency, games }: ComparatorClientProps) {
  const t = useTranslations('comparator');
  const router = useRouter();

  const items = useCompareStore((state) => state.items);
  const clearCompare = useCompareStore((state) => state.clearCompare);
  const evaluatedPrices = useCompareStore((state) => state.evaluatedPrices);
  const setEvaluatedPrice = useCompareStore((state) => state.setEvaluatedPrice);
  const replaceItems = useCompareStore((state) => state.replaceItems);
  const applyComparisonSnapshot = useCompareStore((state) => state.applyComparisonSnapshot);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>(() => (
    items.some((item) => isBuildItem(item))
      ? 'builds'
      : items.some((item) => isComboItem(item))
        ? 'combos'
        : 'components'
  ));
  const [comboPriceOverrides, setComboPriceOverrides] = useState<
    Record<string | number, ComboPriceOverrides>
  >({});
  const [buildPriceOverrides, setBuildPriceOverrides] = useState<
    Record<string | number, BuildPriceOverrides>
  >({});
  const comparisonScrollRef = useRef<HTMLDivElement>(null);
  const fpsScrollRef = useRef<HTMLDivElement>(null);
  const scrollSyncFrameRef = useRef<number | null>(null);
  const pendingScrollSourceRef = useRef<ScrollSource | null>(null);
  const suppressedScrollRef = useRef<{ source: ScrollSource; scrollLeft: number } | null>(null);
  const hasHydratedStoredProducts = useRef(false);
  const [hydratedRouteKey, setHydratedRouteKey] = useState('');
  const initialItemsKey = initialItems.map((item) => `${item.id}:${item.slug}`).join('|');

  const syncComparisonScroll = (source: ScrollSource) => {
    const sourceElement = source === 'comparison'
      ? comparisonScrollRef.current
      : fpsScrollRef.current;
    const targetElement = source === 'comparison'
      ? fpsScrollRef.current
      : comparisonScrollRef.current;

    if (!sourceElement || !targetElement) return;

    const suppressedScroll = suppressedScrollRef.current;
    if (suppressedScroll?.source === source) {
      if (Math.abs(sourceElement.scrollLeft - suppressedScroll.scrollLeft) <= 1) {
        suppressedScrollRef.current = null;
        return;
      }

      suppressedScrollRef.current = null;
    }

    pendingScrollSourceRef.current = source;
    if (scrollSyncFrameRef.current !== null) return;

    scrollSyncFrameRef.current = window.requestAnimationFrame(() => {
      scrollSyncFrameRef.current = null;

      const pendingSource = pendingScrollSourceRef.current;
      pendingScrollSourceRef.current = null;
      if (!pendingSource) return;

      const pendingSourceElement = pendingSource === 'comparison'
        ? comparisonScrollRef.current
        : fpsScrollRef.current;
      const pendingTargetElement = pendingSource === 'comparison'
        ? fpsScrollRef.current
        : comparisonScrollRef.current;

      if (!pendingSourceElement || !pendingTargetElement) return;

      const nextScrollLeft = pendingSourceElement.scrollLeft;
      if (Math.abs(pendingTargetElement.scrollLeft - nextScrollLeft) > 1) {
        pendingTargetElement.scrollLeft = nextScrollLeft;
        suppressedScrollRef.current = {
          source: pendingSource === 'comparison' ? 'fps' : 'comparison',
          scrollLeft: pendingTargetElement.scrollLeft,
        };
      }
    });
  };

  useEffect(() => {
    if (initialItems.length === 0 || hydratedRouteKey === initialItemsKey) return;

    const routeItems = initialItems.map((item) => ({
      ...item,
      price: getCurrentPrice(item, globalCurrency, {}, {}, {}),
      currency: globalCurrency,
    }));
    const result = applyComparisonSnapshot(routeItems, {});
    if (!result.success) {
      console.error('Unable to load comparison from URL:', result.error);
      return;
    }

    // Editorial and shared comparison URLs are the source of truth, never stale local storage.
    startTransition(() => {
      setComboPriceOverrides({});
      setBuildPriceOverrides({});
      setComparisonMode(
        routeItems.some((item) => isBuildItem(item))
          ? 'builds'
          : routeItems.some((item) => isComboItem(item))
            ? 'combos'
            : 'components',
      );
      setHydratedRouteKey(initialItemsKey);
    });
  }, [applyComparisonSnapshot, globalCurrency, hydratedRouteKey, initialItems, initialItemsKey]);

  useEffect(() => {
    // A URL comparison owns the store; local hydration must never overwrite it.
    if (initialItems.length > 0) return;
    if (hasHydratedStoredProducts.current || items.length === 0) return;

    hasHydratedStoredProducts.current = true;
    let isCancelled = false;

    const hydrateStoredProducts = async () => {
      const componentItems = items.filter(
        (item) => !isComboItem(item) && !isBuildItem(item),
      );
      if (componentItems.length === 0) return;

      const productIds = componentItems.map((item) => String(item.id));
      const { data: completeProducts, error } = await supabase
        .from('products_with_priority')
        .select('*')
        .in('id', productIds);

      if (error || !completeProducts) {
        console.error('Error hydrating comparison products:', error);
        return;
      }
      if (isCancelled) return;

      const fullProducts = completeProducts as Array<CompareProduct & Record<string, unknown>>;

      const productsById = new Map(
        fullProducts.map((product) => [String(product.id), product]),
      );
      const productsBySlug = new Map(
        fullProducts.map((product) => [product.slug, product]),
      );

      const hydratedItems = items.map((item) => {
        if (isComboItem(item) || isBuildItem(item)) return item;

        const completeProduct =
          productsById.get(String(item.id)) || productsBySlug.get(item.slug);

        if (!completeProduct) return item;

        return {
          ...item,
          ...completeProduct,
          price: item.price ?? completeProduct.price,
          currency: item.currency ?? globalCurrency,
          comparisonType: 'product',
        };
      });

      const changed = hydratedItems.some((item, index) => item !== items[index]);
      if (changed && !isCancelled) replaceItems(hydratedItems);
    };

    void hydrateStoredProducts();
    return () => {
      isCancelled = true;
    };
  }, [items, replaceItems, globalCurrency, initialItems.length]);

  useEffect(() => {
    if (initialItems.length > 0 && hydratedRouteKey !== initialItemsKey) return;

    if (items.length === 0) {
      router.replace('/comparator', { scroll: false });
    } else {
      const pathSlugs = items.map((item) => item.slug).join('/');
      router.replace(`/comparator/${pathSlugs}?currency=${globalCurrency}`, { scroll: false });
    }
  }, [items, router, globalCurrency, hydratedRouteKey, initialItems.length, initialItemsKey]);

  const maxScoresByCategory = useMemo(() => {
    const maxes: Record<string, number> = {};

    items.forEach((item) => {
      const currentPrice = getCurrentPrice(
        item,
        globalCurrency,
        evaluatedPrices,
        comboPriceOverrides,
        buildPriceOverrides,
      );
      const notes = getItemNotes(
        item,
        globalCurrency,
        currentPrice,
        comboPriceOverrides[item.id] || {},
        buildPriceOverrides[item.id] || {},
      );

      Object.entries(notes).forEach(([category, score]) => {
        const numScore = Number(score) || 0;
        if (maxes[category] === undefined || numScore > maxes[category]) {
          maxes[category] = numScore;
        }
      });
    });

    return maxes;
  }, [items, evaluatedPrices, comboPriceOverrides, buildPriceOverrides, globalCurrency]);

  const masterCategories = useMemo(() => {
    const categoriesSet = new Set<string>();

    items.forEach((item) => {
      const currentPrice = getCurrentPrice(
        item,
        globalCurrency,
        evaluatedPrices,
        comboPriceOverrides,
        buildPriceOverrides,
      );
      const notes = getItemNotes(
        item,
        globalCurrency,
        currentPrice,
        comboPriceOverrides[item.id] || {},
        buildPriceOverrides[item.id] || {},
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
  }, [items, evaluatedPrices, comboPriceOverrides, buildPriceOverrides, globalCurrency]);

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
          ref={comparisonScrollRef}
          onScroll={() => syncComparisonScroll('comparison')}
          className="flex overflow-x-auto snap-x snap-mandatory divide-x divide-zinc-900 md:grid md:divide-y-0 md:divide-x md:divide-zinc-900 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const itemComboOverrides = comboPriceOverrides[item.id] || {};
            const itemBuildOverrides = buildPriceOverrides[item.id] || {};
            const currentPrice = getCurrentPrice(
              item,
              globalCurrency,
              evaluatedPrices,
              comboPriceOverrides,
              buildPriceOverrides,
            );

            return (
              <CompareProductCard
                key={item.id}
                product={item}
                globalCurrency={globalCurrency}
                displayedPrice={currentPrice}
                setDisplayedPrice={(newPrice) => {
                  if (!isComboItem(item) && !isBuildItem(item)) {
                    setEvaluatedPrice(item.id, newPrice);
                  }
                }}
                comboPriceOverrides={itemComboOverrides}
                setComboPriceOverrides={(overrides) => {
                  setComboPriceOverrides((previous) => ({ ...previous, [item.id]: overrides }));
                }}
                buildPriceOverrides={itemBuildOverrides}
                setBuildPriceOverrides={(overrides) => {
                  setBuildPriceOverrides((previous) => ({ ...previous, [item.id]: overrides }));
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
                {t('addItem', { type: comparisonMode === 'combos' ? t('combo') : comparisonMode === 'builds' ? t('build') : t('component') })}
              </span>
            </button>
          )}
        </div>
      </div>

      <ComparatorFpsIsland
        items={items}
        games={games}
        scrollContainerRef={fpsScrollRef}
        onScroll={() => syncComparisonScroll('fps')}
      />

      <CompareSpecsTable items={items} />

      <div className="mt-12 flex justify-center">
        <button
          onClick={() => {
            setComboPriceOverrides({});
            setBuildPriceOverrides({});
            clearCompare();
          }}
          className="rounded-xl border border-zinc-900 hover:border-red-900/20 bg-zinc-950/40 px-5 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:text-red-400 transition-all cursor-pointer active:scale-95"
        >
          {t('clearAll')}
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
