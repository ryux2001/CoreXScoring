import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { consumeApiRateLimit } from '@/lib/api-security';
import { normalizeCategory, toStoredCategory } from './catalog-categories';

export { normalizeCategory, toStoredCategory, UNCATEGORIZED_CATEGORY } from './catalog-categories';

export type CatalogKind = 'builds' | 'combos';
export type CatalogSlot = 'cpu' | 'gpu' | 'ram' | 'motherboard' | 'storage' | 'psu';

export interface AdminCatalogProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  type: string;
  price_usd?: number | null;
  price_eur?: number | null;
  price_base_usd?: number | null;
  price_base_eur?: number | null;
}

export interface AdminProductPriceRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  type: string;
  price_usd: number | null;
  price_eur: number | null;
  price_base_usd: number | null;
  price_base_eur: number | null;
  price_source_url_usd: string | null;
  price_source_url_eur: string | null;
  price_checked_at_usd: string | null;
  price_checked_at_eur: string | null;
  prices_updated_at: string | null;
}

export type AdminProductPriceStatus = 'all' | 'current' | 'missing';

export interface AdminProductPriceUpdate {
  id: string;
  price_usd: number | null;
  price_eur: number | null;
  price_base_usd: number | null;
  price_base_eur: number | null;
  price_source_url_usd: string | null;
  price_source_url_eur: string | null;
  price_checked_at_usd: string | null;
  price_checked_at_eur: string | null;
}

export interface AdminCatalogRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  is_active: boolean;
  created_at: string;
  sort_order: number;
  cpu_id: string;
  gpu_id: string;
  ram_id: string;
  motherboard_id?: string | null;
  storage_id?: string | null;
  psu_id?: string | null;
  cpu?: AdminCatalogProduct | null;
  gpu?: AdminCatalogProduct | null;
  ram?: AdminCatalogProduct | null;
  motherboard?: AdminCatalogProduct | null;
  storage?: AdminCatalogProduct | null;
  psu?: AdminCatalogProduct | null;
  translations?: AdminCatalogTranslations;
  [key: string]: unknown;
}

export interface AdminCatalogTranslation {
  title: string;
  category: string;
}

export interface AdminCatalogTranslations {
  en: AdminCatalogTranslation;
  es: AdminCatalogTranslation;
}

export interface CatalogCategoryOrder {
  category: string;
  sort_order: number;
}

export const BUILD_SLOTS: CatalogSlot[] = ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'];
export const COMBO_SLOTS: CatalogSlot[] = ['cpu', 'gpu', 'ram'];

const PRODUCT_SELECT = 'id,slug,name,brand,type,price_usd,price_eur,price_base_usd,price_base_eur';
const PRODUCT_PRICE_SELECT = 'id,slug,name,brand,type,price_usd,price_eur,price_base_usd,price_base_eur,price_source_url_usd,price_source_url_eur,price_checked_at_usd,price_checked_at_eur,prices_updated_at';

function getTable(kind: CatalogKind): 'builds' | 'combos' {
  return kind;
}

function getTranslationTable(kind: CatalogKind): 'build_translations' | 'combo_translations' {
  return kind === 'builds' ? 'build_translations' : 'combo_translations';
}

function getTranslationIdColumn(kind: CatalogKind): 'build_id' | 'combo_id' {
  return kind === 'builds' ? 'build_id' : 'combo_id';
}

function getSlots(kind: CatalogKind): CatalogSlot[] {
  return kind === 'builds' ? BUILD_SLOTS : COMBO_SLOTS;
}

function getRelations(kind: CatalogKind): string {
  const relations = getSlots(kind).map((slot) => `${slot}:products!${slot}_id(${PRODUCT_SELECT})`);
  return `*,${relations.join(',')}`;
}

export function parseCatalogKind(value: string): CatalogKind | null {
  return value === 'builds' || value === 'combos' ? value : null;
}

export function getCatalogSlots(kind: CatalogKind): CatalogSlot[] {
  return [...getSlots(kind)];
}

export async function getAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous || user.app_metadata?.role !== 'admin') return null;

  const rateLimit = await consumeApiRateLimit({
    key: `admin-api:user:${user.id}`,
    windowSeconds: 60,
    limit: 60,
  });

  return rateLimit.allowed ? user : null;
}

