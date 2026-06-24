import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import ComparatorClient from './components/ComparatorClient';

interface ComparatorPageProps {
  params: Promise<{ slugs?: string[] }>;
  searchParams: Promise<{ currency?: string }>; // 🚀 Capturamos la moneda de la URL
}

export default async function ComparatorPage({ params, searchParams }: ComparatorPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const slugs = resolvedParams.slugs || [];
  const currency = resolvedSearchParams.currency || 'USD'; // 🚀 Por defecto USD si no hay parámetro

  let initialProducts: any[] = [];

  if (slugs.length > 0) {
    const { data } = await supabase
  .from('products_with_priority')
  .select('*') // 🚀 Trae todas las especificaciones para el motor de scoring
  .in('slug', slugs);

    if (data) {
      initialProducts = slugs
        .map((slug) => data.find((p) => p.slug === slug))
        .filter(Boolean);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-black p-1 md:p-6 relative overflow-hidden">
      {/* 🚀 Le pasamos la moneda activa del sistema al cliente */}
      <ComparatorClient initialProducts={initialProducts} globalCurrency={currency} />
    </main>
  );
}