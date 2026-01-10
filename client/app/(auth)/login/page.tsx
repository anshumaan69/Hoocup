'use client';

import { Suspense, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../../services/api';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginContent() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);

    const login = useGoogleLogin({
        flow: 'auth-code',
        ux_mode: 'redirect',
        redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback/google` : '',
        onError: () => alert('Google Login Failed'),
    });

    const handleSendOtp = async () => {
        try {
            await api.post('/auth/send-otp', { phone });
            setShowOtpInput(true);
            alert('OTP Sent!');
        } catch (error: any) {
            console.error('Send OTP Failed', error);
            const msg = error.response?.data?.message || 'Failed to send OTP';
            alert(msg);
        }
    };

    const handleVerifyOtp = async () => {
        try {
            const res = await api.post('/auth/verify-otp', { phone, code: otp });
            if (res.status === 200) {
                if (res.data.user && res.data.user.is_profile_complete) {
                     router.push('/home');
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
            alert(error.response?.data?.message || 'Invalid OTP');
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                        Hoocup
                    </h1>
                    <p className="text-muted-foreground">Welcome back! Please login to continue.</p>
                </div>

                <div className="space-y-4">
                    {/* Google Login */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Sign in with Google</CardTitle>
                            <CardDescription>Fast and secure login</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button 
                                variant="outline" 
                                className="w-full py-6 flex gap-2"
                                onClick={() => login()}
                            >
                                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                </svg>
                                Continue with Google
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-muted"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or login with phone</span>
                        </div>
                    </div>

                    {/* Phone Login */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Phone Verification</CardTitle>
                            <CardDescription>We'll send you a one-time password</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!showOtpInput ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Phone Number</Label>
                                        <Input
                                            type="tel"
                                            placeholder="+91 99999 99999"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                    <Button onClick={handleSendOtp} className="w-full" disabled={!phone}>
                                        Send OTP
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Enter OTP</Label>
                                        <Input
                                            type="text"
                                            placeholder="123456"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            className="text-center tracking-widest text-lg"
                                        />
                                    </div>
                                    <Button onClick={handleVerifyOtp} className="w-full" disabled={!otp}>
                                        Verify & Login
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => setShowOtpInput(false)} 
                                        className="w-full text-xs text-muted-foreground"
                                    >
                                        Change Phone Number
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
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
