const ALLOWED_AUTH_NEXT_PATHS = new Set(['/catalog']);
const RECOVERY_AUTH_NEXT_PATH = '/auth/update-password';

export function getSafeAuthNextPath(value: string | null) {
  if (!value || /[\u0000-\u001f\u007f\\]/.test(value)) return '/catalog';
  if (!ALLOWED_AUTH_NEXT_PATHS.has(value)) return '/catalog';

  return value;
}

export function isRecoveryAuthNextPath(value: string | null) {
  return value === RECOVERY_AUTH_NEXT_PATH;
}
