import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import BuildCard from '@/app/(main)/builds/components/BuildCard';
import ComboPagination from '@/app/(main)/combos/components/ComboPagination';
import CreatedCombosFilterBar from '@/app/(main)/vault/combos-created/components/CreatedCombosFilterBar';
import {
  filterCreatedBuilds,
  getAvailableCreatedBuildBrands,
  paginateCreatedBuilds,
} from './components/createdBuildUtils';

interface CreatedBuildsPageProps {
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
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot always write response cookies.
          }
        },
      },
    },
  );
}

export default async function CreatedBuildsPage({ searchParams }: CreatedBuildsPageProps) {
  const params = await searchParams;
  const currency = params.currency === 'EUR' ? 'EUR' : 'USD';
  const supabase = await createVaultClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth');

  const { data, error } = await supabase
    .from('created_builds')
    .select(`
      *,
      cpu:products!cpu_id(*),
      gpu:products!gpu_id(*),
      ram:products!ram_id(*),
      motherboard:products!motherboard_id(*),
      storage:products!storage_id(*),
      psu:products!psu_id(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-black p-0 sm:p-6 md:p-12 lg:p-16">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
          No se pudieron cargar tus builds creadas.
        </div>
      </main>
    );
  }

  const createdBuilds = data || [];
  const availableBrands = getAvailableCreatedBuildBrands(createdBuilds);
  const filteredBuilds = filterCreatedBuilds(createdBuilds, {
    search: params.q,
    cpuBrand: params.cpuBrand,
    gpuBrand: params.gpuBrand,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    currency,
  });
  const { currentPage, totalPages, visibleBuilds } = paginateCreatedBuilds(
    filteredBuilds,
    params.page,
  );

  return (
    <main className="min-h-screen bg-black px-3 py-6 sm:p6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl rounded-[2rem] py-5 px-1.5 sm:p-5 shadow-2xl md:p-8">
        <header>
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">
            Bóveda
          </span>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
            Builds creadas
          </h1>
        </header>

        <CreatedCombosFilterBar
          count={filteredBuilds.length}
          availableCpuBrands={availableBrands.cpu}
          availableGpuBrands={availableBrands.gpu}
          currency={currency}
          route="/vault/builds-created"
          entityLabel="builds"
          searchPlaceholder="Buscar builds creadas"
          createLabel="Crear build"
          createPath="/vault/builds-created/new"
        />

        <section className="mt-8">
          <h2 className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            Mis builds
          </h2>

          {visibleBuilds.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleBuilds.map((build: any) => (
                <BuildCard
                  key={build.id}
                  build={build}
                  currency={currency}
                  detailPath="/vault/builds-created"
                  showSave={false}
                  wholeCardClickable
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 text-center">
              <p className="text-sm font-medium tracking-tight text-zinc-500">
                {createdBuilds.length === 0
                  ? 'Aún no tienes builds creadas.'
                  : 'No hay builds que coincidan con estos filtros.'}
              </p>
            </div>
          )}
        </section>

        <ComboPagination
          basePath="/vault/builds-created"
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
    </main>
  );
}
