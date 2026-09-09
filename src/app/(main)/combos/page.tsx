import { supabase } from '@/lib/supabaseClient';
import { resolveRequestCurrency } from '@/lib/serverCurrency';
import ComboCard from './components/ComboCard';
import ComboCurrencyToggle from './components/ComboCurrencyToggle';
import ComboCategoryCarousel from './components/ComboCategoryCarousel';
import ComboFilterBar from './components/ComboFilterBar';
import CategoryAccordion from '@/ui/catalog/CategoryAccordion';
import {
  filterCombos,
  getComboCategories,
} from './components/comboListUtils';

type ComboRecord = Record<string, unknown> & {
  category: string;
  id: string;
};

interface CombosPageProps {
  searchParams: Promise<{
    currency?: string;
    q?: string;
    category?: string;
  }>;
}

export default async function CombosPage({ searchParams }: CombosPageProps) {
  const params = await searchParams;
  const currency = await resolveRequestCurrency(params.currency);

  const { data: combos, error } = await supabase
    .from('combos')
    .select(`
      *,
      cpu:products!cpu_id(*),
      gpu:products!gpu_id(*),
      ram:products!ram_id(*)
    `)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  const { data: categoryOrders, error: categoryOrderError } = await supabase
    .from('catalog_category_orders')
    .select('category,sort_order')
    .eq('catalog_kind', 'combos')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error al obtener combos:', error);
  }
  if (categoryOrderError) {
    console.error('Error al obtener el orden de categorías de combos:', categoryOrderError);
  }

  const allCombos = (combos || []) as ComboRecord[];
  const availableCategories = getComboCategories(allCombos);
  const filteredCombos = filterCombos(
    allCombos,
    params.q || '',
    params.category || '',
  ) as ComboRecord[];
  const combosByCategory = filteredCombos.reduce<Record<string, ComboRecord[]>>(
    (acc, combo) => {
      if (!acc[combo.category]) acc[combo.category] = [];
      acc[combo.category].push(combo);
      return acc;
    },
    {},
  );
  const categoryPosition = new Map((categoryOrders ?? []).map((item) => [item.category, item.sort_order]));
  const orderedComboCategories = Object.entries(combosByCategory).sort(([left], [right]) => (
    (categoryPosition.get(left) ?? Number.MAX_SAFE_INTEGER) - (categoryPosition.get(right) ?? Number.MAX_SAFE_INTEGER)
      || left.localeCompare(right)
  ));

  return (
    <main className="combo-page font-technical min-h-screen bg-black p-3 sm:p-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">
              Catálogo de Combos
            </h1>
            <p className="mt-1 text-sm font-medium text-zinc-400">
              Combos (CPU - GPU - RAM) pre-configurados optimizados.
            </p>
          </div>
          <ComboCurrencyToggle currentCurrency={currency} />
        </div>

        <ComboFilterBar
          basePath="/combos"
          count={filteredCombos.length}
          availableCategories={availableCategories}
          currency={currency}
          showCurrencyToggle={false}
        />

        {filteredCombos.length === 0 ? (
          <div className="mt-8 flex h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/30 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
              No hay combos que coincidan con estos filtros
            </p>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-8 sm:mt-10 sm:gap-10">
            {orderedComboCategories.map(([categoryName, categoryCombos]) => (
              <CategoryAccordion
                key={categoryName}
                title={categoryName}
                itemCount={categoryCombos.length}
                contentClassName="mt-6"
              >
                <ComboCategoryCarousel>
                  {categoryCombos.map((combo) => (
                    <ComboCard
                      key={combo.id}
                      combo={combo}
                      currency={currency}
                      wholeCardClickable
                    />
                  ))}
                </ComboCategoryCarousel>
              </CategoryAccordion>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
