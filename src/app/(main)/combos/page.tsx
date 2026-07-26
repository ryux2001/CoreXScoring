import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import ComboCard from './components/ComboCard';
import ComboCurrencyToggle from './components/ComboCurrencyToggle';


interface CombosPageProps {
  searchParams: Promise<{
    currency?: string;
    q?: string;
    type?: string;
  }>;
}

export default async function CombosPage({ searchParams }: CombosPageProps) {
  const params = await searchParams;
  const currency = (params.currency || 'USD').toUpperCase();

  // 1. Consulta SSR a Supabase
  const { data: combos, error } = await supabase
    .from('combos')
    .select(`
      *,
      cpu:products!cpu_id(*),
      gpu:products!gpu_id(*),
      ram:products!ram_id(*)
    `)
    .eq('is_active', true);

  if (error) {
    console.error("Error al obtener combos:", error);
  }

  // 2. Agrupación por categorías
  const combosByCategory = (combos || []).reduce((acc: Record<string, any[]>, combo) => {
    if (!acc[combo.category]) {
      acc[combo.category] = [];
    }
    acc[combo.category].push(combo);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-black p-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl">
        
        {/* CABECERA (Estilo alineado con tu web) */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase text-white tracking-wider">
              Catálogo de Combos
            </h1>
            <p className="text-sm font-medium text-zinc-500 mt-1">
              Ensambles pre-configurados optimizados.
            </p>
          </div>
          
          {/* 🚀 2. Sustituimos el div estático por nuestro botón interactivo */}
          <ComboCurrencyToggle currentCurrency={currency} />
          
        </div>

        {/* RENDERIZADO POR CATEGORÍAS */}
        {Object.entries(combosByCategory).length === 0 ? (
          <div className="flex h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/30 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
              No hay combos disponibles
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-14">
            {Object.entries(combosByCategory).map(([categoryName, categoryCombos]) => (
              <section key={categoryName}>
                
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-zinc-400 mb-6 border-b border-zinc-900 pb-3">
                  {categoryName}
                </h2>
                
                {/* Rejilla idéntica a la del catálogo de productos */}
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {categoryCombos.map((combo) => (
                    <ComboCard 
                      key={combo.id} 
                      combo={combo} 
                      currency={currency} 
                    />
                  ))}
                </div>

              </section>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}