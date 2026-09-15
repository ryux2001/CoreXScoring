import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLocalizedPathname, isLocale, routing } from '@/i18n/routing';
import { buildContentSecurityPolicy } from '@/lib/security-headers';

const handleI18nRouting = createMiddleware(routing);
const authFlowRoutes = ['/auth/confirm', '/auth/oauth/callback', '/auth/oauth/delete-confirm', '/auth/recovery/confirm'];

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const contentSecurityPolicy = buildContentSecurityPolicy({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    nonce,
    development: process.env.NODE_ENV === 'development',
    turnstile: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()),
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  const addContentSecurityPolicies = (response: NextResponse) => {
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
    response.headers.set('Content-Security-Policy-Report-Only', contentSecurityPolicy);
    return response;
  };

  if (isMutatingApiRequest(request)) {
    const apiRejection = rejectUnsafeApiRequest(request);
    if (apiRejection) return addContentSecurityPolicies(apiRejection);
  }

  const createResponse = (previousResponse?: NextResponse) => {
    const rewrite = previousResponse?.headers.get('x-middleware-rewrite');
    const nextResponse = rewrite
      ? NextResponse.rewrite(new URL(rewrite, request.url), { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } });
    previousResponse?.cookies.getAll().forEach((cookie) => nextResponse.cookies.set(cookie));
    return addContentSecurityPolicies(nextResponse);
  };

  const pathname = request.nextUrl.pathname;
  const isApiRequest = pathname.startsWith('/api/');
  const isAuthFlowRoute = authFlowRoutes.includes(pathname);
  const isPublicAssetRequest = isKnownPublicAsset(pathname);
  const intlResponse = !isApiRequest && !isAuthFlowRoute && !isPublicAssetRequest
    ? createI18nResponse(handleI18nRouting(request), request, requestHeaders)
    : null;
  let response = intlResponse ?? createResponse();

  if (intlResponse?.headers.has('location')) return addContentSecurityPolicies(intlResponse);

  const protectedRoutes = ['/vault', '/dashboard', '/settings'];
  const localizedPathname = getLocalizedPathname(pathname);
  const isProtectedRoute = protectedRoutes.some((route) => localizedPathname.startsWith(route));
  const needsSessionHandling = isProtectedRoute
    || (localizedPathname.startsWith('/auth') && !isAuthFlowRoute)
    || localizedPathname === '/auth/update-password';

  if (!needsSessionHandling) return response;

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

          response = createResponse(response);

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
  const redirectWithSessionCookies = (url: URL) => {
    const redirectResponse = addContentSecurityPolicies(NextResponse.redirect(url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  if (isProtectedRoute && !authenticatedSession) {
    return redirectWithSessionCookies(getLocalizedUrl('/auth', request));
  }

  if (localizedPathname === '/auth/update-password' && !authenticatedSession) {
    return redirectWithSessionCookies(getLocalizedUrl('/auth', request));
  }

  if (localizedPathname.startsWith('/auth') && authenticatedSession && !isAuthFlowRoute && localizedPathname !== '/auth/update-password') {
    return redirectWithSessionCookies(getLocalizedUrl('/', request));
  }

  return response;
}

function createI18nResponse(
  intlResponse: NextResponse,
  request: NextRequest,
  requestHeaders: Headers,
) {
  if (intlResponse.headers.has('location')) return intlResponse;

  const rewrite = intlResponse.headers.get('x-middleware-rewrite');
  const response = rewrite
    ? NextResponse.rewrite(new URL(rewrite, request.url), { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });

  intlResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

function getLocalizedUrl(pathname: string, request: NextRequest) {
  const [firstSegment] = request.nextUrl.pathname.split('/').filter(Boolean);
  const localePrefix = isLocale(firstSegment) && firstSegment !== routing.defaultLocale
    ? `/${firstSegment}`
    : '';
  return new URL(`${localePrefix}${pathname === '/' ? '/' : pathname}`, request.url);
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    '/api/:path*',
  ],
};

function isKnownPublicAsset(pathname: string) {
  return pathname === '/icon.png'
    || pathname.startsWith('/images/')
    || /^\/(?:window|vercel|next|globe|file)\.svg$/.test(pathname);
}

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
