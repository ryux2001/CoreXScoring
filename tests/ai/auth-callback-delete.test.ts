import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseDeleteAccountRequest } from '@/lib/auth/delete-account-policy';
import {
  getAuthConfirmUrl,
  getOAuthCallbackUrl,
  getPasswordRecoveryConfirmUrl,
} from '@/lib/authRedirects';
import { getSafeAuthNextPath } from '@/lib/auth/safe-next-path';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('auth callback and account deletion policy', () => {
  it('allows only the canonical internal auth destination', () => {
    expect(getSafeAuthNextPath('/catalog')).toBe('/catalog');
    expect(getSafeAuthNextPath('/vault/account')).toBe('/vault/account');
    expect(getSafeAuthNextPath('//evil.example')).toBe('/catalog');
    expect(getSafeAuthNextPath('/\\evil.example')).toBe('/catalog');
    expect(getSafeAuthNextPath('/%2f%2fevil.example')).toBe('/catalog');
    expect(getSafeAuthNextPath('/catalog?next=https://evil.example')).toBe('/catalog');
    expect(getSafeAuthNextPath('/auth/update-password')).toBe('/catalog');
    expect(getSafeAuthNextPath('/es/catalog')).toBe('/es/catalog');
    expect(getSafeAuthNextPath('/es/vault/account')).toBe('/es/vault/account');
    expect(getSafeAuthNextPath('/es/auth/update-password')).toBe('/es/auth/update-password');
  });

  it('requires a locale-specific confirmation and current password', () => {
    expect(parseDeleteAccountRequest(JSON.stringify({ confirmation: 'ELIMINAR', password: 'correct', locale: 'es' }))).toEqual({
      confirmation: 'ELIMINAR',
      password: 'correct',
      locale: 'es',
    });
    expect(parseDeleteAccountRequest(JSON.stringify({ confirmation: 'DELETE', password: 'correct', locale: 'en' }))).toEqual({
      confirmation: 'DELETE',
      password: 'correct',
      locale: 'en',
    });
    expect(parseDeleteAccountRequest(JSON.stringify({ confirmation: 'eliminar', password: 'correct', locale: 'es', extra: true }))).toBeNull();
    expect(parseDeleteAccountRequest(JSON.stringify({ confirmation: 'cancelar', password: 'correct', locale: 'es' }))).toBeNull();
    expect(parseDeleteAccountRequest(JSON.stringify({ confirmation: 'ELIMINAR', password: '', locale: 'es' }))).toBeNull();
    expect(parseDeleteAccountRequest(JSON.stringify({ confirmation: 'ELIMINAR', password: 'correct', locale: 'en' }))).toBeNull();
  });

  it('localizes auth callback destinations from the current Spanish page', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'https://corexscoring.com',
        pathname: '/es/catalog',
      },
    });

    expect(new URL(getAuthConfirmUrl('/catalog')).searchParams.get('next')).toBe('/es/catalog');
    expect(new URL(getPasswordRecoveryConfirmUrl()).searchParams.get('next')).toBe('/es/auth/update-password');
    expect(new URL(getOAuthCallbackUrl('/vault/account')).searchParams.get('next')).toBe('/es/vault/account');
  });
});
