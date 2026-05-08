import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/ui/card/Card'

interface CatalogPageProps {
  searchParams: Promise<{
    q?: string; // Capturamos el parámetro 'q' de la URL
  }>
}

export default async function CatalogPage({searchParams}: CatalogPageProps) {
  const params = await searchParams
  const query = params.q || "";
  
  // Extraemos todos los campos técnicos necesarios para la lógica de la Card
  let supabaseQuery = supabase
    .from("products")
    .select(`
      id, 
      name, 
      type, 
      price_base, 
      specs, 
      compatibility, 
      release_date,
      brand
    `)
  // Si hay algo en la barra de búsqueda, aplicamos el filtro ILIKE (no distingue mayúsculas)
  if (query) {
    // Busca coincidencias en el nombre O en la marca (ej: busca "Intel" o "i5")
    supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
  }
  
  const { data: products, error } = await supabaseQuery;
  
  if(error) {
    return (
      <main className="flex h-screen items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-red-500 font-bold text-xl">Error de Conexión</p>
          <p className="text-zinc-500 mt-2">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl">
        
        <div className="mb-16">
          <h1 className="text-5xl font-black tracking-tighter text-white md:text-6xl">
            Catálogo.
          </h1>
          <p className="mt-6 text-lg text-zinc-400 max-w-2xl">
            Hardware de alto rendimiento seleccionado para entusiastas. 
          </p>
          
          {/* Opcional: Feedback visual de que estamos filtrando */}
          {query && (
            <p className="mt-4 text-sm font-medium text-[#0070F3]">
              Mostrando resultados para: "{query}"
            </p>
          )}
        </div>

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

        {/* Estado vacío si no se encuentra nada */}
        {products?.length === 0 && (
          <div className="flex h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50">
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
              <span className="text-zinc-600 text-2xl font-bold">!</span>
            </div>
            <p className="text-zinc-500 font-medium tracking-tight">
              {query 
                ? `No se encontraron productos para "${query}"` 
                : "No se han encontrado componentes en la base de datos."}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}