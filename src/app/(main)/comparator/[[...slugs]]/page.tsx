import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import ComparatorClient from './components/ComparatorClient';
import { normalizeCombo } from './components/comparisonUtils';

interface ComparatorPageProps {
  params: Promise<{ slugs?: string[] }>;
  searchParams: Promise<{ currency?: string }>;
}

export default async function ComparatorPage({ params, searchParams }: ComparatorPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const slugs = resolvedParams.slugs || [];
  const currency = (resolvedSearchParams.currency || 'USD').toUpperCase();
  let initialItems: any[] = [];

  if (slugs.length > 0) {
    const [{ data: products }, { data: combos }] = await Promise.all([
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
    ]);

    initialItems = slugs
      .map((slug) => {
        const product = products?.find((item) => item.slug === slug);
        if (product) return product;

        const combo = combos?.find((item) => item.slug === slug);
        return combo ? normalizeCombo(combo, currency) : null;
      })
      .filter(Boolean);
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-black p-1 md:p-6 relative overflow-hidden">
      <ComparatorClient initialItems={initialItems} globalCurrency={currency} />
    </main>
  );
}
