export const MAX_DELETE_REQUEST_BYTES = 4096;
export const MAX_DELETE_PASSWORD_LENGTH = 128;
export const DELETE_CONFIRMATION_TEXT = 'ELIMINAR';

export interface DeleteAccountRequest {
  confirmation: string;
  password: string;
}

export function parseDeleteAccountRequest(value: string): DeleteAccountRequest | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== 2 || keys[0] !== 'confirmation' || keys[1] !== 'password') return null;
  if (typeof record.confirmation !== 'string' || typeof record.password !== 'string') return null;
  if (record.password.length < 1 || record.password.length > MAX_DELETE_PASSWORD_LENGTH) return null;
  if (record.confirmation.trim().toUpperCase() !== DELETE_CONFIRMATION_TEXT) return null;

  return {
    confirmation: record.confirmation,
    password: record.password,
  };
}
