import { supabase } from '@/lib/supabaseClient';
import { resolveRequestCurrency } from '@/lib/serverCurrency';
import ComboCurrencyToggle from '@/app/[locale]/(main)/combos/components/ComboCurrencyToggle';
import ComboFilterBar from '@/app/[locale]/(main)/combos/components/ComboFilterBar';
import ComboPagination from '@/app/[locale]/(main)/combos/components/ComboPagination';
import ComboCategoryCarousel from '@/app/[locale]/(main)/combos/components/ComboCategoryCarousel';
import BuildCard from './components/BuildCard';
import CategoryAccordion from '@/ui/catalog/CategoryAccordion';
import {
  filterBuilds,
  getBuildCategories,
  paginateBuilds,
} from './components/buildListUtils';
import { getTranslations } from 'next-intl/server';

interface BuildsPageProps {
  searchParams: Promise<{
    currency?: string;
    q?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function BuildsPage({ searchParams }: BuildsPageProps) {
  const t = await getTranslations('builds');
  const params = await searchParams;
  const currency = await resolveRequestCurrency(params.currency);

  const { data: builds, error } = await supabase
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
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  const { data: categoryOrders, error: categoryOrderError } = await supabase
    .from('catalog_category_orders')
    .select('category,sort_order')
    .eq('catalog_kind', 'builds')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error al obtener builds:', error);
  }
  if (categoryOrderError) {
    console.error('Error al obtener el orden de categorías de builds:', categoryOrderError);
  }

  const allBuilds = builds || [];
  const availableCategories = getBuildCategories(allBuilds);
  const filteredBuilds = filterBuilds(
    allBuilds,
    params.q || '',
    params.category || '',
  );
  const { currentPage, totalPages, visibleBuilds } = paginateBuilds(
    filteredBuilds,
    params.page,
  );
  const buildsByCategory = visibleBuilds.reduce<Record<string, any[]>>(
    (acc, build) => {
      const category = build.category || 'Builds';
      if (!acc[category]) acc[category] = [];
      acc[category].push(build);
      return acc;
    },
    {},
  );
  const categoryPosition = new Map((categoryOrders ?? []).map((item) => [item.category, item.sort_order]));
  const orderedBuildCategories = Object.entries(buildsByCategory).sort(([left], [right]) => (
    (categoryPosition.get(left) ?? Number.MAX_SAFE_INTEGER) - (categoryPosition.get(right) ?? Number.MAX_SAFE_INTEGER)
      || left.localeCompare(right)
  ));

  return (
    <main className="build-page font-technical min-h-screen bg-black px-4 py-6 sm:px-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">
              {t('title')}
            </h1>
            <p className="mt-1 text-sm font-medium text-zinc-500">
              {t('description')}
            </p>
          </div>
          <ComboCurrencyToggle currentCurrency={currency} />
        </div>

        <ComboFilterBar
          basePath="/builds"
          count={filteredBuilds.length}
          availableCategories={availableCategories}
          currency={currency}
          showCurrencyToggle={false}
          entityLabel={t('countLabel')}
          searchPlaceholder={t('searchPlaceholder')}
        />

        {visibleBuilds.length === 0 ? (
          <div className="mt-8 flex h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/30 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
              {t('empty')}
            </p>
          </div>
        ) : (
          <div className="mt-10 flex flex-col gap-8 sm:gap-10">
            {orderedBuildCategories.map(([categoryName, categoryBuilds]) => (
              <CategoryAccordion
                key={categoryName}
                title={categoryName}
                itemCount={categoryBuilds.length}
                contentClassName="mt-6"
              >
                <ComboCategoryCarousel>
                  {categoryBuilds.map((build) => (
                    <BuildCard
                      key={build.id}
                      build={build}
                      currency={currency}
                      wholeCardClickable
                    />
                  ))}
                </ComboCategoryCarousel>
              </CategoryAccordion>
            ))}
          </div>
        )}

        <ComboPagination basePath="/builds" currentPage={currentPage} totalPages={totalPages} />
      </div>
    </main>
  );
}
