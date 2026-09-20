import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from '@/i18n/server-navigation';
import { resolveRequestCurrency } from '@/lib/serverCurrency';
import { Card } from '@/ui/card/Card';
import { resolveProductPrice } from '@/lib/catalog/product-price';
import SavedProductsFilterBar from './components/SavedProductsFilterBar';
import SavedProductsPagination from './components/SavedProductsPagination';
import { getTranslations } from 'next-intl/server';

interface VaultProductsPageProps {
  searchParams: Promise<{
    q?: string;
    brand?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
    currency?: string;
    page?: string;
  }>;
}

interface SavedProduct {
  id: string;
  slug: string;
  name: string;
  type: string;
  brand: string;
  price_base_usd: number | null;
  price_base_eur: number | null;
  price_usd: number | null;
  price_eur: number | null;
  specs: Record<string, unknown> | null;
  compatibility: Record<string, unknown> | null;
  release_date: string | null;
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

export default async function VaultProductsPage({
  searchParams,
}: VaultProductsPageProps) {
  const t = await getTranslations('vault');
  const params = await searchParams;
  const currency = await resolveRequestCurrency(params.currency);
  const search = params.q?.trim().toLowerCase() || '';
  const selectedBrands = params.brand?.split(',').filter(Boolean) || [];
  const selectedType = params.type || '';
  const minPrice = params.minPrice ? Number(params.minPrice) : null;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : null;
  const requestedPage = Number.parseInt(params.page || '1', 10) || 1;
  const itemsPerPage = 12;

  const supabase = await createVaultClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await redirect('/auth');
    return null;
  }

  const { data, error } = await supabase
    .from('saved_products')
    .select(
      `created_at, product:products(
        id, slug, name, type, brand,
        price_base_usd, price_base_eur, price_usd, price_eur,
        specs, compatibility, release_date
      )`,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <main className="vault-page font-technical min-h-screen bg-black p-0 sm:p-6 md:p-12 lg:p-16">
        <div className="mx-auto max-w-7xl rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
          {t('products.loadError')}
        </div>
      </main>
    );
  }

  const savedProducts = (data || [])
    .map((row: { product: SavedProduct | SavedProduct[] | null }) =>
      Array.isArray(row.product) ? row.product[0] : row.product,
    )
    .filter(Boolean) as SavedProduct[];

  const filteredProducts = savedProducts.filter((product) => {
    const matchesSearch =
      !search ||
      [product.name, product.brand, product.slug].some((value) =>
        value?.toLowerCase().includes(search),
      );
    const matchesBrand =
      selectedBrands.length === 0 || selectedBrands.includes(product.brand);
    const matchesType = !selectedType || product.type === selectedType;
    const price = resolveProductPrice(product, currency).value;
    const matchesMin = minPrice === null || (price ?? 0) >= minPrice;
    const matchesMax = maxPrice === null || (price ?? 0) <= maxPrice;

    return matchesSearch && matchesBrand && matchesType && matchesMin && matchesMax;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentPage = Math.min(
    Math.max(requestedPage, 1),
    Math.max(totalPages, 1),
  );
  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const availableBrands = Array.from(
    new Set(savedProducts.map((product) => product.brand).filter(Boolean)),
  ).sort();
  const availableTypes = Array.from(
    new Set(savedProducts.map((product) => product.type).filter(Boolean)),
  ).sort();

  return (
    <main className="vault-page font-technical min-h-screen bg-black px-3 py-6 sm:p6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl rounded-[2rem] py-5 px-1.5 sm:p-5 shadow-2xl md:p-8">
        <header>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
            {t('title')}
          </span>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
            {t('products.title')}
          </h1>
        </header>

        <SavedProductsFilterBar
          count={filteredProducts.length}
          availableBrands={availableBrands}
          availableTypes={availableTypes}
          currency={currency}
        />

        <section className="mt-8">
          <h2 className="mb-5 text-[14px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
            {t('products.favoriteComponents')}
          </h2>

          {visibleProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product) => {
                const price = resolveProductPrice(product, currency);
                return <Card
                  key={product.id}
                  id={product.id}
                  slug={product.slug}
                  type={product.type}
                  brand={product.brand}
                  name={product.name}
                  price={price.value}
                  currency={currency}
                  specs={product.specs}
                  compatibility={product.compatibility}
                  release_date={product.release_date}
                  wholeCardClickable
                />
              })}
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 text-center">
              <p className="text-sm font-medium tracking-tight text-zinc-500">
                {savedProducts.length === 0
                  ? t('products.empty')
                  : t('products.noMatches')}
              </p>
            </div>
          )}
        </section>

        <SavedProductsPagination
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
    </main>
  );
}
