import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { resolveRequestCurrency } from '@/lib/serverCurrency';
import ComparatorClient from './components/ComparatorClient';
import { normalizeBuild, normalizeCombo } from './components/comparisonUtils';
import type { GameData } from '@/lib/fpsCombos/types';
import type { CompareProduct } from '@/store/useCompareStore';
import type { Locale } from '@/i18n/routing';
import { localizeBuilds, localizeCombos, localizeProducts } from '@/lib/content/translations';

interface ComparatorPageProps {
  params: Promise<{ locale: string; slugs?: string[] }>;
  searchParams: Promise<{ currency?: string }>;
}

export default async function ComparatorPage({ params, searchParams }: ComparatorPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const slugs = resolvedParams.slugs || [];
  const currency = await resolveRequestCurrency(resolvedSearchParams.currency);
  let initialItems: CompareProduct[] = [];
  const gamesPromise = supabase
    .from('games')
    .select('id, slug, name, limite_motor_fps, cpu_score_ideal, ram_minima_gb, vram_minima_gb, gpu_fps_base');

  if (slugs.length > 0) {
    const [{ data: products }, { data: combos }, { data: builds }] = await Promise.all([
      supabase
        .from('products_with_priority')
        .select('*')
        .in('slug', slugs),
      supabase
        .from('combos')
        .select(`
          *,
          cpu:products!cpu_id(*),
          gpu:products!gpu_id(*),
          ram:products!ram_id(*)
        `)
        .eq('is_active', true)
        .in('slug', slugs),
      supabase
        .from('builds')
        .select(`
          *,
          cpu:products!cpu_id(*),
          gpu:products!gpu_id(*),
          ram:products!ram_id(*),
          motherboard:products!motherboard_id(*),
          storage:products!storage_id(*),
          psu:products!psu_id(*)
        `)
        .eq('is_active', true)
        .in('slug', slugs),
    ]);

    const [localizedProducts, localizedCombos, localizedBuilds] = await Promise.all([
      localizeProducts(supabase, (products || []) as Record<string, unknown>[], resolvedParams.locale as Locale),
      localizeCombos(supabase, (combos || []) as Record<string, unknown>[], resolvedParams.locale as Locale),
      localizeBuilds(supabase, (builds || []) as Record<string, unknown>[], resolvedParams.locale as Locale),
    ]);

    initialItems = slugs
      .map((slug) => {
        const product = localizedProducts.find((item) => item.slug === slug);
        if (product) return product;

        const combo = localizedCombos.find((item) => item.slug === slug);
        if (combo) return normalizeCombo(combo, currency);

        const build = localizedBuilds.find((item) => item.slug === slug);
        return build ? normalizeBuild(build, currency) : null;
      })
      .filter(Boolean);
  }

  const { data: games } = await gamesPromise;

  return (
    <main className="comparator-page font-technical flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-black p-1 md:p-6 relative overflow-x-clip">
      <ComparatorClient
        initialItems={initialItems}
        globalCurrency={currency}
        games={(games || []) as GameData[]}
      />
    </main>
  );
}
