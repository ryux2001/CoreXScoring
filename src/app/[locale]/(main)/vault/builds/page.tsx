import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from '@/i18n/server-navigation';
import { resolveRequestCurrency } from '@/lib/serverCurrency';
import BuildCard from '@/app/[locale]/(main)/builds/components/BuildCard';
import ComboFilterBar from '@/app/[locale]/(main)/combos/components/ComboFilterBar';
import ComboPagination from '@/app/[locale]/(main)/combos/components/ComboPagination';
import {
  filterBuilds,
  getBuildCategories,
  paginateBuilds,
} from '@/app/[locale]/(main)/builds/components/buildListUtils';
import { getTranslations } from 'next-intl/server';

interface VaultBuildsPageProps {
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

export default async function VaultBuildsPage({
  searchParams,
}: VaultBuildsPageProps) {
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
    .from('saved_builds')
    .select(`
      created_at,
      build:builds(
        *,
        cpu:products!cpu_id(*),
        gpu:products!gpu_id(*),
        ram:products!ram_id(*),
        motherboard:products!motherboard_id(*),
        storage:products!storage_id(*),
        psu:products!psu_id(*)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <main className="vault-page font-technical min-h-screen bg-black p-0 sm:p-6 md:p-12 lg:p-16">
        <div className="mx-auto max-w-7xl rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
          {t('savedBuilds.loadError')}
        </div>
      </main>
    );
  }

  const savedBuilds = (data || [])
    .map((row: { build: any | any[] | null }) =>
      Array.isArray(row.build) ? row.build[0] : row.build,
    )
    .filter(Boolean);
  const availableCategories = getBuildCategories(savedBuilds);
  const filteredBuilds = filterBuilds(
    savedBuilds,
    params.q || '',
    params.category || '',
  );
  const { currentPage, totalPages, visibleBuilds } = paginateBuilds(
    filteredBuilds,
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
            {t('savedBuilds.title')}
          </h1>
        </header>

        <ComboFilterBar
          basePath="/vault/builds"
          count={filteredBuilds.length}
          availableCategories={availableCategories}
          currency={currency}
          entityLabel={t('savedBuilds.entityLabel')}
          searchPlaceholder={t('savedBuilds.searchPlaceholder')}
        />

        <section className="mt-8">
          <h2 className="mb-5 text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
            {t('savedBuilds.favorites')}
          </h2>

          {visibleBuilds.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleBuilds.map((build: any) => (
                <BuildCard
                  key={build.id}
                  build={build}
                  currency={currency}
                  wholeCardClickable
                  compactSave
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 text-center">
              <p className="text-sm font-medium tracking-tight text-zinc-500">
                {savedBuilds.length === 0
                  ? t('savedBuilds.empty')
                  : t('savedBuilds.noMatches')}
              </p>
            </div>
          )}
        </section>

        <ComboPagination
          basePath="/vault/builds"
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
    </main>
  );
}
