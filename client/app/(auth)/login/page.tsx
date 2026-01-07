'use client';

import { Suspense, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../../services/api';
import { useRouter } from 'next/navigation';

export function LoginContent() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);

    // Middleware handles auth status checks (redirects to /home if logged in).
    // No need for client-side check to prevent loops.

    const login = useGoogleLogin({
        flow: 'auth-code',
        ux_mode: 'redirect',
        redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback/google` : '',
        onError: () => alert('Google Login Failed'),
    });

    const handleSendOtp = async () => {
        try {
            await api.post('/send-otp', { phone });
            setShowOtpInput(true);
            alert('OTP Sent!');
        } catch (error: any) {
            console.error('Send OTP Failed', error);
            const msg = error.response?.data?.message || 'Failed to send OTP';
            const detail = error.response?.data?.error ? ` (${error.response.data.error})` : '';
            alert(msg + detail);
        }
    };

    const handleVerifyOtp = async () => {
        try {
            const res = await api.post('/verify-otp', { phone, code: otp });
            if (res.status === 200) {
                 // Cookies handled by server
                if (res.data.user && res.data.user.is_profile_complete) {
                     router.push('/home'); // Or dashboard
                } else {
                     router.push('/register-details');
                }
            }
        } catch (error: any) {
            console.error('Verify OTP Failed', error);
            
            if (error.response?.status === 403) {
                router.push(`/access-denied?message=${encodeURIComponent(error.response.data.message)}`);
                return;
            }

            const msg = error.response?.data?.message || 'Invalid OTP';
            const detail = error.response?.data?.error ? ` (${error.response.data.error})` : '';
            alert(msg + detail);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <h1 className="text-4xl font-bold mb-8">Login</h1>

            <div className="flex flex-col gap-8 w-full max-w-md">
                <div className="flex flex-col gap-4 border border-zinc-800 p-4 rounded bg-zinc-900/50">
                    <h2 className="text-xl font-semibold">Option 1: Google</h2>
                    <button onClick={() => login()} className="bg-red-500 text-white p-2 rounded hover:bg-red-600">
                        Sign in with Google
                    </button>
                </div>

                <div className="flex flex-col gap-4 border border-zinc-800 p-4 rounded bg-zinc-900/50">
                   <h2 className="text-xl font-semibold">Option 2: Phone</h2>
                   {!showOtpInput ? (
                        <>
                            <input
                                type="text"
                                placeholder="Phone Number"
                                className="p-2 border border-zinc-700 rounded bg-zinc-800 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                            <button
                                onClick={handleSendOtp}
                                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                            >
                                Send OTP
                            </button>
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                placeholder="Enter OTP"
                                className="p-2 border border-zinc-700 rounded bg-zinc-800 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                            <button
                                onClick={handleVerifyOtp}
                                className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                            >
                                Verify & Login
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
