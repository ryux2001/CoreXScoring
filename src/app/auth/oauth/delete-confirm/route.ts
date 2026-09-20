import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { consumeGoogleDeleteIntent, GOOGLE_DELETE_INTENT_COOKIE } from '@/lib/auth/google-delete-intent';
import { getSafeAuthNextPath } from '@/lib/auth/safe-next-path';

function failedDeleteRedirect(request: NextRequest, accountPath: string) {
  const url = new URL(accountPath, request.url);
  url.searchParams.set('delete_error', '1');
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const requestedPath = getSafeAuthNextPath(request.nextUrl.searchParams.get('next'));
  const accountPath = requestedPath === '/es/vault/account' ? requestedPath : '/vault/account';
  const authPath = accountPath.startsWith('/es/') ? '/es/auth' : '/auth';
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return failedDeleteRedirect(request, accountPath);

  const successUrl = new URL(authPath, request.url);
  successUrl.searchParams.set('deleted', '1');
  const response = NextResponse.redirect(successUrl);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { storageKey: 'sb-auth-token' },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return failedDeleteRedirect(request, accountPath);

  const { data: { user } } = await supabase.auth.getUser();
  const intent = request.cookies.get(GOOGLE_DELETE_INTENT_COOKIE)?.value;
  const hasGoogleIdentity = user?.identities?.some((identity) => identity.provider === 'google') ?? false;
  if (!user || !intent || !hasGoogleIdentity || !(await consumeGoogleDeleteIntent(intent, user.id))) {
    return failedDeleteRedirect(request, accountPath);
  }

  const { error: deleteError } = await createSupabaseAdminClient().auth.admin.deleteUser(user.id);
  if (deleteError) return failedDeleteRedirect(request, accountPath);

  await supabase.auth.signOut();
  response.cookies.set(GOOGLE_DELETE_INTENT_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
