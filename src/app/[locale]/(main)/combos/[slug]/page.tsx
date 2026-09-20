import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { resolveRequestCurrency } from '@/lib/serverCurrency';
import { notFound } from 'next/navigation';
import ComboMainCard from './components/ComboMainCard';
import MobileComboIsland from './components/MobileComboIsland';
import ComboEvaluationSection from './components/ComboEvaluationSection';
import Metrics from './components/Metrics';
import FpsCard from './components/FpsCard';
import type { Locale } from '@/i18n/routing';
import { localizeCombos } from '@/lib/content/translations';

interface ComboDetailPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ currency?: string }>;
}

export default async function ComboDetailPage({ params, searchParams }: ComboDetailPageProps) {
  const resolvedParams = await params;
  const comboSlug = resolvedParams.slug;

  const resolvedSearch = await searchParams;
  const currency = await resolveRequestCurrency(resolvedSearch.currency);

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

  const [localizedCombo] = await localizeCombos(supabase, [combo], resolvedParams.locale as Locale);

  // 2. Consulta de juegos: Traemos el catálogo de juegos para la estimación de FPS
  const { data: games } = await supabase
    .from('games')
    .select('*');

  return (
    <main className="combo-page font-technical min-h-screen bg-black p-4 md:p-8 lg:p-12 relative">
      <div className="mx-auto max-w-[1600px] animate-in fade-in duration-500">

        {/* ESTRUCTURA MODULAR */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start mt-6 md:mt-0">

          {/* 📱 VISTA MÓVIL: Tarjeta de componentes plegable */}
          <div className="block lg:hidden">
           <MobileComboIsland combo={localizedCombo} currency={currency} />
          </div>

          {/* 💻 VISTA ESCRITORIO: Columna Izquierda Fija */}
          <div className="hidden lg:block lg:sticky lg:top-8 lg:col-span-4 xl:col-span-4">
             <ComboMainCard combo={localizedCombo} currency={currency} />
          </div>

          {/* COLUMNA DERECHA */}
          <div className="grid grid-cols-1 gap-6 lg:col-span-8 lg:grid-cols-12">

            {/* Sección de Evaluación (Notas y Radar en desktop, alternancia en móvil) */}
             <ComboEvaluationSection combo={localizedCombo} currency={currency} />

            <div className="lg:col-span-6 lg:col-start-1 lg:row-start-2">
               <Metrics combo={localizedCombo} />
            </div>

            <div className="lg:col-span-12 lg:col-start-1 lg:row-start-3">
               <FpsCard combo={localizedCombo} games={games || []} />
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}
