import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;
  
  if (pathname.includes('/home') || pathname.includes('/auth/callback')) {
      console.log(`[MIDDLEWARE] Path: ${pathname}, Token present: ${!!token}`);
  }

  const protectedPaths = ['/home', '/dashboard', '/register-details'];
  
  // If trying to access protected path without token
  if (protectedPaths.some(path => pathname.startsWith(path)) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If trying to access auth pages while logged in
  if ((pathname === '/login' || pathname === '/signup') && token) {
      return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/home/:path*', '/dashboard/:path*', '/register-details/:path*', '/login', '/signup'],
};
