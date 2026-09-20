import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from '@/i18n/routing';

type TranslationRow = Record<string, unknown> & { locale: string };
type ContentRecord = Record<string, unknown>;

const productRelationKeys = ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu', 'product'];

function isContentRecord(value: unknown): value is ContentRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asContentRecords(value: unknown): ContentRecord[] {
  return Array.isArray(value) ? value.filter(isContentRecord) : [];
}

async function loadTranslationMap(
  db: SupabaseClient,
  table: string,
  idColumn: string,
  ids: string[],
  locale: Locale,
): Promise<Map<string, TranslationRow>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await db
    .from(table)
    .select('*')
    .in(idColumn, uniqueIds)
    .eq('locale', locale);

  if (error) throw error;

  return new Map((data ?? []).map((row) => [String(row[idColumn]), row as TranslationRow]));
}

function applyFields<T extends ContentRecord>(record: T, translation: TranslationRow | undefined, fields: string[]): T {
  if (!translation) return record;

  const localized: ContentRecord = { ...record };
  for (const field of fields) {
    if (translation[field] !== null && translation[field] !== undefined) {
      localized[field] = translation[field];
    }
  }
  return localized as T;
}

function collectNestedProducts(records: ContentRecord[]): ContentRecord[] {
  return records.flatMap((record) => productRelationKeys.flatMap((key) => {
    const relation = record?.[key];
    if (Array.isArray(relation)) return relation.filter(isContentRecord);
    return isContentRecord(relation) ? [relation] : [];
  }));
}

async function localizeNestedProducts(
  db: SupabaseClient,
  records: ContentRecord[],
  locale: Locale,
): Promise<ContentRecord[]> {
  const products = collectNestedProducts(records);
  const translations = await loadTranslationMap(
    db,
    'product_translations',
    'product_id',
    products.map((product) => String(product.id)),
    locale,
  );

  return records.map((record) => {
    const localized = { ...record };
    for (const key of productRelationKeys) {
      const relation = record?.[key];
      if (Array.isArray(relation)) {
        localized[key] = relation
          .filter(isContentRecord)
          .map((item) => applyFields(item, translations.get(String(item.id)), ['name', 'description', 'category']));
      } else if (isContentRecord(relation)) {
        localized[key] = applyFields(relation, translations.get(String(relation.id)), ['name', 'description', 'category']);
      }
    }
    return localized;
  });
}

export async function localizeProducts<T extends ContentRecord>(
  db: SupabaseClient,
  products: T[],
  locale: Locale,
): Promise<T[]> {
  const translations = await loadTranslationMap(
    db,
    'product_translations',
    'product_id',
    products.map((product) => String(product.id)),
    locale,
  );

  return products.map((product) => applyFields(
    product,
    translations.get(String(product.id)),
    ['name', 'description', 'category'],
  )) as T[];
}

export async function localizeCombos<T extends ContentRecord>(
  db: SupabaseClient,
  combos: T[],
  locale: Locale,
): Promise<T[]> {
  const [localizedRelations, translations] = await Promise.all([
    localizeNestedProducts(db, combos, locale),
    loadTranslationMap(db, 'combo_translations', 'combo_id', combos.map((combo) => String(combo.id)), locale),
  ]);

  return localizedRelations.map((combo) => {
    const localized = applyFields(combo, translations.get(String(combo.id)), ['title', 'category']);
    return localized.category !== combo.category
      ? { ...localized, _sourceCategory: combo.category }
      : localized;
  }) as T[];
}

export async function localizeBuilds<T extends ContentRecord>(
  db: SupabaseClient,
  builds: T[],
  locale: Locale,
): Promise<T[]> {
  const [localizedRelations, translations] = await Promise.all([
    localizeNestedProducts(db, builds, locale),
    loadTranslationMap(db, 'build_translations', 'build_id', builds.map((build) => String(build.id)), locale),
  ]);

  return localizedRelations.map((build) => {
    const localized = applyFields(build, translations.get(String(build.id)), ['title', 'category']);
    return localized.category !== build.category
      ? { ...localized, _sourceCategory: build.category }
      : localized;
  }) as T[];
}

export async function localizeHomeContent(
  db: SupabaseClient,
  hero: ContentRecord,
  sections: ContentRecord[],
  locale: Locale,
): Promise<{ hero: ContentRecord; sections: ContentRecord[] }> {
  const comparisonIds = sections.flatMap((section) => asContentRecords(section.home_comparisons).map((comparison) => String(comparison.id)));
  const sectionIds = sections.map((section) => String(section.id));
  const items = sections.flatMap((section) => asContentRecords(section.home_section_items));
  const comparisons = sections.flatMap((section) => asContentRecords(section.home_comparisons));
  const comparisonItems = comparisons.flatMap((comparison) => asContentRecords(comparison.home_comparison_items));
  const allItems = [...items, ...comparisonItems];

  const [heroTranslation, sectionTranslations, comparisonTranslations, products, combos, builds] = await Promise.all([
    loadTranslationMap(db, 'home_hero_translations', 'hero_id', ['true'], locale),
    loadTranslationMap(db, 'home_section_translations', 'section_id', sectionIds, locale),
    loadTranslationMap(db, 'home_comparison_translations', 'comparison_id', comparisonIds, locale),
    localizeProducts(db, allItems.map((item) => item.product).filter(isContentRecord), locale),
    localizeCombos(db, allItems.map((item) => item.combo).filter(isContentRecord), locale),
    localizeBuilds(db, allItems.map((item) => item.build).filter(isContentRecord), locale),
  ]);

  const productsById = new Map(products.map((product) => [String(product.id), product]));
  const combosById = new Map(combos.map((combo) => [String(combo.id), combo]));
  const buildsById = new Map(builds.map((build) => [String(build.id), build]));

  const localizeItem = (item: ContentRecord) => ({
    ...item,
    product: isContentRecord(item.product) ? productsById.get(String(item.product.id)) ?? item.product : item.product,
    combo: isContentRecord(item.combo) ? combosById.get(String(item.combo.id)) ?? item.combo : item.combo,
    build: isContentRecord(item.build) ? buildsById.get(String(item.build.id)) ?? item.build : item.build,
  });

  const localizedSections = sections.map((section) => {
    const localizedComparisons = asContentRecords(section.home_comparisons).map((comparison) => ({
      ...applyFields(comparison, comparisonTranslations.get(String(comparison.id)), ['eyebrow', 'title', 'description']),
      home_comparison_items: asContentRecords(comparison.home_comparison_items).map(localizeItem),
    }));

    return {
      ...applyFields(section, sectionTranslations.get(String(section.id)), ['eyebrow', 'title', 'description']),
      home_section_items: asContentRecords(section.home_section_items).map(localizeItem),
      home_comparisons: localizedComparisons,
    };
  });

  return {
    hero: applyFields(hero, heroTranslation.get('true'), ['eyebrow', 'title', 'description', 'primary_label', 'secondary_label']),
    sections: localizedSections,
  };
}
