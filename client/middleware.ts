import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const token = accessToken || refreshToken; // Consider logged in if either exists
  const { pathname } = request.nextUrl;
  
  if (pathname.includes('/home') || pathname.includes('/auth/callback')) {
      console.log(`[MIDDLEWARE] Path: ${pathname}, Token present: ${!!token}`);
  }

  // We remove '/home' and '/register-details' from here because we want to allow 
  // client-side auth checks (localStorage) to take over if cookies fail.
  const protectedPaths = ['/dashboard'];
  
  // If trying to access protected path without token
  if (protectedPaths.some(path => pathname.startsWith(path)) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If trying to access auth pages while logged in
  if (pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/home/:path*', '/dashboard/:path*', '/register-details/:path*', '/login', '/signup'],
};
