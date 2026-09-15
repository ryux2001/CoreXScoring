import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createGoogleDeleteIntent, GOOGLE_DELETE_INTENT_COOKIE, GOOGLE_DELETE_INTENT_TTL_SECONDS } from '@/lib/auth/google-delete-intent';
import { DELETE_CONFIRMATION_TEXT } from '@/lib/auth/delete-account-policy';
import { ApiRateLimitUnavailableError, readLimitedJson, requireApiRateLimit } from '@/lib/api-security';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  let body: { confirmation?: unknown } | null;
  try {
    body = await readLimitedJson<{ confirmation?: unknown }>(request, 1 * 1024);
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? Number(error.status) : 400;
    return NextResponse.json({ error: status === 413 ? 'Solicitud demasiado grande.' : 'Solicitud inválida.' }, { status });
  }
  if (typeof body?.confirmation !== 'string' || body.confirmation.trim().toUpperCase() !== DELETE_CONFIRMATION_TEXT) {
    return NextResponse.json({ error: 'Confirmación inválida.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const hasGoogleIdentity = user?.identities?.some((identity) => identity.provider === 'google') ?? false;
  if (!user || user.is_anonymous || !hasGoogleIdentity) {
    return NextResponse.json({ error: 'Sesión de Google requerida.' }, { status: 401 });
  }

  try {
    const rateLimitResponse = await requireApiRateLimit({
      key: `account-delete-google:user:${user.id}`,
      windowSeconds: 3600,
      limit: 3,
    });
    if (rateLimitResponse) return rateLimitResponse;
  } catch (error) {
    if (error instanceof ApiRateLimitUnavailableError) {
      return NextResponse.json({ error: 'El límite de seguridad no está disponible.' }, { status: 503 });
    }
    throw error;
  }

  try {
    const intent = await createGoogleDeleteIntent(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(GOOGLE_DELETE_INTENT_COOKIE, intent, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: GOOGLE_DELETE_INTENT_TTL_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'No se pudo preparar la confirmación.' }, { status: 503 });
  }
}
