export function formatPrice(value: number, locale: string, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}
