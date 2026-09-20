import { describe, expect, it } from 'vitest';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import { normalizeCategory, toStoredCategory, UNCATEGORIZED_CATEGORY } from '@/lib/admin/catalog-categories';
import { catalogItemLabel } from '@/lib/admin/home';

describe('administration localization contracts', () => {
  it('keeps the uncategorized sentinel internal while preserving the database value', () => {
    expect(normalizeCategory(null)).toBe(UNCATEGORIZED_CATEGORY);
    expect(normalizeCategory('')).toBe(UNCATEGORIZED_CATEGORY);
    expect(normalizeCategory('Sin categoría')).toBe(UNCATEGORIZED_CATEGORY);
    expect(toStoredCategory(UNCATEGORIZED_CATEGORY)).toBe('Sin categoría');
  });

  it('localizes administrative fallbacks and provider statuses', () => {
    expect(catalogItemLabel({ id: 'item-1', slug: 'item-1' }, en.admin.common.unknownItem)).toBe('Unknown item');
    expect(catalogItemLabel({ id: 'item-1', slug: 'item-1' }, es.admin.common.unknownItem)).toBe('Elemento desconocido');
    expect(en.admin.common.providerStatus.rateLimited).toBeTruthy();
    expect(es.admin.common.providerStatus.rateLimited).toBeTruthy();
  });
});
