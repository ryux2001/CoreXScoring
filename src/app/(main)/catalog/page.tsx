import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/ui/card/Card'
import FilterBar from './components/FilterBar'
import Pagination from './components/Pagination' // Importamos el nuevo componente

interface CatalogPageProps {
  searchParams: Promise<{
    q?: string;
    brand?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
    currency?: string;
    page?: string; // Capturamos la página
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const { q, brand, type, minPrice, maxPrice, currency = 'USD', page = '1' } = params;

  // Lógica de Paginación
  const currentPage = parseInt(page);
  const itemsPerPage = 12;
  const from = (currentPage - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  const priceColumn = currency === 'EUR' ? 'price_base_eur' : 'price_base_usd';

  // 1. Construir consulta con RANGO (.range)
  let query = supabase
    .from("products_with_priority")
    .select(`id, slug, name, type, brand, ${priceColumn}, specs, compatibility, release_date`, { count: 'exact' });

  query = query
  .order('priority', { ascending: true })       // 1. CPUs y GPUs primero
  .order('release_date', { ascending: false }) // 2. Dentro de eso, lo más nuevo primero
  .range(from, to);                            // 3. Paginación
  
  if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%`);
  if (brand) query = query.in("brand", brand.split(","));
  if (type) query = query.eq("type", type);
  if (minPrice) query = query.gte(priceColumn, parseFloat(minPrice));
  if (maxPrice) query = query.lte(priceColumn, parseFloat(maxPrice));

  // Aplicamos el límite de 12 productos por página
  query = query.range(from, to).order('release_date', { ascending: false });

  const [productsResponse, brandsResponse, typesResponse] = await Promise.all([
    query,
    supabase.from("products").select("brand"),
    supabase.from("products").select("type")
  ]);

  const { data: products, count, error } = productsResponse;
  const totalPages = Math.ceil((count || 0) / itemsPerPage);

  const availableBrands = Array.from(new Set(brandsResponse.data?.map(p => p.brand))).filter(Boolean).sort() as string[];
  const availableTypes = Array.from(new Set(typesResponse.data?.map(p => p.type))).filter(Boolean).sort() as string[];

  if (error) return <div className="font-technical p-20 text-center text-white">Error: {error.message}</div>;

  return (
    <main className="font-technical min-h-screen bg-black py-3 px-2.5 sm:p-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl">
        
        <FilterBar 
          count={count || 0} 
          availableBrands={availableBrands}
          availableTypes={availableTypes}
          currency={currency}
        />

        <div className="grid grid-cols-1 gap-4 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products?.map((product: any) => (
            <Card 
              key={product.id}
              id={product.id}
              slug={product.slug}
              type={product.type}
              brand={product.brand}
              name={product.name}
              price={product[priceColumn] || 0} 
              currency={currency}
              specs={product.specs}
              compatibility={product.compatibility}
              release_date={product.release_date}
              wholeCardClickable
            />
          ))}
        </div>

        {/* CONTROLES DE PAGINACIÓN */}
        <Pagination currentPage={currentPage} totalPages={totalPages} />

        {products?.length === 0 && (
          <div className="flex h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50">
            <p className="text-zinc-500 font-medium tracking-tight">
              No hay productos que coincidan con estos filtros.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
