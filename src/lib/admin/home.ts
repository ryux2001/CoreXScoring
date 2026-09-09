import type { SupabaseClient } from '@supabase/supabase-js';

export type HomeContentType = 'products' | 'combos' | 'builds' | 'comparisons';
export type HomeCatalogType = Exclude<HomeContentType, 'comparisons'>;

export interface HomeHero {
  eyebrow: string;
  title: string;
  description: string;
  primary_label: string;
  primary_href: string;
  secondary_label: string;
  secondary_href: string;
  is_active: boolean;
}

export interface HomeCatalogItem {
  id: string;
  slug: string;
  name?: string;
  title?: string;
  brand?: string;
  type?: string;
  category?: string;
  is_active?: boolean;
}

export interface HomeSectionItem {
  id: string;
  sort_order: number;
  product_id: string | null;
  combo_id: string | null;
  build_id: string | null;
  product?: HomeCatalogItem | null;
  combo?: HomeCatalogItem | null;
  build?: HomeCatalogItem | null;
}

export interface HomeComparisonItem extends HomeSectionItem {
  comparison_id: string;
}

export interface HomeComparison {
  id: string;
  section_id: string;
  title: string;
  description: string;
  eyebrow: string;
  item_type: HomeCatalogType;
  is_active: boolean;
  sort_order: number;
  home_comparison_items: HomeComparisonItem[];
}

export interface HomeSection {
  id: string;
  title: string;
  description: string;
  eyebrow: string;
  content_type: HomeContentType;
  visual_variant: 'default' | 'spotlight' | 'compact';
  is_active: boolean;
  sort_order: number;
  home_section_items: HomeSectionItem[];
  home_comparisons: HomeComparison[];
}

export interface HomeAdminData {
  hero: HomeHero;
  sections: HomeSection[];
}

const DEFAULT_HERO: HomeHero = {
  eyebrow: 'CoreXScoring',
  title: 'Decide tu próximo equipo con datos.',
  description: 'Compara hardware, descubre configuraciones equilibradas y encuentra la mejor opción para tu presupuesto.',
  primary_label: 'Explorar catálogo',
  primary_href: '/catalog',
  secondary_label: 'Abrir comparador',
  secondary_href: '/comparator',
  is_active: true,
};

const HOME_SECTION_SELECT = `
  id,title,description,eyebrow,content_type,visual_variant,is_active,sort_order,
  home_section_items(
    id,sort_order,product_id,combo_id,build_id,
    product:products!product_id(*),
    combo:combos!combo_id(*,cpu:products!cpu_id(*),gpu:products!gpu_id(*),ram:products!ram_id(*)),
    build:builds!build_id(*,cpu:products!cpu_id(*),gpu:products!gpu_id(*),ram:products!ram_id(*),motherboard:products!motherboard_id(*),storage:products!storage_id(*),psu:products!psu_id(*))
  ),
  home_comparisons(
    id,section_id,title,description,eyebrow,item_type,is_active,sort_order,
    home_comparison_items(
      id,comparison_id,sort_order,product_id,combo_id,build_id,
      product:products!product_id(*),
      combo:combos!combo_id(*,cpu:products!cpu_id(*),gpu:products!gpu_id(*),ram:products!ram_id(*)),
      build:builds!build_id(*,cpu:products!cpu_id(*),gpu:products!gpu_id(*),ram:products!ram_id(*),motherboard:products!motherboard_id(*),storage:products!storage_id(*),psu:products!psu_id(*))
    )
  )
`;

function orderNestedContent(sections: HomeSection[]): HomeSection[] {
  return sections.map((section) => ({
    ...section,
    home_section_items: (section.home_section_items || []).toSorted((left, right) => left.sort_order - right.sort_order),
    home_comparisons: (section.home_comparisons || [])
      .map((comparison) => ({
        ...comparison,
        home_comparison_items: (comparison.home_comparison_items || [])
          .toSorted((left, right) => left.sort_order - right.sort_order),
      }))
      .toSorted((left, right) => left.sort_order - right.sort_order),
  }));
}

