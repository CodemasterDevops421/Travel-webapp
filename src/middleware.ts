import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function applySecurityHeaders(response: NextResponse) {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    return response;
}

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request: { headers: request.headers } });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const {
        data: { user }
    } = await supabase.auth.getUser();

    // Protect routes that require authentication
    const protectedPaths = ['/booking', '/wishlist', '/admin'];
    const isProtectedRoute = protectedPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (isProtectedRoute && !user) {
        const signupUrl = new URL('/auth/signup', request.url);
        signupUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return applySecurityHeaders(NextResponse.redirect(signupUrl));
    }

    // Redirect authenticated users away from auth pages
    const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');
    if (isAuthRoute && user) {
        return applySecurityHeaders(NextResponse.redirect(new URL('/', request.url)));
    }

    return applySecurityHeaders(response);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
