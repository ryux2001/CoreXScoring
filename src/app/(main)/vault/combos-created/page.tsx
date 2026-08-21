import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ComboCard from '@/app/(main)/combos/components/ComboCard';
import ComboPagination from '@/app/(main)/combos/components/ComboPagination';
import CreatedCombosFilterBar from './components/CreatedCombosFilterBar';
import {
  filterCreatedCombos,
  getAvailableCreatedComboBrands,
  paginateCreatedCombos,
} from './components/createdComboUtils';

interface CreatedCombosPageProps {
  searchParams: Promise<{
    q?: string;
    cpuBrand?: string;
    gpuBrand?: string;
    minPrice?: string;
    maxPrice?: string;
    currency?: string;
    page?: string;
  }>;
}

async function createVaultClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { storageKey: 'sb-auth-token' },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write response cookies.
          }
        },
      },
    },
  );
}

export default async function CreatedCombosPage({
  searchParams,
}: CreatedCombosPageProps) {
  const params = await searchParams;
  const currency = params.currency === 'EUR' ? 'EUR' : 'USD';
  const supabase = await createVaultClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth');

  const { data, error } = await supabase
    .from('created_combos')
    .select(`
      *,
      cpu:products!cpu_id(*),
      gpu:products!gpu_id(*),
      ram:products!ram_id(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <main className="vault-page font-technical min-h-screen bg-black p-0 sm:p-6 md:p-12 lg:p-16">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
          No se pudieron cargar tus combos creados.
        </div>
      </main>
    );
  }

  const createdCombos = data || [];
  const availableBrands = getAvailableCreatedComboBrands(createdCombos);
  const filteredCombos = filterCreatedCombos(createdCombos, {
    search: params.q,
    cpuBrand: params.cpuBrand,
    gpuBrand: params.gpuBrand,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    currency,
  });
  const { currentPage, totalPages, visibleCombos } = paginateCreatedCombos(
    filteredCombos,
    params.page,
  );

  return (
    <main className="vault-page font-technical min-h-screen bg-black px-3 py-6 sm:p6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl rounded-[2rem] py-5 px-1.5 sm:p-5 shadow-2xl md:p-8">
        <header>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
            Bóveda
          </span>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
            Combos creados
          </h1>
        </header>

        <CreatedCombosFilterBar
          count={filteredCombos.length}
          availableCpuBrands={availableBrands.cpu}
          availableGpuBrands={availableBrands.gpu}
          currency={currency}
        />

        <section className="mt-8">
          <h2 className="mb-5 text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
            Mis combos
          </h2>

          {visibleCombos.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleCombos.map((combo: any) => (
                <ComboCard
                  key={combo.id}
                  combo={combo}
                  currency={currency}
                  detailPath="/vault/combos-created"
                  wholeCardClickable
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 text-center">
              <p className="text-sm font-medium tracking-tight text-zinc-500">
                {createdCombos.length === 0
                  ? 'Aún no tienes combos creados.'
                  : 'No hay combos que coincidan con estos filtros.'}
              </p>
            </div>
          )}
        </section>

        <ComboPagination
          basePath="/vault/combos-created"
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
    </main>
  );
}