export function getAdminDb(): SupabaseClient {
  return createSupabaseAdminClient();
}

export async function loadCatalogRows(db: SupabaseClient, kind: CatalogKind): Promise<AdminCatalogRow[]> {
  const { data, error } = await db
    .from(getTable(kind))
    .select(getRelations(kind))
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as unknown as AdminCatalogRow[];
  const categoryOrders = await loadCatalogCategoryOrders(db, kind);
  const categoryPosition = new Map(categoryOrders.map((item) => [item.category, item.sort_order]));

  return rows.sort((left, right) => {
    const leftCategory = normalizeCategory(left.category);
    const rightCategory = normalizeCategory(right.category);
    const categoryDifference = (categoryPosition.get(leftCategory) ?? Number.MAX_SAFE_INTEGER)
      - (categoryPosition.get(rightCategory) ?? Number.MAX_SAFE_INTEGER);
    if (categoryDifference !== 0) return categoryDifference;
    return Number(left.sort_order) - Number(right.sort_order);
  });
}

export async function loadCatalogCategoryOrders(
  db: SupabaseClient,
  kind: CatalogKind,
): Promise<CatalogCategoryOrder[]> {
  const { data, error } = await db
    .from('catalog_category_orders')
    .select('category,sort_order')
    .eq('catalog_kind', kind)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as CatalogCategoryOrder[]).map((item) => ({
    ...item,
    category: normalizeCategory(item.category),
  }));
}

export async function loadCatalogRow(
  db: SupabaseClient,
  kind: CatalogKind,
  id: string,
): Promise<AdminCatalogRow | null> {
  const { data, error } = await db
    .from(getTable(kind))
    .select(getRelations(kind))
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as AdminCatalogRow;
  const translations = await loadCatalogTranslations(db, kind, row.id, row);
  return { ...row, translations };
}

export async function loadCatalogCounts(db: SupabaseClient): Promise<Record<CatalogKind, number> & { products: number }> {
  const [builds, combos, products] = await Promise.all([
    db.from('builds').select('id', { count: 'exact', head: true }),
    db.from('combos').select('id', { count: 'exact', head: true }),
    db.from('products').select('id', { count: 'exact', head: true }),
  ]);

  if (builds.error) throw builds.error;
  if (combos.error) throw combos.error;
  if (products.error) throw products.error;

  return { builds: builds.count ?? 0, combos: combos.count ?? 0, products: products.count ?? 0 };
}

export async function searchProducts(
  db: SupabaseClient,
  slot: CatalogSlot,
  query: string,
): Promise<AdminCatalogProduct[]> {
  let request = db
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('type', slot)
    .order('name', { ascending: true })
    .limit(12);

  if (query.trim()) request = request.ilike('name', `%${query.trim()}%`);

  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as unknown as AdminCatalogProduct[];
}

function safeSearch(value: string): string {
  return value.trim().slice(0, 80).replace(/[%,()]/g, ' ');
}

export async function loadProductPriceRows(
  db: SupabaseClient,
  options: {
    query?: string;
    type?: string;
    status?: AdminProductPriceStatus;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<{ rows: AdminProductPriceRow[]; count: number; page: number; pageSize: number }> {
  const pageSize = Math.min(Math.max(options.pageSize ?? 24, 1), 100);
  const page = Math.max(options.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let request = db
    .from('products')
    .select(PRODUCT_PRICE_SELECT, { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to);

  const query = safeSearch(options.query ?? '');
  if (query) request = request.or(`name.ilike.%${query}%,brand.ilike.%${query}%,slug.ilike.%${query}%`);
  if (options.type && options.type !== 'all') request = request.eq('type', options.type);
  if (options.status === 'current') request = request.not('price_usd', 'is', null).or('price_eur.not.is.null');
  if (options.status === 'missing') request = request.or('price_usd.is.null,price_eur.is.null');

  const { data, error, count } = await request;
  if (error) throw error;

  return {
    rows: (data ?? []) as unknown as AdminProductPriceRow[],
    count: count ?? 0,
    page,
    pageSize,
  };
}

export async function loadProductTypes(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db.from('products').select('type').order('type', { ascending: true });
  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.type).filter((type): type is string => Boolean(type)))];
}

const PRICE_KEYS = [
  'price_usd',
  'price_eur',
  'price_base_usd',
  'price_base_eur',
  'price_source_url_usd',
  'price_source_url_eur',
  'price_checked_at_usd',
  'price_checked_at_eur',
] as const;

function parseAdminPrice(value: unknown, field: string): number | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10_000_000) {
    throw new Error(`El campo ${field} debe ser un número entre 0 y 10.000.000.`);
  }
  return Math.round(value * 100) / 100;
}

