'use client';

import { Suspense, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../../services/api';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

export function SignupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialStep = searchParams.get('step') ? parseInt(searchParams.get('step')!) : 1;
    const [step, setStep] = useState(initialStep); // 1: Google, 2: Phone
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);

    const login = useGoogleLogin({
        flow: 'auth-code',
        ux_mode: 'redirect',
        redirect_uri: 'http://localhost:3000/api/auth/callback/google',
        onError: () => alert('Google Signup Failed'),
    });

    const handleSendOtp = async () => {
        try {
            await api.post('/send-otp', { phone });
            setIsOtpSent(true);
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
                if (res.data.user && res.data.user.is_profile_complete) {
                     router.push('/home'); // Or dashboard
                } else {
                     router.push('/register-details');
                }
            }
        } catch (error) {
            console.error('Verify OTP Failed', error);
            alert('Invalid OTP');
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <h1 className="text-4xl font-bold mb-8">Sign Up</h1>

            {step === 1 && (
                <div className="flex flex-col gap-4 w-full max-w-md border border-zinc-800 p-6 rounded-lg bg-zinc-900/50">
                    <p className="text-lg font-medium">Step 1: Authenticate with Google</p>
                    <button onClick={() => login()} className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors">
                        Sign up with Google
                    </button>
                    {/* Add note about step 2 being required after return */}
                </div>
            )}

            {step === 2 && (
                <div className="flex flex-col gap-4 w-full max-w-md border border-zinc-800 p-6 rounded-lg bg-zinc-900/50">
                    <p className="text-lg font-medium">Step 2: Verify Phone Number</p>
                    {!isOtpSent ? (
                        <>
                            <input
                                type="text"
                                placeholder="Phone Number (e.g., +1234567890)"
                                className="p-2 border border-zinc-700 rounded bg-zinc-800 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                            <button
                                onClick={handleSendOtp}
                                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
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
                                className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors"
                            >
                                Verify & Proceed
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Signup() {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <SignupContent />
      </Suspense>
    );
}
