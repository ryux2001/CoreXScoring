export const UNCATEGORIZED_CATEGORY = '__uncategorized__';

const STORED_UNCATEGORIZED_CATEGORY = 'Sin categoría';

export function normalizeCategory(category: unknown): string {
  if (typeof category !== 'string' || !category.trim() || category.trim() === STORED_UNCATEGORIZED_CATEGORY) {
    return UNCATEGORIZED_CATEGORY;
  }
  return category.trim();
}

export function toStoredCategory(category: string): string {
  return category === UNCATEGORIZED_CATEGORY ? STORED_UNCATEGORIZED_CATEGORY : category;
}
