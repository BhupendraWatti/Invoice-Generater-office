import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Paths that do not require authentication
  const isPublicRoute = 
    pathname === '/login' || 
    pathname.startsWith('/_next/') || 
    pathname.includes('/favicon.ico');

  if (!token && !isPublicRoute) {
    // Redirect unauthenticated user to login screen
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && pathname === '/login') {
    // Redirect authenticated user away from login to home canvas
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - API routes (/api/*, though NestJS handles this, we exclude them from Next middleware)
     * - Static files (_next/static, images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
