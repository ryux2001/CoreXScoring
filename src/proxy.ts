import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
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

  const session = Boolean(user);
  const protectedRoutes = ['/vault', '/profile', '/dashboard', '/settings'];
  const isProtectedRoute = protectedRoutes.some((route) => (
    request.nextUrl.pathname.startsWith(route)
  ));

  const redirectWithSessionCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  if (isProtectedRoute && !session) {
    return redirectWithSessionCookies(new URL('/auth', request.url));
  }

  if (request.nextUrl.pathname.startsWith('/auth') && session) {
    return redirectWithSessionCookies(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/vault/:path*',
    '/profile/:path*',
    '/dashboard/:path*',
    '/auth/:path*',
  ],
};
