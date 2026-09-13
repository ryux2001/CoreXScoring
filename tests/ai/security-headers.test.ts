import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, buildSecurityHeaders } from '@/lib/security-headers';

function asRecord(headers: Array<{ key: string; value: string }>) {
  return Object.fromEntries(headers.map(({ key, value }) => [key, value]));
}

describe('browser security headers', () => {
  it('builds the baseline browser security headers', () => {
    const headers = asRecord(buildSecurityHeaders());

    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  it('only enables HSTS when explicitly requested for production', () => {
    const development = asRecord(buildSecurityHeaders({ production: false, enableHsts: true }));
    const production = asRecord(buildSecurityHeaders({ production: true, enableHsts: true }));

    expect(development['Strict-Transport-Security']).toBeUndefined();
    expect(production['Strict-Transport-Security']).toContain('max-age=31536000');
  });

  it('builds an enforced CSP with a nonce and no inline scripts', () => {
    const policy = buildContentSecurityPolicy({
      supabaseUrl: 'https://example.supabase.co',
      nonce: 'test-nonce',
    });

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-test-nonce'");
    expect(policy).toContain("style-src-attr 'unsafe-inline'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