function parseAdminUrl(value: unknown, field: string): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048) throw new Error(`La fuente ${field} no es válida.`);
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocol');
  } catch {
    throw new Error(`La fuente ${field} debe ser una URL http o https.`);
  }
  return value.trim();
}

function parseAdminDate(value: unknown, field: string): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`La fecha ${field} no es válida.`);
  return value;
}

export function parseAdminProductPriceUpdates(input: unknown): AdminProductPriceUpdate[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 100) {
    throw new Error('Selecciona entre 1 y 100 productos para guardar.');
  }

  const ids = new Set<string>();
  return input.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Cada actualización debe ser válida.');
    const value = item as Record<string, unknown>;
    if (typeof value.id !== 'string' || !value.id.trim() || value.id.length > 200) throw new Error('El producto seleccionado no es válido.');
    const id = value.id.trim();
    if (ids.has(id)) throw new Error('No se puede repetir un producto en el mismo lote.');
    ids.add(id);
    for (const key of PRICE_KEYS) {
      if (!(key in value)) throw new Error(`Falta el campo ${key}.`);
    }
    return {
      id,
      price_usd: parseAdminPrice(value.price_usd, 'USD'),
      price_eur: parseAdminPrice(value.price_eur, 'EUR'),
      price_base_usd: parseAdminPrice(value.price_base_usd, 'MSRP USD'),
      price_base_eur: parseAdminPrice(value.price_base_eur, 'MSRP EUR'),
      price_source_url_usd: parseAdminUrl(value.price_source_url_usd, 'USD'),
      price_source_url_eur: parseAdminUrl(value.price_source_url_eur, 'EUR'),
      price_checked_at_usd: parseAdminDate(value.price_checked_at_usd, 'USD'),
      price_checked_at_eur: parseAdminDate(value.price_checked_at_eur, 'EUR'),
    };
  });
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'catalog-item';
}

function optionalPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 10_000_000) {
    throw new Error('Los precios deben ser números entre 0 y 10.000.000.');
  }
  return Math.round(number * 100) / 100;
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new Error(`El campo ${field} es obligatorio y no puede superar ${maxLength} caracteres.`);
  }
  return value.trim();
}

async function getNextItemOrder(db: SupabaseClient, kind: CatalogKind, category: string): Promise<number> {
  const { data, error } = await db
    .from(kind)
    .select('sort_order')
    .eq('category', category)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.sort_order ?? 0) + 1;
}

export async function ensureCatalogCategoryOrder(
  db: SupabaseClient,
  kind: CatalogKind,
  category: string,
): Promise<void> {
  const normalizedCategory = toStoredCategory(normalizeCategory(category));
  const { data: existing, error: existingError } = await db
    .from('catalog_category_orders')
    .select('category')
    .eq('catalog_kind', kind)
    .eq('category', normalizedCategory)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return;

  const { data: lastCategory, error: orderError } = await db
    .from('catalog_category_orders')
    .select('sort_order')
    .eq('catalog_kind', kind)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) throw orderError;

  const { error } = await db.from('catalog_category_orders').insert({
    catalog_kind: kind,
    category: normalizedCategory,
    sort_order: Number(lastCategory?.sort_order ?? 0) + 1,
  });

  if (error && error.code !== '23505') throw error;
}

export interface CatalogMutationPayload {
  title?: unknown;
  category?: unknown;
  is_active?: unknown;
  cpu_id?: unknown;
  gpu_id?: unknown;
  ram_id?: unknown;
  motherboard_id?: unknown;
  storage_id?: unknown;
  psu_id?: unknown;
  translations?: unknown;
  [key: string]: unknown;
}

