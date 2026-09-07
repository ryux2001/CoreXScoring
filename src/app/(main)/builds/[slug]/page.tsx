import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { resolveRequestCurrency } from '@/lib/serverCurrency';
import BuildMainCard from './components/BuildMainCard';
import MobileBuildIsland from './components/MobileBuildIsland';
import BuildEvaluationSection from './components/BuildEvaluationSection';
import Metrics from '@/app/(main)/combos/[slug]/components/Metrics';
import FpsCard from '@/app/(main)/combos/[slug]/components/FpsCard';

interface BuildDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ currency?: string }>;
}

export default async function BuildDetailPage({
  params,
  searchParams,
}: BuildDetailPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const currency = await resolveRequestCurrency(resolvedSearchParams.currency);

  const { data: build, error } = await supabase
    .from('builds')
    .select(`
      *,
      cpu:products!cpu_id(*),
      gpu:products!gpu_id(*),
      ram:products!ram_id(*),
      motherboard:products!motherboard_id(*),
      storage:products!storage_id(*),
      psu:products!psu_id(*)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !build) {
    notFound();
  }

  const { data: games } = await supabase.from('games').select('*');

  return (
    <main className="build-page font-technical relative min-h-screen bg-black p-4 md:p-8 lg:p-12">
      <div className="mx-auto max-w-[1600px] animate-in fade-in duration-500">
        <div className="mt-6 grid grid-cols-1 gap-6 md:mt-0 lg:grid-cols-12 lg:items-start">
          {/* 📱 VISTA MÓVIL: Tarjeta de componentes plegable */}
          <div className="block lg:hidden">
            <MobileBuildIsland build={build} currency={currency} />
          </div>

          <div className="hidden lg:sticky lg:top-8 lg:col-span-4 lg:block xl:col-span-4">
            <BuildMainCard build={build} currency={currency} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:col-span-8 lg:grid-cols-12">
            <BuildEvaluationSection build={build} currency={currency} />

            <div className="lg:col-span-6 lg:col-start-1 lg:row-start-2">
              <Metrics combo={build} />
            </div>

            <div className="lg:col-span-12 lg:col-start-1 lg:row-start-3">
              <FpsCard combo={build} games={games || []} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
