export function getComboCategories(combos: any[]): string[] {
  return Array.from(
    new Set(combos.map((combo) => combo.category).filter(Boolean)),
  ).sort();
}

export function filterCombos(
  combos: any[],
  searchTerm: string,
  category: string,
): any[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return combos.filter((combo) => {
    const matchesCategory = !category || combo.category === category;
    if (!matchesCategory) return false;
    if (!normalizedSearch) return true;

    const searchableValues = [
      combo.title,
      combo.slug,
      combo.category,
      combo.cpu?.name,
      combo.cpu?.brand,
      combo.cpu?.slug,
      combo.gpu?.name,
      combo.gpu?.brand,
      combo.gpu?.slug,
      combo.ram?.name,
      combo.ram?.brand,
      combo.ram?.slug,
    ];

    return searchableValues.some((value) =>
      String(value || '').toLowerCase().includes(normalizedSearch),
    );
  });
}

export function paginateCombos(combos: any[], page: string | undefined, itemsPerPage = 12) {
  const requestedPage = Number.parseInt(page || '1', 10) || 1;
  const totalPages = Math.ceil(combos.length / itemsPerPage);
  const currentPage = Math.min(
    Math.max(requestedPage, 1),
    Math.max(totalPages, 1),
  );

  return {
    currentPage,
    totalPages,
    visibleCombos: combos.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    ),
  };
}
