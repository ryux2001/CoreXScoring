import { getComboPartPrice } from '@/lib/scoringCombos';

export function getCreatedComboPrice(combo: any, currency: string): number {
  return (['cpu', 'gpu', 'ram'] as const).reduce(
    (total, part) => total + getComboPartPrice(combo, part, currency),
    0,
  );
}

export function getAvailableCreatedComboBrands(combos: any[]) {
  return {
    cpu: Array.from(
      new Set(combos.map((combo) => combo.cpu?.brand).filter(Boolean)),
    ).sort(),
    gpu: Array.from(
      new Set(combos.map((combo) => combo.gpu?.brand).filter(Boolean)),
    ).sort(),
  };
}

export function filterCreatedCombos(
  combos: any[],
  options: {
    search?: string;
    cpuBrand?: string;
    gpuBrand?: string;
    minPrice?: string;
    maxPrice?: string;
    currency: string;
  },
) {
  const search = options.search?.trim().toLowerCase() || '';
  const minPrice = options.minPrice ? Number(options.minPrice) : null;
  const maxPrice = options.maxPrice ? Number(options.maxPrice) : null;

  return combos.filter((combo) => {
    const matchesCpu = !options.cpuBrand || combo.cpu?.brand === options.cpuBrand;
    const matchesGpu = !options.gpuBrand || combo.gpu?.brand === options.gpuBrand;
    const totalPrice = getCreatedComboPrice(combo, options.currency);
    const matchesMin = minPrice === null || totalPrice >= minPrice;
    const matchesMax = maxPrice === null || totalPrice <= maxPrice;

    if (!matchesCpu || !matchesGpu || !matchesMin || !matchesMax) return false;
    if (!search) return true;

    return [
      combo.title,
      combo.slug,
      combo.cpu?.name,
      combo.cpu?.brand,
      combo.cpu?.slug,
      combo.gpu?.name,
      combo.gpu?.brand,
      combo.gpu?.slug,
      combo.ram?.name,
      combo.ram?.brand,
      combo.ram?.slug,
    ].some((value) => String(value || '').toLowerCase().includes(search));
  });
}

export function paginateCreatedCombos(combos: any[], page?: string, itemsPerPage = 12) {
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
