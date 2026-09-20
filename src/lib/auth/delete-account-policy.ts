import { isLocale, type Locale } from '@/i18n/routing';

export const MAX_DELETE_REQUEST_BYTES = 4096;
export const MAX_DELETE_PASSWORD_LENGTH = 128;

const DELETE_CONFIRMATION_TEXT: Record<Locale, string> = {
  en: 'DELETE',
  es: 'ELIMINAR',
};

export interface DeleteAccountRequest {
  confirmation: string;
  password: string;
  locale: Locale;
}

export function getDeleteConfirmationText(locale: Locale): string {
  return DELETE_CONFIRMATION_TEXT[locale];
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
  if (keys.length !== 3 || keys[0] !== 'confirmation' || keys[1] !== 'locale' || keys[2] !== 'password') return null;
  if (typeof record.confirmation !== 'string' || typeof record.password !== 'string') return null;
  if (typeof record.locale !== 'string' || !isLocale(record.locale)) return null;
  if (record.password.length < 1 || record.password.length > MAX_DELETE_PASSWORD_LENGTH) return null;
  if (record.confirmation.trim().toUpperCase() !== getDeleteConfirmationText(record.locale)) return null;

  return {
    confirmation: record.confirmation,
    password: record.password,
    locale: record.locale,
  };
}
