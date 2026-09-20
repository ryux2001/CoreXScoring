import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { resolveRequestCurrency } from '@/lib/serverCurrency';
import BuildMainCard from './components/BuildMainCard';
import MobileBuildIsland from './components/MobileBuildIsland';
import BuildEvaluationSection from './components/BuildEvaluationSection';
import Metrics from '@/app/[locale]/(main)/combos/[slug]/components/Metrics';
import FpsCard from '@/app/[locale]/(main)/combos/[slug]/components/FpsCard';
import type { Locale } from '@/i18n/routing';
import { localizeBuilds } from '@/lib/content/translations';
import type { Metadata } from 'next';
import { createLocalizedMetadata } from '@/lib/seo/metadata';
import { getTranslations } from 'next-intl/server';

interface BuildDetailPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ currency?: string }>;
}

export async function generateMetadata({ params }: BuildDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  const { data: build } = await supabase.from('builds').select('id, title').eq('slug', slug).single();
  const [localizedBuild] = build
    ? await localizeBuilds(supabase, [build], locale as Locale)
    : [];
  const name = String(localizedBuild?.title || slug);
  return createLocalizedMetadata({
    locale: locale as Locale,
    pathname: `/builds/${slug}`,
    title: `${name} | CoreXScoring`,
    description: t('buildDescription', { name }),
  });
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

  const [localizedBuild] = await localizeBuilds(supabase, [build], (await params).locale as Locale);

  const { data: games } = await supabase.from('games').select('*');

  return (
    <main className="build-page font-technical relative min-h-screen bg-black p-4 md:p-8 lg:p-12">
      <div className="mx-auto max-w-[1600px] animate-in fade-in duration-500">
        <div className="mt-6 grid grid-cols-1 gap-6 md:mt-0 lg:grid-cols-12 lg:items-start">
          {/* 📱 VISTA MÓVIL: Tarjeta de componentes plegable */}
          <div className="block lg:hidden">
             <MobileBuildIsland build={localizedBuild} currency={currency} />
          </div>

          <div className="hidden lg:sticky lg:top-8 lg:col-span-4 lg:block xl:col-span-4">
             <BuildMainCard build={localizedBuild} currency={currency} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:col-span-8 lg:grid-cols-12">
             <BuildEvaluationSection build={localizedBuild} currency={currency} />

            <div className="lg:col-span-6 lg:col-start-1 lg:row-start-2">
               <Metrics combo={localizedBuild} />
            </div>

            <div className="lg:col-span-12 lg:col-start-1 lg:row-start-3">
               <FpsCard combo={localizedBuild} games={games || []} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
