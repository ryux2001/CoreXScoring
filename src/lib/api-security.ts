import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

export const API_JSON_BODY_LIMITS = {
  chat: 64 * 1024,
  default: 8 * 1024,
  admin: 64 * 1024,
  small: 4 * 1024,
} as const;

export class ApiRateLimitUnavailableError extends Error {
  constructor() {
    super('El límite de solicitudes no está disponible.');
  }
}

export function rejectUnsafeApiRequest(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  if (origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') {
    return NextResponse.json({ error: 'Solicitud cross-site no permitida.' }, { status: 403 });
  }

  return null;
}

export function jsonResponse<T>(data: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(data, { ...init, headers });
}

export async function readLimitedJson<T>(request: Request, maxBytes: number): Promise<T> {
  const contentType = request.headers.get('content-type')?.toLowerCase() || '';
  if (!/^application\/json(?:\s*;|$)/.test(contentType)) {
    throw new ApiRequestError('El contenido debe ser JSON.', 415);
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new ApiRequestError('Solicitud demasiado grande.', 413);
  }

  const reader = request.body?.getReader();
  if (!reader) throw new ApiRequestError('Solicitud inválida.', 400);

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new ApiRequestError('Solicitud demasiado grande.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new TextDecoder().decode(concatBytes(chunks, totalBytes));
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new ApiRequestError('Solicitud inválida.', 400);
  }
}

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function concatBytes(chunks: Uint8Array[], totalBytes: number) {
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function consumeApiRateLimit({
  key,
  windowSeconds,
  limit,
}: {
  key: string;
  windowSeconds: number;
  limit: number;
}) {
  const { data, error } = await createSupabaseAdminClient().rpc('consume_api_rate_limit', {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });

  if (error || !data || typeof data !== 'object') throw new ApiRateLimitUnavailableError();
  const result = data as { allowed?: unknown; retry_after_seconds?: unknown };
  return {
    allowed: result.allowed === true,
    retryAfterSeconds: typeof result.retry_after_seconds === 'number' ? result.retry_after_seconds : windowSeconds,
  };
}

export async function requireApiRateLimit(options: {
  key: string;
  windowSeconds: number;
  limit: number;
}) {
  const result = await consumeApiRateLimit(options);
  if (result.allowed) return null;

  return jsonResponse(
    { error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } },
  );
}
