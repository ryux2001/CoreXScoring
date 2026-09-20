import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import { resolveRequestCurrency } from '@/lib/serverCurrency'
import { Card } from '@/ui/card/Card'
import { resolveProductPrice } from '@/lib/catalog/product-price'
import FilterBar from './components/FilterBar'
import Pagination from './components/Pagination' // Importamos el nuevo componente
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { localizeProducts } from '@/lib/content/translations'
import type { Metadata } from 'next';
import { createLocalizedMetadata } from '@/lib/seo/metadata';

interface CatalogPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    brand?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
    currency?: string;
    page?: string; // Capturamos la página
  }>;
}

export default async function CatalogPage({ params, searchParams }: CatalogPageProps) {
  const t = await getTranslations('catalog');
  const { locale } = await params;
  const queryParams = await searchParams;
  const { q, brand, type, minPrice, maxPrice, page = '1' } = queryParams;
  const currency = await resolveRequestCurrency(queryParams.currency);

  // Lógica de Paginación
  const currentPage = parseInt(page);
  const itemsPerPage = 12;
  const from = (currentPage - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  const currentPriceColumn = currency === 'EUR' ? 'price_eur' : 'price_usd';
  const msrpPriceColumn = currency === 'EUR' ? 'price_base_eur' : 'price_base_usd';

  // 1. Construir consulta con RANGO (.range)
  let query = supabase
    .from("products_with_priority")
    .select(`id, slug, name, type, brand, ${currentPriceColumn}, ${msrpPriceColumn}, specs, compatibility, release_date`, { count: 'exact' });

  query = query
  .order('priority', { ascending: true })       // 1. CPUs y GPUs primero
  .order('release_date', { ascending: false }) // 2. Dentro de eso, lo más nuevo primero
  .range(from, to);                            // 3. Paginación
  
  if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%`);
  if (brand) query = query.in("brand", brand.split(","));
  if (type) query = query.eq("type", type);
  const minPriceValue = Number(minPrice);
  const maxPriceValue = Number(maxPrice);
  if (Number.isFinite(minPriceValue)) {
    query = query.or(`${currentPriceColumn}.gte.${minPriceValue},and(${currentPriceColumn}.is.null,${msrpPriceColumn}.gte.${minPriceValue})`);
  }
  if (Number.isFinite(maxPriceValue)) {
    query = query.or(`${currentPriceColumn}.lte.${maxPriceValue},and(${currentPriceColumn}.is.null,${msrpPriceColumn}.lte.${maxPriceValue})`);
  }

  // Aplicamos el límite de 12 productos por página
  query = query.range(from, to).order('release_date', { ascending: false });

  const [productsResponse, brandsResponse, typesResponse] = await Promise.all([
    query,
    supabase.from("products").select("brand"),
    supabase.from("products").select("type")
  ]);

  const { data: products, count, error } = productsResponse;
  const localizedProducts = error
    ? products || []
    : await localizeProducts(supabase, (products || []) as Record<string, unknown>[], locale as Locale);
  const totalPages = Math.ceil((count || 0) / itemsPerPage);

  const availableBrands = Array.from(new Set(brandsResponse.data?.map(p => p.brand))).filter(Boolean).sort() as string[];
  const availableTypes = Array.from(new Set(typesResponse.data?.map(p => p.type))).filter(Boolean).sort() as string[];

  if (error) return <div className="font-technical p-20 text-center text-white">{t('error', { message: error.message })}</div>;

  return (
    <main className="font-technical min-h-screen bg-black py-3 px-2.5 sm:p-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl">
        
        <FilterBar 
          count={count || 0} 
          availableBrands={availableBrands}
          availableTypes={availableTypes}
          currency={currency}
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4 sm:gap-8">
          {localizedProducts.map((product) => {
            const price = resolveProductPrice(product, currency);
            return <Card
              key={String(product.id)}
              id={String(product.id)}
              slug={String(product.slug)}
              type={String(product.type)}
              brand={String(product.brand)}
              name={String(product.name)}
              price={price.value}
              priceSource={price.source}
              showMsrpBadge
              currency={currency}
              specs={product.specs as never}
              compatibility={product.compatibility as never}
              release_date={typeof product.release_date === 'string' ? product.release_date : null}
              wholeCardClickable
            />
          })}
        </div>

        {/* CONTROLES DE PAGINACIÓN */}
        <Pagination currentPage={currentPage} totalPages={totalPages} />

        {localizedProducts.length === 0 && (
          <div className="flex h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50">
            <p className="text-zinc-500 font-medium tracking-tight">
              {t('empty')}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: CatalogPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  return createLocalizedMetadata({ locale: locale as Locale, pathname: '/catalog', title: t('catalogTitle'), description: t('catalogDescription') });
}
