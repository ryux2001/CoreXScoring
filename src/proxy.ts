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
import { areMaintenanceAdminsAllowed, getSiteMode } from '@/lib/maintenance/site-mode';
import {
  isAllowedMaintenanceAdminApi,
  isAuthorizedMaintenanceAdmin,
  isMaintenanceAdminLoginPath,
  isMaintenanceAdminOAuthCallback,
  isMaintenanceAdminPage,
} from '@/lib/maintenance/policy';

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
  let maintenanceAuthResponse: NextResponse | undefined;

  const addContentSecurityPolicies = (response: NextResponse) => {
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
    response.headers.set('Content-Security-Policy-Report-Only', contentSecurityPolicy);
    maintenanceAuthResponse?.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  const siteMode = getSiteMode();

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
    if (previousResponse?.headers.has('location')) {
      return addContentSecurityPolicies(previousResponse);
    }

    const rewrite = previousResponse?.headers.get('x-middleware-rewrite');
    const responseRequestHeaders = mergeMiddlewareRequestHeaders(previousResponse, requestHeaders);
    const nextResponse = rewrite
      ? NextResponse.rewrite(new URL(rewrite, request.url), { request: { headers: responseRequestHeaders } })
      : NextResponse.next({ request: { headers: responseRequestHeaders } });
    previousResponse?.cookies.getAll().forEach((cookie) => nextResponse.cookies.set(cookie));
    return addContentSecurityPolicies(nextResponse);
  };

  const pathname = request.nextUrl.pathname;
  const localizedPathname = getLocalizedPathname(pathname);
  const englishCanonicalPathname = getEnglishCanonicalPathname(pathname);

  if (siteMode !== 'normal') {
    const isApiRequest = pathname.startsWith('/api/');
    const isMaintenancePage = localizedPathname === '/maintenance';
    const isMaintenanceAdminLogin = isMaintenanceAdminLoginPath(localizedPathname);
    const isAdminPage = isMaintenanceAdminPage(localizedPathname);
    const isAdminApi = isAllowedMaintenanceAdminApi(request.method, pathname);
    const isAdminOAuthCallback = isMaintenanceAdminOAuthCallback(localizedPathname, request.nextUrl.searchParams.get('next'));
    const isEssentialAsset = isEssentialMaintenanceAsset(pathname);

    if (pathname === '/robots.txt' || isEssentialAsset) {
      // These resources remain available so crawlers and the maintenance shell work normally.
    } else if (isMaintenancePage) {
      return createMaintenancePageResponse(request, requestHeaders, localizedPathname, addContentSecurityPolicies);
    } else if (siteMode === 'maintenance' && areMaintenanceAdminsAllowed() && (isMaintenanceAdminLogin || isAdminOAuthCallback)) {
      // The dedicated login page and its fixed OAuth callback are the only public auth flow in maintenance.
    } else if (siteMode === 'maintenance' && areMaintenanceAdminsAllowed() && (isAdminPage || isAdminApi)) {
      const adminResponse = await getMaintenanceAdminResponse(request, requestHeaders);
      if (!adminResponse) {
        return isApiRequest
          ? createMaintenanceApiResponse(addContentSecurityPolicies)
          : createMaintenancePageResponse(request, requestHeaders, localizedPathname, addContentSecurityPolicies);
      }
      maintenanceAuthResponse = adminResponse;
    } else if (isApiRequest) {
      return createMaintenanceApiResponse(addContentSecurityPolicies);
    } else {
      return createMaintenancePageResponse(request, requestHeaders, localizedPathname, addContentSecurityPolicies);
    }
  }

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
    ? createResponse(handleI18nRouting(request))
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

function createMaintenancePageResponse(
  request: NextRequest,
  requestHeaders: Headers,
  pathname: string,
  addContentSecurityPolicies: (response: NextResponse) => NextResponse,
) {
  const localePrefix = pathname === '/es' || pathname.startsWith('/es/') ? '/es' : '/en';
  const response = NextResponse.rewrite(new URL(`${localePrefix}/maintenance`, request.url), {
    request: { headers: requestHeaders },
    status: 503,
  });
  response.headers.set('Retry-After', '300');
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return addContentSecurityPolicies(response);
}

function createMaintenanceApiResponse(addContentSecurityPolicies: (response: NextResponse) => NextResponse) {
  return addContentSecurityPolicies(NextResponse.json(
    { error: 'Service temporarily unavailable.', code: 'site_maintenance' },
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': '300',
      },
    },
  ));
}

async function getMaintenanceAdminResponse(request: NextRequest, requestHeaders: Headers): Promise<NextResponse | null> {
  const response = NextResponse.next({ request: { headers: requestHeaders } });
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

  try {
    const { data: { user } } = await supabase.auth.getUser();
    return isAuthorizedMaintenanceAdmin(user) ? response : null;
  } catch {
    return null;
  }
}

function isEssentialMaintenanceAsset(pathname: string): boolean {
  return pathname === '/icon.png'
    || pathname === '/favicon.ico'
    || pathname === '/manifest.webmanifest';
}

function mergeMiddlewareRequestHeaders(response: NextResponse | undefined, baseHeaders: Headers) {
  const headers = new Headers(baseHeaders);
  const requestHeaderPrefix = 'x-middleware-request-';

  response?.headers.forEach((value, name) => {
    if (name.startsWith(requestHeaderPrefix)) {
      headers.set(name.slice(requestHeaderPrefix.length), value);
    }
  });

  return headers;
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
