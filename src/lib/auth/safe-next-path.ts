const ALLOWED_AUTH_NEXT_PATHS = new Set(['/catalog']);

export function getSafeAuthNextPath(value: string | null) {
  if (!value || /[\u0000-\u001f\u007f\\]/.test(value)) return '/catalog';
  if (!ALLOWED_AUTH_NEXT_PATHS.has(value)) return '/catalog';

  return value;
}
