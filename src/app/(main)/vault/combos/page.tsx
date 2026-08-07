import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ComboCard from '@/app/(main)/combos/components/ComboCard';
import ComboFilterBar from '@/app/(main)/combos/components/ComboFilterBar';
import ComboPagination from '@/app/(main)/combos/components/ComboPagination';
import {
  filterCombos,
  getComboCategories,
  paginateCombos,
} from '@/app/(main)/combos/components/comboListUtils';

interface VaultCombosPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
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

export default async function VaultCombosPage({
  searchParams,
}: VaultCombosPageProps) {
  const params = await searchParams;
  const currency = params.currency === 'EUR' ? 'EUR' : 'USD';
  const supabase = await createVaultClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth');

  const { data, error } = await supabase
    .from('saved_combos')
    .select(`
      created_at,
      combo:combos(
        *,
        cpu:products!cpu_id(*),
        gpu:products!gpu_id(*),
        ram:products!ram_id(*)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-black p-6 md:p-12 lg:p-16">
        <div className="mx-auto max-w-7xl rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
          No se pudieron cargar tus combos guardados.
        </div>
      </main>
    );
  }

  const savedCombos = (data || [])
    .map((row: { combo: any | any[] | null }) =>
      Array.isArray(row.combo) ? row.combo[0] : row.combo,
    )
    .filter(Boolean);
  const availableCategories = getComboCategories(savedCombos);
  const filteredCombos = filterCombos(
    savedCombos,
    params.q || '',
    params.category || '',
  );
  const { currentPage, totalPages, visibleCombos } = paginateCombos(
    filteredCombos,
    params.page,
  );

  return (
    <main className="min-h-screen bg-black p-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-zinc-800 bg-zinc-950/40 p-5 shadow-2xl md:p-8">
        <header>
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">
            Bóveda
          </span>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
            Combos guardados
          </h1>
        </header>

        <ComboFilterBar
          basePath="/vault/combos"
          count={filteredCombos.length}
          availableCategories={availableCategories}
          currency={currency}
        />

        <section className="mt-8">
          <h2 className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            Combos favoritos
          </h2>

          {visibleCombos.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleCombos.map((combo: any) => (
                <ComboCard key={combo.id} combo={combo} currency={currency} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 text-center">
              <p className="text-sm font-medium tracking-tight text-zinc-500">
                {savedCombos.length === 0
                  ? 'Aún no tienes combos guardados.'
                  : 'No hay combos guardados que coincidan con estos filtros.'}
              </p>
            </div>
          )}
        </section>

        <ComboPagination
          basePath="/vault/combos"
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
    </main>
  );
}
