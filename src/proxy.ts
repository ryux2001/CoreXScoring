import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  if (isMutatingApiRequest(request)) {
    const apiRejection = rejectUnsafeApiRequest(request);
    if (apiRejection) return apiRejection;
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'sb-auth-token',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  let user: User | null = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  const isAnonymous = user?.is_anonymous === true;
  const authenticatedSession = Boolean(user && !isAnonymous);
  const protectedRoutes = ['/vault', '/dashboard', '/settings'];
  const isProtectedRoute = protectedRoutes.some((route) => (
    request.nextUrl.pathname.startsWith(route)
  ));
  const authFlowRoutes = ['/auth/confirm', '/auth/update-password'];
  const isAuthFlowRoute = authFlowRoutes.includes(request.nextUrl.pathname);

  const redirectWithSessionCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  if (isProtectedRoute && !authenticatedSession) {
    return redirectWithSessionCookies(new URL('/auth', request.url));
  }

  if (request.nextUrl.pathname === '/auth/update-password' && !authenticatedSession) {
    return redirectWithSessionCookies(new URL('/auth', request.url));
  }

  if (request.nextUrl.pathname.startsWith('/auth') && authenticatedSession && !isAuthFlowRoute) {
    return redirectWithSessionCookies(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/vault/:path*',
    '/dashboard/:path*',
    '/auth/:path*',
  ],
};

function isMutatingApiRequest(request: NextRequest) {
  return request.nextUrl.pathname.startsWith('/api/')
    && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
}

function rejectUnsafeApiRequest(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') {
    return NextResponse.json({ error: 'Solicitud cross-site no permitida.' }, { status: 403 });
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > 128 * 1024) {
    return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
  }

  return null;
}
