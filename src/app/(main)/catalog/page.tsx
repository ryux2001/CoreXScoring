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
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const { q, brand, type, minPrice, maxPrice } = params;

  // 1. CONSULTAS DINÁMICAS EN PARALELO
  // Ejecutamos la búsqueda de productos y la obtención de filtros únicos al mismo tiempo
  const [productsResponse, brandsResponse, typesResponse] = await Promise.all([
    // Consulta principal de productos (con filtros)
    (() => {
      let qry = supabase
        .from("products")
        .select("id, name, type, brand, price_base, specs, compatibility, release_date", { count: 'exact' });

      if (q) qry = qry.or(`name.ilike.%${q}%,brand.ilike.%${q}%`);
      if (brand) qry = qry.in("brand", brand.split(","));
      if (type) qry = qry.eq("type", type);
      if (minPrice) qry = qry.gte("price_base", parseFloat(minPrice));
      if (maxPrice) qry = qry.lte("price_base", parseFloat(maxPrice));
      
      return qry;
    })(),

    // Obtener todas las MARCAS únicas que existen en la DB
    supabase.from("products").select("brand"),

    // Obtener todos los TIPOS únicos que existen en la DB
    supabase.from("products").select("type")
  ]);

  const { data: products, count, error } = productsResponse;

  // 2. PROCESAMIENTO DE DATOS DINÁMICOS PARA FILTROS
  // Extraemos valores únicos y limpiamos (quitamos duplicados y ordenamos)
  const availableBrands = Array.from(new Set(brandsResponse.data?.map(p => p.brand)))
    .filter(Boolean)
    .sort() as string[];

  const availableTypes = Array.from(new Set(typesResponse.data?.map(p => p.type)))
    .filter(Boolean)
    .sort() as string[];

  if (error) return <div className="text-white p-20 text-center">Error: {error.message}</div>;

  return (
    <main className="min-h-screen bg-black p-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl">
        
        {/* Pasamos las marcas y tipos que vienen DIRECTO de la DB */}
        <FilterBar 
          count={count || 0} 
          availableBrands={availableBrands}
          availableTypes={availableTypes}
        />

        {/* Grid de Productos */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products?.map((product) => (
            <Card 
              key={product.id}
              type={product.type}
              brand={product.brand}
              name={product.name}
              price_base={product.price_base || 0}
              specs={product.specs}
              compatibility={product.compatibility}
              release_date={product.release_date}
            />
          ))}
        </div>

        {/* Estado Vacío */}
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