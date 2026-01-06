'use client';

import { Suspense, useEffect, useState } from 'react';
import api from '../services/api';
import { useRouter, useSearchParams } from 'next/navigation';

function HomeContent() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Just fetch user. Interceptor handles 401->Refresh->Retry or Redirect
        api.get('/me')
            .then(res => {
                const userData = res.data;
                setUser(userData);
                // Enforce Phone Verification
                if (!userData.is_phone_verified) {
                    router.push('/signup?step=2');
                }
            })
            .catch((err) => {
                console.error('Failed to fetch user', err);
                // No need to clear localStorage anymore
                // API interceptor should have handled redirect to /login if refresh failed
            });
    }, [router]);

    const handleLogout = async () => {
        try {
            await api.post('/logout');
            router.push('/login'); 
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    if (!user) {
        return <div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>;
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-8">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text">
                Welcome to Hoocup
            </h1>
            <p className="text-xl text-zinc-400 mb-12">Connect, Share, and Grow.</p>

            <div className="flex gap-6">
                <button 
                    onClick={() => router.push(`/${user.username}`)}
                    className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-transform hover:scale-105"
                >
                    Go to My Profile
                </button>
                <button 
                    onClick={handleLogout}
                    className="px-8 py-4 bg-zinc-800 text-white font-bold rounded-full hover:bg-zinc-700 transition"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
