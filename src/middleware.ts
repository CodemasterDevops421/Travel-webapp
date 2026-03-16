import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_ROLES = new Set(['admin', 'owner']);

function normalizeRole(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().trim() : '';
}

function hasAdminClaim(user: { app_metadata?: Record<string, unknown> }): boolean {
  const appRole = normalizeRole(user.app_metadata?.role);
  return ADMIN_ROLES.has(appRole);
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' https: data:",
  "font-src 'self' data:",
  "script-src 'self' 'unsafe-inline' https://payment-wrapper.liteapi.travel https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://api.liteapi.travel https://book.liteapi.travel https://*.supabase.co https://api.stripe.com",
  "frame-src 'self' https://payment-wrapper.liteapi.travel https://js.stripe.com https://hooks.stripe.com",
  'upgrade-insecure-requests'
].join('; ');

function ensureCsrfCookie(request: NextRequest, response: NextResponse): void {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return;
  }

  const existingToken = request.cookies.get('csrf_token')?.value;
  if (existingToken) {
    return;
  }

  response.cookies.set('csrf_token', crypto.randomUUID(), {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
}

function applySecurityHeaders(request: NextRequest, response: NextResponse) {
  ensureCsrfCookie(request, response);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user = null;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request: { headers: request.headers } });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          }
        }
      }
    );

    try {
      const {
        data: { user: authUser }
      } = await supabase.auth.getUser();
      user = authUser;
    } catch {
      user = null;
    }
  }

  const protectedPaths = ['/wishlist', '/admin'];
  const isProtectedRoute = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedRoute && !user) {
    const signupUrl = new URL('/auth/signup', request.url);
    signupUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return applySecurityHeaders(request, NextResponse.redirect(signupUrl));
  }

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  if (isAdminRoute && user && !hasAdminClaim(user)) {
    return applySecurityHeaders(request, NextResponse.redirect(new URL('/', request.url)));
  }

  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');
  if (isAuthRoute && user) {
    return applySecurityHeaders(request, NextResponse.redirect(new URL('/', request.url)));
  }

  return applySecurityHeaders(request, response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
