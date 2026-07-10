import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import ComboMainCard from '../components/ComboMainCard';

interface ComboDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ currency?: string }>;
}

export default async function ComboDetailPage({ params, searchParams }: ComboDetailPageProps) {
  const resolvedParams = await params;
  const comboSlug = resolvedParams.slug;
  
  const resolvedSearch = await searchParams;
  const currency = (resolvedSearch.currency || 'USD').toUpperCase();

  // 1. Consulta profunda: Obtenemos el combo y toda la información de sus componentes
  const { data: combo, error } = await supabase
    .from('combos')
    .select(`
      *,
      cpu:products!cpu_id(*),
      gpu:products!gpu_id(*),
      ram:products!ram_id(*)
    `)
    .eq('slug', comboSlug)
    .single();

  if (error || !combo) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black p-4 md:p-8 lg:p-12">
      <div className="mx-auto max-w-[1600px] animate-in fade-in duration-500">
        
        {/* Botón Volver */}
        <Link 
          href={`/combos?currency=${currency}`}
          className="inline-flex items-center gap-2 mb-8 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          Volver al catálogo
        </Link>

        {/* ESTRUCTURA MODULAR (Igual a la de Productos) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          
          {/* COLUMNA IZQUIERDA (Ocupa 3 columnas en escritorio) */}
          <div className="lg:sticky lg:top-8 lg:col-span-4 xl:col-span-3">
            <ComboMainCard combo={combo} />
          </div>

          {/* COLUMNA DERECHA (Espacio para los demás componentes) */}
          <div className="grid grid-cols-1 gap-6 lg:col-span-8 xl:col-span-9">
            
            {/* Aquí irá el componente del Precio / Evaluación Global */}
            <div className="min-h-[200px] rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/30 flex items-center justify-center">
               <span className="text-xs font-bold uppercase tracking-widest text-zinc-600">Espacio componente 2</span>
            </div>

            {/* Aquí irán las Notas del Combo u otras gráficas */}
            <div className="min-h-[300px] rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/30 flex items-center justify-center">
               <span className="text-xs font-bold uppercase tracking-widest text-zinc-600">Espacio componente 3</span>
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}