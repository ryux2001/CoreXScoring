const UNAVAILABLE_RELEASE_DATE = 'No disponible';

/**
 * Formats a product release date without allowing null/empty sentinel values
 * to become the Unix epoch (01/1970) in the browser.
 */
export const formatReleaseDate = (value: unknown): string => {
  if (value === null || value === undefined) return UNAVAILABLE_RELEASE_DATE;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized || ['null', 'undefined', 'n/a', 'na', '-'].includes(normalized)) {
      return UNAVAILABLE_RELEASE_DATE;
    }
    if (/^0+(?:\.0+)?$/.test(normalized)) return UNAVAILABLE_RELEASE_DATE;
  }

  if (typeof value === 'number' && (!Number.isFinite(value) || value <= 0)) {
    return UNAVAILABLE_RELEASE_DATE;
  }

  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1970) {
    return UNAVAILABLE_RELEASE_DATE;
  }

  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
};
