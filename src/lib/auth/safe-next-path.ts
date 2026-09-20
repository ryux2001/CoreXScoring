const ALLOWED_AUTH_NEXT_PATHS = new Set(['/catalog', '/vault/account']);

export function getSafeAuthNextPath(value: string | null) {
  if (!value || /[\u0000-\u001f\u007f\\]/.test(value)) return '/catalog';
  const localizedPrefix = value.startsWith('/es/') ? '/es' : '';
  const basePath = localizedPrefix ? value.slice(localizedPrefix.length) : value;
  const isLocalizedRecoveryPath = Boolean(localizedPrefix) && basePath === '/auth/update-password';
  if (!ALLOWED_AUTH_NEXT_PATHS.has(basePath) && !isLocalizedRecoveryPath) return '/catalog';

  return value;
}
