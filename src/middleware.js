import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Route → allowed roles
const routeRules = [
  // Admin-only routes
  { path: '/admin', roles: ['Admin'] },
  // Manager + Admin routes
  { path: '/manager', roles: ['Manager', 'Admin'] },
];

export async function middleware(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = request.nextUrl;

    // Public routes — landing page, login, auth API, unauthorized page
    if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/api/auth') || pathname === '/unauthorized') {
      if (token && pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.next();
    }

    // Protect all other routes — must be logged in
    if (!token) {
      return NextResponse.redirect(new URL('/?login=true', request.url));
    }

    // Role-based route protection
    for (const rule of routeRules) {
      if (pathname.startsWith(rule.path) && !rule.roles.includes(token.role)) {
        const url = new URL('/unauthorized', request.url);
        url.searchParams.set('from', pathname);
        return NextResponse.rewrite(url);
      }
    }

    return NextResponse.next();
  } catch (error) {
    // If middleware crashes (e.g., cold start), let the request through
    // API routes have their own auth checks as a safety net
    console.error('Middleware error:', error?.message);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|logo.svg|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.ico$).*)',
  ],
};
