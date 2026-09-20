import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { localizeBuilds, localizeCombos, localizeHomeContent, localizeProducts } from '@/lib/content/translations';

type Row = Record<string, unknown>;

function createDb(rowsByTable: Record<string, Row[]>): SupabaseClient {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let ids: string[] | null = null;
      const query = {
        select() {
          return query;
        },
        in(column: string, values: string[]) {
          filters[column] = undefined;
          ids = values;
          return query;
        },
        eq(column: string, value: unknown) {
          filters[column] = value;
          return query;
        },
        then(resolve: (value: { data: Row[]; error: null }) => unknown) {
          const data = (rowsByTable[table] ?? []).filter((row) => (
            Object.entries(filters).every(([column, value]) => value === undefined || row[column] === value)
            && (!ids || ids.includes(String(row.product_id ?? row.combo_id ?? row.build_id ?? row.section_id ?? row.comparison_id ?? row.hero_id)))
          ));
          return Promise.resolve(resolve({ data, error: null }));
        },
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

describe('phase 5 Supabase content localization', () => {
  it('localizes available fields and preserves original fields when a field is missing', async () => {
    const db = createDb({
      product_translations: [{ product_id: 'cpu-1', locale: 'en', name: 'English CPU', description: null, category: 'Desktop' }],
    });
    const product = { id: 'cpu-1', slug: 'cpu-original', name: 'Nombre original', description: 'Descripción original', brand: 'Brand', type: 'CPU' };

    await expect(localizeProducts(db, [product], 'en')).resolves.toEqual([{
      ...product,
      name: 'English CPU',
      category: 'Desktop',
    }]);
  });

  it('localizes combo and build titles plus nested product names without changing IDs or slugs', async () => {
    const db = createDb({
      combo_translations: [{ combo_id: 'combo-1', locale: 'es', title: 'Combo traducido', category: 'Gaming' }],
      build_translations: [{ build_id: 'build-1', locale: 'es', title: 'Build traducido', category: 'Trabajo' }],
      product_translations: [
        { product_id: 'cpu-1', locale: 'es', name: 'Procesador traducido' },
        { product_id: 'gpu-1', locale: 'es', name: 'GPU traducida' },
      ],
    });
    const combo = { id: 'combo-1', slug: 'combo-original', title: 'Original', category: 'Gaming', cpu: { id: 'cpu-1', name: 'CPU original' } };
    const build = { id: 'build-1', slug: 'build-original', title: 'Original', category: 'Gaming', gpu: { id: 'gpu-1', name: 'GPU original' } };

    const [localizedCombo] = await localizeCombos(db, [combo], 'es');
    const [localizedBuild] = await localizeBuilds(db, [build], 'es');

    expect(localizedCombo).toMatchObject({ id: 'combo-1', slug: 'combo-original', title: 'Combo traducido', cpu: { id: 'cpu-1', name: 'Procesador traducido' } });
    expect(localizedBuild).toMatchObject({ id: 'build-1', slug: 'build-original', title: 'Build traducido', gpu: { id: 'gpu-1', name: 'GPU traducida' } });
  });

  it('localizes home editorial content while retaining shared hrefs', async () => {
    const db = createDb({
      home_hero_translations: [{ hero_id: true, locale: 'en', eyebrow: 'CoreX', title: 'English hero', description: 'English description', primary_label: 'Explore', secondary_label: 'Compare' }],
      home_section_translations: [{ section_id: 'section-1', locale: 'en', eyebrow: 'Featured', title: 'English section', description: 'English section description' }],
      home_comparison_translations: [{ comparison_id: 'comparison-1', locale: 'en', eyebrow: 'Compare', title: 'English comparison', description: 'English comparison description' }],
    });
    const hero = { id: true, title: 'Título original', description: 'Descripción original', primary_label: 'Explorar', secondary_label: 'Comparar', primary_href: '/catalog', secondary_href: '/comparator' };
    const sections = [{ id: 'section-1', title: 'Sección original', description: 'Descripción original', home_section_items: [], home_comparisons: [{ id: 'comparison-1', title: 'Comparación original', description: '', eyebrow: '' }] }];

    const localized = await localizeHomeContent(db, hero, sections, 'en');

    expect(localized.hero).toMatchObject({ title: 'English hero', primary_href: '/catalog', secondary_href: '/comparator' });
    expect(localized.sections[0]).toMatchObject({ id: 'section-1', title: 'English section', home_comparisons: [{ id: 'comparison-1', title: 'English comparison' }] });
  });
});
