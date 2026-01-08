import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const token = accessToken || refreshToken;
  
  console.log(`[MIDDLEWARE] Path: ${pathname} | Token: ${token ? 'YES' : 'NO'}`);

  // We remove '/home' and '/register-details' from here because we want to allow 
  // client-side auth checks (localStorage) to take over if cookies fail.
  const protectedPaths = ['/dashboard'];
  
  // If trying to access protected path without token
  if (protectedPaths.some(path => pathname.startsWith(path)) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // We allow access to /login even if token exists. 
  // This lets users re-login if their session is "stuck" or invalid.
  // if (pathname === '/login' && token) {
  //     return NextResponse.redirect(new URL('/home', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ['/home/:path*', '/dashboard/:path*', '/register-details/:path*'],
};
