import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  consumeRecoveryProof,
  hasActiveRecoveryProof,
  RECOVERY_PROOF_COOKIE,
} from '@/lib/auth/recovery-proof';
import { isAcceptablePassword } from '@/lib/auth/password-policy';
import { ApiRateLimitUnavailableError, readLimitedJson, requireApiRateLimit } from '@/lib/api-security';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const cookieStore = await cookies();
  const proof = cookieStore.get(RECOVERY_PROOF_COOKIE)?.value;

  if (!user || !proof || !(await hasActiveRecoveryProof(proof))) {
    return NextResponse.json({ error: 'invalid-link' }, { status: 401 });
  }

  try {
    const rateLimitResponse = await requireApiRateLimit({
      key: `password-recovery:user:${user.id}`,
      windowSeconds: 900,
      limit: 5,
    });
    if (rateLimitResponse) return rateLimitResponse;
  } catch (error) {
    if (error instanceof ApiRateLimitUnavailableError) {
      return NextResponse.json({ error: 'rate-limit-unavailable' }, { status: 503 });
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await readLimitedJson(request, 4 * 1024);
  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      return NextResponse.json({ error: error.message }, { status: Number(error.status) });
    }
    return NextResponse.json({ error: 'invalid-request' }, { status: 400 });
  }

  const password = typeof body === 'object' && body !== null && 'password' in body
    ? body.password
    : null;

  if (typeof password !== 'string' || !isAcceptablePassword(password)) {
    return NextResponse.json({ error: 'invalid-password' }, { status: 400 });
  }

  if (!(await consumeRecoveryProof(proof, user.id))) {
    return NextResponse.json({ error: 'invalid-link' }, { status: 401 });
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return NextResponse.json({ error: 'password-update-failed' }, { status: 400 });
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });

  if (signOutError) {
    return NextResponse.json({ error: 'session-revocation-failed' }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(RECOVERY_PROOF_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}
