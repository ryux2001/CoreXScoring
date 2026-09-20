import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from '@/i18n/server-navigation';
import { resolveRequestCurrency } from '@/lib/serverCurrency';
import ComboCard from '@/app/[locale]/(main)/combos/components/ComboCard';
import ComboFilterBar from '@/app/[locale]/(main)/combos/components/ComboFilterBar';
import ComboPagination from '@/app/[locale]/(main)/combos/components/ComboPagination';
import {
  filterCombos,
  getComboCategories,
  paginateCombos,
} from '@/app/[locale]/(main)/combos/components/comboListUtils';
import { getTranslations } from 'next-intl/server';

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
  const t = await getTranslations('vault');
  const params = await searchParams;
  const currency = await resolveRequestCurrency(params.currency);
  const supabase = await createVaultClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await redirect('/auth');
    return null;
  }

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
      <main className="vault-page font-technical min-h-screen bg-black p-0 sm:p-6 md:p-12 lg:p-16">
        <div className="mx-auto max-w-7xl rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
          {t('savedCombos.loadError')}
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
    <main className="vault-page font-technical min-h-screen bg-black px-3 py-6 sm:p6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl rounded-[2rem] py-5 px-1.5 sm:p-5 shadow-2xl md:p-8">
        <header>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
            {t('title')}
          </span>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
            {t('savedCombos.title')}
          </h1>
        </header>

        <ComboFilterBar
          basePath="/vault/combos"
          count={filteredCombos.length}
          availableCategories={availableCategories}
          currency={currency}
          entityLabel={t('savedCombos.entityLabel')}
          searchPlaceholder={t('savedCombos.searchPlaceholder')}
        />

        <section className="mt-8">
          <h2 className="mb-5 text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
            {t('savedCombos.favorites')}
          </h2>

          {visibleCombos.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleCombos.map((combo: any) => (
                <ComboCard
                  key={combo.id}
                  combo={combo}
                  currency={currency}
                  wholeCardClickable
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 text-center">
              <p className="text-sm font-medium tracking-tight text-zinc-500">
                {savedCombos.length === 0
                  ? t('savedCombos.empty')
                  : t('savedCombos.noMatches')}
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
