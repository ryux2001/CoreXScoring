import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { consumeApiRateLimit } from '@/lib/api-security';

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
  [key: string]: unknown;
}

export interface CatalogCategoryOrder {
  category: string;
  sort_order: number;
}

export const BUILD_SLOTS: CatalogSlot[] = ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'];
export const COMBO_SLOTS: CatalogSlot[] = ['cpu', 'gpu', 'ram'];

const PRODUCT_SELECT = 'id,slug,name,brand,type,price_usd,price_eur,price_base_usd,price_base_eur';

function getTable(kind: CatalogKind): 'builds' | 'combos' {
  return kind;
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

export function normalizeCategory(category: unknown): string {
  return typeof category === 'string' && category.trim() ? category.trim() : 'Sin categoría';
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
  return (data ?? []) as CatalogCategoryOrder[];
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
  return (data ?? null) as unknown as AdminCatalogRow | null;
}

export async function loadCatalogCounts(db: SupabaseClient): Promise<Record<CatalogKind, number>> {
  const [builds, combos] = await Promise.all([
    db.from('builds').select('id', { count: 'exact', head: true }),
    db.from('combos').select('id', { count: 'exact', head: true }),
  ]);

  if (builds.error) throw builds.error;
  if (combos.error) throw combos.error;

  return { builds: builds.count ?? 0, combos: combos.count ?? 0 };
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
  const normalizedCategory = normalizeCategory(category);
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
  [key: string]: unknown;
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
