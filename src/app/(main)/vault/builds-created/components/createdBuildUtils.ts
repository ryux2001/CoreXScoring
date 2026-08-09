import { getBuildPartPrice } from '@/lib/scoringBuilds';

const buildParts = ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'] as const;

export function getCreatedBuildPrice(build: any, currency: string): number {
  return buildParts.reduce(
    (total, part) => total + getBuildPartPrice(build, part, currency),
    0,
  );
}

export function getAvailableCreatedBuildBrands(builds: any[]) {
  return {
    cpu: Array.from(new Set(builds.map((build) => build.cpu?.brand).filter(Boolean))).sort(),
    gpu: Array.from(new Set(builds.map((build) => build.gpu?.brand).filter(Boolean))).sort(),
  };
}

export function filterCreatedBuilds(
  builds: any[],
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

  return builds.filter((build) => {
    const matchesCpu = !options.cpuBrand || build.cpu?.brand === options.cpuBrand;
    const matchesGpu = !options.gpuBrand || build.gpu?.brand === options.gpuBrand;
    const totalPrice = getCreatedBuildPrice(build, options.currency);
    const matchesMin = minPrice === null || totalPrice >= minPrice;
    const matchesMax = maxPrice === null || totalPrice <= maxPrice;

    if (!matchesCpu || !matchesGpu || !matchesMin || !matchesMax) return false;
    if (!search) return true;

    return [
      build.title,
      build.slug,
      build.category,
      ...buildParts.flatMap((part) => [
        build[part]?.name,
        build[part]?.brand,
        build[part]?.slug,
      ]),
    ].some((value) => String(value || '').toLowerCase().includes(search));
  });
}

export function paginateCreatedBuilds(builds: any[], page?: string, itemsPerPage = 12) {
  const requestedPage = Number.parseInt(page || '1', 10) || 1;
  const totalPages = Math.ceil(builds.length / itemsPerPage);
  const currentPage = Math.min(
    Math.max(requestedPage, 1),
    Math.max(totalPages, 1),
  );

  return {
    currentPage,
    totalPages,
    visibleBuilds: builds.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    ),
  };
}
