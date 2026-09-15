import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  createRecoveryProof,
  RECOVERY_PROOF_COOKIE,
  RECOVERY_PROOF_TTL_SECONDS,
} from '@/lib/auth/recovery-proof';
import { getSafeAuthNextPath } from '@/lib/auth/safe-next-path';

function getAuthErrorResponse(request: NextRequest, nextPath = '/catalog') {
  const authPath = nextPath.startsWith('/es/') ? '/es/auth' : '/auth';
  const url = new URL(authPath, request.url);
  url.searchParams.set('error', 'invalid-link');

  return NextResponse.redirect(url);
}

function createRecoveryRedirect(request: NextRequest, authResponse: NextResponse, proof: string, nextPath: string) {
  const recoveryPath = nextPath === '/catalog' ? '/auth/update-password' : nextPath;
  const response = NextResponse.redirect(new URL(recoveryPath, request.url));

  authResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  response.cookies.set(RECOVERY_PROOF_COOKIE, proof, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: RECOVERY_PROOF_TTL_SECONDS,
  });

  return response;
}

export async function handleAuthConfirmation(request: NextRequest, recovery = false) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextPath = getSafeAuthNextPath(searchParams.get('next'));
  const isRecovery = recovery || type === 'recovery';
  let response = NextResponse.redirect(new URL(nextPath, request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { storageKey: 'sb-auth-token' },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) return getAuthErrorResponse(request, nextPath);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) return getAuthErrorResponse(request, nextPath);
  } else {
    return getAuthErrorResponse(request, nextPath);
  }

  if (!isRecovery) return response;

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return getAuthErrorResponse(request, nextPath);

  try {
    const proof = await createRecoveryProof(user.user.id);
    return createRecoveryRedirect(request, response, proof, nextPath);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'unknown';
    console.error('Password recovery proof creation failed', { code });
    return getAuthErrorResponse(request, nextPath);
  }
}
