import { supabase } from '@/lib/supabaseClient';
import ComboCard from './components/ComboCard';
import ComboCurrencyToggle from './components/ComboCurrencyToggle';
import ComboFilterBar from './components/ComboFilterBar';
import ComboPagination from './components/ComboPagination';
import {
  filterCombos,
  getComboCategories,
  paginateCombos,
} from './components/comboListUtils';

interface CombosPageProps {
  searchParams: Promise<{
    currency?: string;
    q?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function CombosPage({ searchParams }: CombosPageProps) {
  const params = await searchParams;
  const currency = params.currency === 'EUR' ? 'EUR' : 'USD';

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
    console.error('Error al obtener combos:', error);
  }

  const allCombos = combos || [];
  const availableCategories = getComboCategories(allCombos);
  const filteredCombos = filterCombos(
    allCombos,
    params.q || '',
    params.category || '',
  );
  const { currentPage, totalPages, visibleCombos } = paginateCombos(
    filteredCombos,
    params.page,
  );

  const combosByCategory = visibleCombos.reduce<Record<string, any[]>>(
    (acc, combo) => {
      if (!acc[combo.category]) acc[combo.category] = [];
      acc[combo.category].push(combo);
      return acc;
    },
    {},
  );

  return (
    <main className="min-h-screen bg-black p-3 sm:p-6 md:p-12 lg:p-16">
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

        {visibleCombos.length === 0 ? (
          <div className="mt-8 flex h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/30 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
              No hay combos que coincidan con estos filtros
            </p>
          </div>
        ) : (
          <div className="mt-5 sm:mt-10 flex flex-col gap-14">
            {Object.entries(combosByCategory).map(([categoryName, categoryCombos]) => (
              <section key={categoryName}>
                <h2 className="mb-6 border-b border-zinc-900 pb-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-400">
                  {categoryName}
                </h2>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {categoryCombos.map((combo) => (
                    <ComboCard
                      key={combo.id}
                      combo={combo}
                      currency={currency}
                      wholeCardClickable
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <ComboPagination
          basePath="/combos"
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
    </main>
  );
}
