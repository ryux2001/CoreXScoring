import { describe, expect, it } from 'vitest';
import { parseDeleteAccountRequest } from '@/lib/auth/delete-account-policy';
import { getSafeAuthNextPath } from '@/lib/auth/safe-next-path';

describe('auth callback and account deletion policy', () => {
  it('allows only the canonical internal auth destination', () => {
    expect(getSafeAuthNextPath('/catalog')).toBe('/catalog');
    expect(getSafeAuthNextPath('/vault/account')).toBe('/vault/account');
    expect(getSafeAuthNextPath('//evil.example')).toBe('/catalog');
    expect(getSafeAuthNextPath('/\\evil.example')).toBe('/catalog');
    expect(getSafeAuthNextPath('/%2f%2fevil.example')).toBe('/catalog');
    expect(getSafeAuthNextPath('/catalog?next=https://evil.example')).toBe('/catalog');
    expect(getSafeAuthNextPath('/auth/update-password')).toBe('/catalog');
  });

  it('requires exactly the confirmation and current password fields', () => {
    expect(parseDeleteAccountRequest(JSON.stringify({ confirmation: 'ELIMINAR', password: 'correct' }))).toEqual({
      confirmation: 'ELIMINAR',
      password: 'correct',
    });
    expect(parseDeleteAccountRequest(JSON.stringify({ confirmation: 'eliminar', password: 'correct', extra: true }))).toBeNull();
    expect(parseDeleteAccountRequest(JSON.stringify({ confirmation: 'cancelar', password: 'correct' }))).toBeNull();
    expect(parseDeleteAccountRequest(JSON.stringify({ confirmation: 'ELIMINAR', password: '' }))).toBeNull();
  });
});
