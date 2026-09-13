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
  production = false,
  enableHsts = false,
}: {
  production?: boolean;
  enableHsts?: boolean;
} = {}) {
  const headers = [
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

export function buildContentSecurityPolicy({
  supabaseUrl,
  nonce,
  development = false,
  turnstile = false,
}: {
  supabaseUrl?: string;
  nonce?: string;
  development?: boolean;
  turnstile?: boolean;
} = {}) {
  const connectSources = ["'self'", ...getSupabaseOrigins(supabaseUrl), ...(turnstile ? ["https://challenges.cloudflare.com"] : [])].join(' ');
  const scriptSources = ["'self'"];
  const styleSources = ["'self'"];

  if (nonce) {
    scriptSources.push(`'nonce-${nonce}'`, "'strict-dynamic'");
    styleSources.push(`'nonce-${nonce}'`);
  }

  if (development) scriptSources.push("'unsafe-eval'");
  if (turnstile) scriptSources.push("https://challenges.cloudflare.com");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources.join(' ')}`,
    `style-src ${styleSources.join(' ')}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    ...(turnstile ? ["frame-src 'self' https://challenges.cloudflare.com"] : []),
  ].join('; ');
}
