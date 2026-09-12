import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  consumeRecoveryProof,
  RECOVERY_PROOF_COOKIE,
} from '@/lib/auth/recovery-proof';
import { isAcceptablePassword } from '@/lib/auth/password-policy';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-request' }, { status: 400 });
  }

  const password = typeof body === 'object' && body !== null && 'password' in body
    ? body.password
    : null;

  if (typeof password !== 'string' || !isAcceptablePassword(password)) {
    return NextResponse.json({ error: 'invalid-password' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const cookieStore = await cookies();
  const proof = cookieStore.get(RECOVERY_PROOF_COOKIE)?.value;

  if (!user || !proof || !(await consumeRecoveryProof(proof, user.id))) {
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
