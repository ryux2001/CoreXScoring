/**
 * Normaliza keywords de tecnologías para aceptar variantes de escritura,
 * por ejemplo: "FSR3", "FSR 3" y "FSR-3".
 */
function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function includesGpuKeyword(text: string, keyword: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedKeyword = normalizeText(keyword).trim();

  if (!normalizedKeyword) return false;

  const compactText = normalizedText.replace(/[^a-z0-9]+/g, '');
  const compactKeyword = normalizedKeyword.replace(/[^a-z0-9]+/g, '');

  // Keywords cortas como "IA" no deben coincidir dentro de otra palabra.
  if (/^[a-z0-9]{1,3}$/.test(compactKeyword)) {
    const boundaryPattern = new RegExp(
      `(?:^|[^a-z0-9])${escapeRegExp(compactKeyword)}(?:$|[^a-z0-9])`,
    );

    if (boundaryPattern.test(normalizedText)) return true;
  }

  return (
    normalizedText.includes(normalizedKeyword) ||
    compactText.includes(compactKeyword)
  );
}

export function includesAnyGpuKeyword(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => includesGpuKeyword(text, keyword));
}