export function parseCatalogTranslations(input: CatalogMutationPayload): AdminCatalogTranslations {
  if (!input.translations || typeof input.translations !== 'object' || Array.isArray(input.translations)) {
    throw new Error('Añade el título y la categoría en inglés y español.');
  }

  const translations = input.translations as Record<string, unknown>;
  const parseLocale = (locale: 'en' | 'es'): AdminCatalogTranslation => {
    const value = translations[locale];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Faltan los textos en ${locale === 'en' ? 'inglés' : 'español'}.`);
    }
    const translation = value as Record<string, unknown>;
    return {
      title: requiredString(translation.title, `título en ${locale === 'en' ? 'inglés' : 'español'}`, 160),
      category: requiredString(translation.category, `categoría en ${locale === 'en' ? 'inglés' : 'español'}`, 80),
    };
  };

  return { en: parseLocale('en'), es: parseLocale('es') };
}

export async function loadCatalogTranslations(
  db: SupabaseClient,
  kind: CatalogKind,
  id: string,
  fallback: Pick<AdminCatalogRow, 'title' | 'category'>,
): Promise<AdminCatalogTranslations> {
  const idColumn = getTranslationIdColumn(kind);
  const { data, error } = await db
    .from(getTranslationTable(kind))
    .select(`locale,title,category,${idColumn}`)
    .eq(idColumn, id)
    .in('locale', ['en', 'es']);
  if (error) throw error;

  const byLocale = new Map((data ?? []).map((item) => [item.locale, item]));
  const getTranslation = (locale: 'en' | 'es'): AdminCatalogTranslation => {
    const translation = byLocale.get(locale);
    return {
      title: typeof translation?.title === 'string' && translation.title ? translation.title : fallback.title,
      category: typeof translation?.category === 'string' && translation.category ? translation.category : fallback.category,
    };
  };

  return { en: getTranslation('en'), es: getTranslation('es') };
}

export async function saveCatalogTranslations(
  db: SupabaseClient,
  kind: CatalogKind,
  id: string,
  translations: AdminCatalogTranslations,
): Promise<void> {
  const idColumn = getTranslationIdColumn(kind);
  const rows = (['en', 'es'] as const).map((locale) => ({
    [idColumn]: id,
    locale,
    title: translations[locale].title,
    category: translations[locale].category,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db
    .from(getTranslationTable(kind))
    .upsert(rows, { onConflict: `${idColumn},locale` });
  if (error) throw error;
}

export async function buildCatalogMutation(
  db: SupabaseClient,
  kind: CatalogKind,
  input: CatalogMutationPayload,
  id?: string,
): Promise<Record<string, unknown>> {
  const slots = getSlots(kind);
  if (input.is_active !== undefined && typeof input.is_active !== 'boolean') {
    throw new Error('El estado de publicación no es válido.');
  }
  const payload: Record<string, unknown> = {
    title: requiredString(input.title, 'título', 160),
    category: requiredString(input.category, 'categoría', 80),
    is_active: input.is_active !== false,
  };

  const productIds = slots.map((slot) => {
    const value = input[`${slot}_id`];
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Selecciona un producto para ${slot}.`);
    payload[`${slot}_id`] = value;
    return value;
  });

  const uniqueProductIds = [...new Set(productIds)];
  const { data: products, error: productError } = await db
    .from('products')
    .select('id,type')
    .in('id', uniqueProductIds);

  if (productError) throw productError;
  const productById = new Map(((products ?? []) as Array<{ id: string; type: string }>).map((product) => [product.id, product]));

  for (const slot of slots) {
    const product = productById.get(String(payload[`${slot}_id`]));
    if (!product || product.type.toLowerCase() !== slot) {
      throw new Error(`El producto seleccionado para ${slot} no es válido.`);
    }
  }

  for (const slot of slots) {
    for (const currency of ['usd', 'eur'] as const) {
      payload[`custom_price_${slot}_${currency}`] = optionalPrice(input[`custom_price_${slot}_${currency}`]);
    }
  }

  if (!id) {
    const baseSlug = slugify(String(payload.title));
    payload.slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
    payload.sort_order = await getNextItemOrder(db, kind, String(payload.category));
  } else {
    const { data: current, error: currentError } = await db
      .from(kind)
      .select('category')
      .eq('id', id)
      .maybeSingle();

    if (currentError) throw currentError;
    if (normalizeCategory(current?.category) !== normalizeCategory(payload.category)) {
      payload.sort_order = await getNextItemOrder(db, kind, String(payload.category));
    }
  }

  return payload;
}
