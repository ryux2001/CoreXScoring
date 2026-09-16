/**
 * Formats a product release date without allowing null/empty sentinel values
 * to become the Unix epoch (01/1970) in the browser.
 */
export const formatReleaseDate = (
  value: unknown,
  locale: string,
  unavailableLabel: string,
): string => {
  if (value === null || value === undefined) return unavailableLabel;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized || ['null', 'undefined', 'n/a', 'na', '-'].includes(normalized)) {
      return unavailableLabel;
    }
    if (/^0+(?:\.0+)?$/.test(normalized)) return unavailableLabel;
  }

  if (typeof value === 'number' && (!Number.isFinite(value) || value <= 0)) {
    return unavailableLabel;
  }

  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1970) {
    return unavailableLabel;
  }

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
};
