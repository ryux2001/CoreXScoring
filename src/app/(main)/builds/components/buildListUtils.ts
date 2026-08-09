const buildSlots = ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu'] as const;

export function getBuildCategories(builds: any[]): string[] {
  return Array.from(
    new Set(builds.map((build) => build.category).filter(Boolean)),
  ).sort();
}

export function filterBuilds(
  builds: any[],
  searchTerm: string,
  category: string,
): any[] {
  const search = searchTerm.trim().toLowerCase();

  return builds.filter((build) => {
    if (category && build.category !== category) return false;
    if (!search) return true;

    return [
      build.title,
      build.slug,
      ...buildSlots.flatMap((slot) => [
        build[slot]?.name,
        build[slot]?.brand,
        build[slot]?.slug,
      ]),
    ].some((value) => String(value || '').toLowerCase().includes(search));
  });
}

export function paginateBuilds(builds: any[], page?: string, itemsPerPage = 12) {
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
