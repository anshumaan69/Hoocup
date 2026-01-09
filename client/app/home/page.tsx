'use client';

import { Suspense, useEffect, useState } from 'react';
import api from '../services/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Feed from '../components/Feed';

function HomeContent() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Just fetch user. Interceptor handles 401->Refresh->Retry or Redirect
        api.get('/auth/me')
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
                if (err.response?.status === 403) {
                     router.push(`/access-denied?message=${encodeURIComponent(err.response.data.message)}`);
                     return;
                }
                // No need to clear localStorage anymore
                // API interceptor should have handled redirect to /login if refresh failed
            });
    }, [router]);

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
            router.push('/login'); 
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    if (!user) {
        return <div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>;
    }

    return (
        <div className="flex min-h-screen flex-col items-center bg-background text-foreground">
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md p-4 flex justify-between items-center supports-[backdrop-filter]:bg-background/60">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-transparent bg-clip-text">
                    Hoocup
                </h1>
                <div className="flex gap-4">

                    <button 
                         onClick={() => router.push(`/${user.username}`)}
                         className="text-sm font-semibold text-muted-foreground hover:text-foreground transition"
                     >
                         My Profile
                     </button>
                    <button 
                        onClick={handleLogout}
                        className="text-sm font-semibold text-destructive hover:text-destructive/80 transition"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="w-full max-w-2xl p-4">
                 <Feed />
            </main>
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
