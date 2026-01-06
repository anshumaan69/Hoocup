import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/login?error=' + error, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  try {
    // Exchange code for session at backend
    // Use 127.0.0.1 instead of localhost for server-side fetches to avoid IPv6 issues
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    
    console.log(`[DEBUG] Google Callback: calling backend at ${backendUrl}/google`);

    const response = await axios.post(`${backendUrl}/google`, { code }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true // Important to receive cookies
    });

    console.log(`[DEBUG] Backend response status: ${response.status}`);
    const { user, token } = response.data;
    console.log(`[DEBUG] User profile complete? ${user?.is_profile_complete}`);
    console.log(`[DEBUG] User phone verified? ${user?.is_phone_verified}`);

    // Better approach: Let the backend set the cookie on the response, 
    // but since we are calling backend S2S, we need to grab the cookie from response headers 
    // and set it on the Next.js response.
    
    const setCookieHeader = response.headers['set-cookie'];
    console.log('[DEBUG] Set-Cookie headers from backend:', setCookieHeader);
    
    let redirectUrl = new URL('/home', request.url);

    // Check for profile completion first (Login Logic)
    if (user && user.is_profile_complete) {
        console.log('[DEBUG] Redirecting to /home');
        redirectUrl = new URL('/home', request.url);
    } else if (user && !user.is_phone_verified) {
        // Check for phone verification (Dual Auth Enforcement for new users)
        // Redirect to signup page, step 2 (Phone Verification)
        console.log('[DEBUG] Redirecting to /signup?step=2');
        redirectUrl = new URL('/signup?step=2', request.url);
    } else if (user && !user.is_profile_complete) {
        // Additional check for profile completion (if phone is verified but profile is not)
        console.log('[DEBUG] Redirecting to /register-details');
        redirectUrl = new URL('/register-details', request.url);
    } else {
        console.log('[DEBUG] Default redirect (should verify why we are here if expected to go elsewhere)');
    }

    // Append token to URL so client can store it (Fallback for cookies)
    if (token) {
        redirectUrl.searchParams.set('token', token);
    }

    const nextResponse = NextResponse.redirect(redirectUrl);
    
    if (setCookieHeader) {
        setCookieHeader.forEach(cookie => {
           nextResponse.headers.append('Set-Cookie', cookie);
        });
    }

    return nextResponse;

  } catch (err: any) {
    console.error('[CRITICAL] Callback Error:', err.message);
    if (axios.isAxiosError(err)) {
        console.error('Axios Error Details:', {
            status: err.response?.status,
            data: err.response?.data,
            headers: err.response?.headers
        });
    }
    const errorMessage = err.response?.data?.message || err.message || 'auth_failed';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url));
  }
}
