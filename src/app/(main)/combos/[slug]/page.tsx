import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import ComboMainCard from './components/ComboMainCard';
import MobileComboIsland from './components/MobileComboIsland';
import ComboNotesCard from './components/ComboNotesCard';
import RadarChartCardCombo from './components/RadarChartCardCombo';
import Metrics from './components/Metrics';
import FpsCard from './components/FpsCard';

interface ComboDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ currency?: string }>;
}

export default async function ComboDetailPage({ params, searchParams }: ComboDetailPageProps) {
  const resolvedParams = await params;
  const comboSlug = resolvedParams.slug;

  const resolvedSearch = await searchParams;
  const currency = (resolvedSearch.currency || 'USD').toUpperCase();

  // 1. Consulta profunda: Obtenemos el combo y sus componentes
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

  // 2. Consulta de juegos: Traemos el catálogo de juegos para la estimación de FPS
  const { data: games } = await supabase
    .from('games')
    .select('*');

  return (
    <main className="min-h-screen bg-black p-4 md:p-8 lg:p-12 relative">
      <div className="mx-auto max-w-[1600px] animate-in fade-in duration-500">

        {/* ESTRUCTURA MODULAR */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start mt-6 md:mt-0">

          {/* 📱 VISTA MÓVIL: Botón Isla Flotante */}
          <div className="block lg:hidden">
            <MobileComboIsland combo={combo} />
          </div>

          {/* 💻 VISTA ESCRITORIO: Columna Izquierda Fija */}
          <div className="hidden lg:block lg:sticky lg:top-8 lg:col-span-4 xl:col-span-3">
            <ComboMainCard combo={combo} />
          </div>

          {/* COLUMNA DERECHA */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:col-span-9">

            <div className="lg:col-span-3">
              <RadarChartCardCombo combo={combo} currency={currency} />
            </div>

            <div className="lg:col-span-9">
              <ComboNotesCard combo={combo} currency={currency} />
            </div>

            <div className="lg:col-span-6">
              <Metrics combo={combo} />
            </div>

            {/* Pasamos combo y la lista de juegos recuperados */}
            <div className="lg:col-span-6">
              <FpsCard combo={combo} games={games || []} />
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}