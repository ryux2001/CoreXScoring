import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/ui/card/Card'
import FilterBar from './components/FilterBar'

interface CatalogPageProps {
  searchParams: Promise<{
    q?: string;
    brand?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
    currency?: string; // Añadimos moneda
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const { q, brand, type, minPrice, maxPrice, currency = 'USD' } = params;

  // Definimos qué columna de precio usar en la base de datos
  const priceColumn = currency === 'EUR' ? 'price_base_eur' : 'price_base_usd';

  let query = supabase
    .from("products")
    .select(`id, name, type, brand, ${priceColumn}, specs, compatibility, release_date`, { count: 'exact' });

  if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%`);
  if (brand) query = query.in("brand", brand.split(","));
  if (type) query = query.eq("type", type);

  // Filtramos usando la columna de la moneda actual
  if (minPrice) query = query.gte(priceColumn, parseFloat(minPrice));
  if (maxPrice) query = query.lte(priceColumn, parseFloat(maxPrice));

  const [productsResponse, brandsResponse, typesResponse] = await Promise.all([
    query,
    supabase.from("products").select("brand"),
    supabase.from("products").select("type")
  ]);

  const { data: products, count, error } = productsResponse;

  const availableBrands = Array.from(new Set(brandsResponse.data?.map(p => p.brand))).filter(Boolean).sort() as string[];
  const availableTypes = Array.from(new Set(typesResponse.data?.map(p => p.type))).filter(Boolean).sort() as string[];

  if (error) return <div className="text-white p-20 text-center">Error: {error.message}</div>;

  return (
    <main className="min-h-screen bg-black p-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl">
        <FilterBar 
          count={count || 0} 
          availableBrands={availableBrands}
          availableTypes={availableTypes}
          currency={currency} // Pasamos la moneda actual
        />

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products?.map((product: any) => (
            <Card 
              key={product.id}
              type={product.type}
              brand={product.brand}
              name={product.name}
              // Pasamos el precio de la columna dinámica y la moneda
              price={product[priceColumn] || 0} 
              currency={currency}
              specs={product.specs}
              compatibility={product.compatibility}
              release_date={product.release_date}
            />
          ))}
        </div>
        {/* ... (empty state) */}
      </div>
    </main>
  );
}