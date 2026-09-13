const DEFAULT_SUPABASE_URL = 'https://supabase.invalid';

function getSupabaseOrigins(supabaseUrl: string | undefined) {
  try {
    const parsed = new URL(supabaseUrl || DEFAULT_SUPABASE_URL);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.hostname === 'supabase.invalid') return [];
    const websocketProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return [parsed.origin, `${websocketProtocol}//${parsed.host}`];
  } catch {
    return [];
  }
}

export function buildSecurityHeaders({
  supabaseUrl,
  production = false,
  enableHsts = false,
}: {
  supabaseUrl?: string;
  production?: boolean;
  enableHsts?: boolean;
} = {}) {
  const connectSources = ["'self'", ...getSupabaseOrigins(supabaseUrl)].join(' ');
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
  ].join('; ');

  const headers = [
    { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    },
    { key: 'X-Frame-Options', value: 'DENY' },
  ];

  if (production) {
    headers.push({ key: 'Cross-Origin-Opener-Policy', value: 'same-origin' });
    if (enableHsts) {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }
  }

  return headers;
}
