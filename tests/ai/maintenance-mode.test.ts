import { describe, expect, it } from 'vitest';
import {
  isAllowedMaintenanceAdminApi,
  isAuthorizedMaintenanceAdmin,
  isMaintenanceAdminLoginPath,
  isMaintenanceAdminOAuthCallback,
  isMaintenanceAdminPage,
} from '@/lib/maintenance/policy';
import { getSiteMode } from '@/lib/maintenance/site-mode';

describe('site maintenance mode', () => {
  it('accepts only the three documented site modes', () => {
    expect(getSiteMode('normal')).toBe('normal');
    expect(getSiteMode('maintenance')).toBe('maintenance');
    expect(getSiteMode('emergency')).toBe('emergency');
    expect(getSiteMode('unexpected')).toBe('normal');
  });

  it('allows a sessionless administrator to reach only the dedicated login flow', () => {
    expect(isMaintenanceAdminLoginPath('/maintenance/admin-login')).toBe(true);
    expect(isMaintenanceAdminOAuthCallback('/auth/oauth/callback', '/vault/admin/monitoring')).toBe(true);
    expect(isMaintenanceAdminOAuthCallback('/auth/oauth/callback', '/catalog')).toBe(false);
    expect(isMaintenanceAdminLoginPath('/auth')).toBe(false);
    expect(isMaintenanceAdminPage('/vault/admin/monitoring')).toBe(true);
    expect(isMaintenanceAdminPage('/vault/admin/unknown')).toBe(false);
    expect(isAuthorizedMaintenanceAdmin(null)).toBe(false);
  });

  it('uses only app_metadata for administrator authorization', () => {
    expect(isAuthorizedMaintenanceAdmin({ user_metadata: { role: 'admin' } } as never)).toBe(false);
    expect(isAuthorizedMaintenanceAdmin({ app_metadata: { role: 'user' } })).toBe(false);
    expect(isAuthorizedMaintenanceAdmin({ app_metadata: { role: 'admin' } })).toBe(true);
    expect(isAuthorizedMaintenanceAdmin({ is_anonymous: true, app_metadata: { role: 'admin' } })).toBe(false);
  });

  it('keeps the administrative API surface explicit', () => {
    expect(isAllowedMaintenanceAdminApi('GET', '/api/vault/admin/catalog/products')).toBe(true);
    expect(isAllowedMaintenanceAdminApi('PATCH', '/api/vault/admin/catalog/builds/order')).toBe(true);
    expect(isAllowedMaintenanceAdminApi('GET', '/api/vault/admin/unknown')).toBe(false);
    expect(isAllowedMaintenanceAdminApi('GET', '/api/vault/admin/catalog/builds/order')).toBe(false);
  });
});
