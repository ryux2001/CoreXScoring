import { describe, expect, it } from 'vitest';
import { buildSecurityHeaders } from '@/lib/security-headers';

function asRecord(headers: Array<{ key: string; value: string }>) {
  return Object.fromEntries(headers.map(({ key, value }) => [key, value]));
}

describe('browser security headers', () => {
  it('builds report-only CSP with only the configured Supabase origins', () => {
    const headers = asRecord(buildSecurityHeaders({
      supabaseUrl: 'https://example.supabase.co',
    }));

    expect(headers['Content-Security-Policy-Report-Only']).toContain("default-src 'self'");
    expect(headers['Content-Security-Policy-Report-Only']).toContain('https://example.supabase.co');
    expect(headers['Content-Security-Policy-Report-Only']).toContain('wss://example.supabase.co');
    expect(headers['Content-Security-Policy-Report-Only']).not.toContain('api.groq.com');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  it('only enables HSTS when explicitly requested for production', () => {
    const development = asRecord(buildSecurityHeaders({ production: false, enableHsts: true }));
    const production = asRecord(buildSecurityHeaders({ production: true, enableHsts: true }));

    expect(development['Strict-Transport-Security']).toBeUndefined();
    expect(production['Strict-Transport-Security']).toContain('max-age=31536000');
  });
});
