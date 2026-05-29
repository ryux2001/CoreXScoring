import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import ComparatorClient from './components/ComparatorClient';

interface ComparatorPageProps {
  params: Promise<{
    slugs?: string[]; // Captura /comparator/cpu-1/cpu-2 como ['cpu-1', 'cpu-2']
  }>;
}

export default async function ComparatorPage({ params }: ComparatorPageProps) {
  const resolvedParams = await params;
  const slugs = resolvedParams.slugs || [];

  let initialProducts: any[] = [];

  // Si hay slugs en la ruta de la carpeta, los buscamos en Supabase en el servidor
  if (slugs.length > 0) {
    const { data } = await supabase
      .from('products_with_priority')
      .select('id, slug, name, type, brand, price_base_usd, price_base_eur, specs, compatibility, release_date')
      .in('slug', slugs);

    if (data) {
      // Mantenemos el orden exacto en el que venían en la URL
      initialProducts = slugs
        .map((slug) => data.find((p) => p.slug === slug))
        .filter(Boolean);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-black p-6 relative overflow-hidden">
      <ComparatorClient initialProducts={initialProducts} />
    </main>
  );
}