import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getEnglishCanonicalPathname,
  getLocalizedPathname,
  isPathWithinRoute,
  isLocale,
  isUnsupportedLocalePath,
  routing,
} from '@/i18n/routing';
import {
  getApiBodyRejection,
  getUnsafeApiRejection,
  isMutatingApiRequest,
} from '@/lib/security/api-request-policy';
import { buildContentSecurityPolicy } from '@/lib/security-headers';

const handleI18nRouting = createMiddleware(routing);
const authFlowRoutes = ['/auth/confirm', '/auth/oauth/callback', '/auth/oauth/delete-confirm', '/auth/recovery/confirm'];
const protectedRoutes = ['/vault', '/dashboard', '/settings'];

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
    const apiRejection = getUnsafeApiRejection(request);
    if (apiRejection) {
      return addContentSecurityPolicies(NextResponse.json(
        { error: apiRejection.message },
        { status: apiRejection.status },
      ));
    }

    const bodyRejection = await getApiBodyRejection(request);
    if (bodyRejection) {
      return addContentSecurityPolicies(NextResponse.json(
        { error: bodyRejection.message },
        { status: bodyRejection.status },
      ));
    }
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
  const localizedPathname = getLocalizedPathname(pathname);
  const englishCanonicalPathname = getEnglishCanonicalPathname(pathname);
  if (englishCanonicalPathname) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = englishCanonicalPathname;
    return addContentSecurityPolicies(NextResponse.redirect(redirectUrl, 308));
  }

  if (isUnsupportedLocalePath(pathname)) {
    const notFoundUrl = new URL('/en/__invalid-locale', request.url);
    return addContentSecurityPolicies(NextResponse.rewrite(notFoundUrl, {
      request: { headers: requestHeaders },
    }));
  }

  const isAuthFlowRoute = authFlowRoutes.includes(localizedPathname);
  if (isAuthFlowRoute && localizedPathname !== pathname) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = localizedPathname;
    return addContentSecurityPolicies(NextResponse.redirect(callbackUrl, 307));
  }

  const isApiRequest = pathname.startsWith('/api/');
  const isPublicAssetRequest = isKnownPublicAsset(pathname);
  const intlResponse = !isApiRequest && !isAuthFlowRoute && !isPublicAssetRequest
    ? createI18nResponse(handleI18nRouting(request), request, requestHeaders)
    : null;
  let response = intlResponse ?? createResponse();

  if (intlResponse?.headers.has('location')) return addContentSecurityPolicies(intlResponse);

  const isProtectedRoute = protectedRoutes.some((route) => isPathWithinRoute(localizedPathname, route));
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
      source: '/((?!_next|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)',
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
    || pathname === '/favicon.ico'
    || pathname === '/robots.txt'
    || pathname === '/sitemap.xml'
    || pathname === '/manifest.webmanifest'
    || pathname.startsWith('/images/')
    || /^\/(?:window|vercel|next|globe|file)\.svg$/.test(pathname);
}