export async function loadHomeAdminData(db: SupabaseClient): Promise<HomeAdminData> {
  const [heroResult, sectionsResult] = await Promise.all([
    db.from('home_hero').select('eyebrow,title,description,primary_label,primary_href,secondary_label,secondary_href,is_active').eq('id', true).maybeSingle(),
    db.from('home_sections').select(HOME_SECTION_SELECT).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
  ]);

  if (heroResult.error) throw heroResult.error;
  if (sectionsResult.error) throw sectionsResult.error;

  return {
    hero: (heroResult.data || DEFAULT_HERO) as HomeHero,
    sections: orderNestedContent((sectionsResult.data || []) as unknown as HomeSection[]),
  };
}

export async function loadPublicHomeData(db: SupabaseClient): Promise<HomeAdminData> {
  const [heroResult, sectionsResult] = await Promise.all([
    db.from('home_hero').select('eyebrow,title,description,primary_label,primary_href,secondary_label,secondary_href,is_active').eq('id', true).eq('is_active', true).maybeSingle(),
    db.from('home_sections').select(HOME_SECTION_SELECT).eq('is_active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
  ]);

  if (heroResult.error) throw heroResult.error;
  if (sectionsResult.error) throw sectionsResult.error;

  return {
    hero: (heroResult.data || { ...DEFAULT_HERO, is_active: false }) as HomeHero,
    sections: orderNestedContent((sectionsResult.data || []) as unknown as HomeSection[]),
  };
}

export function parseHomeContentType(value: unknown): HomeContentType | null {
  return value === 'products' || value === 'combos' || value === 'builds' || value === 'comparisons'
    ? value
    : null;
}

export function parseHomeCatalogType(value: unknown): HomeCatalogType | null {
  return value === 'products' || value === 'combos' || value === 'builds' ? value : null;
}

export function getItemId(item: HomeSectionItem): string | null {
  return item.product_id || item.combo_id || item.build_id;
}

export function getItemContent(item: HomeSectionItem): HomeCatalogItem | null {
  return item.product || item.combo || item.build || null;
}

export function getCatalogTable(type: HomeCatalogType): 'products' | 'combos' | 'builds' {
  return type === 'products' ? 'products' : type;
}

export function getForeignKey(type: HomeCatalogType): 'product_id' | 'combo_id' | 'build_id' {
  return type === 'products' ? 'product_id' : type === 'combos' ? 'combo_id' : 'build_id';
}

export function catalogItemLabel(item: HomeCatalogItem): string {
  const title = item.name || item.title || 'Sin título';
  return item.brand ? `${item.brand} ${title}` : title;
}

export function requiredHomeText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new Error(`El campo ${field} es obligatorio y no puede superar ${maxLength} caracteres.`);
  }
  return value.trim();
}

export function optionalHomeText(value: unknown, field: string, maxLength: number): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new Error(`El campo ${field} no puede superar ${maxLength} caracteres.`);
  }
  return value.trim();
}

export function homeHref(value: unknown, field: string): string {
  const href = requiredHomeText(value, field, 240);
  if (!href.startsWith('/') || href.startsWith('//')) {
    throw new Error(`El campo ${field} debe ser una ruta interna que empiece por /.`);
  }
  return href;
}

export async function validateCatalogItemIds(
  db: SupabaseClient,
  type: HomeCatalogType,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  if (new Set(ids).size !== ids.length || ids.some((id) => typeof id !== 'string' || !id.trim())) {
    throw new Error('La lista de elementos contiene identificadores no válidos o duplicados.');
  }

  let query = db.from(getCatalogTable(type)).select('id').in('id', ids);
  if (type !== 'products') query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  if ((data || []).length !== ids.length) {
    throw new Error('Uno o más elementos no existen o no están publicados.');
  }
}

export async function validateComparableCatalogItemIds(
  db: SupabaseClient,
  type: HomeCatalogType,
  ids: string[],
): Promise<void> {
  await validateCatalogItemIds(db, type, ids);
  if (type !== 'products') return;

  const { data, error } = await db.from('products').select('type').in('id', ids);
  if (error) throw error;
  const componentTypes = new Set((data || []).map((item) => String(item.type || '').toUpperCase()).filter(Boolean));
  if (componentTypes.size !== 1) {
    throw new Error('Una comparación de componentes debe usar productos del mismo tipo, por ejemplo solo CPU o solo GPU.');
  }
}
