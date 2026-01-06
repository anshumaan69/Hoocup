'use client';

import { Suspense, useEffect, useState } from 'react';
import api from '../services/api';
import { useRouter, useSearchParams } from 'next/navigation';

function HomeContent() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            localStorage.setItem('token', token);
             const newUrl = window.location.pathname;
             window.history.replaceState({}, '', newUrl);
        }

        api.get('/me')
            .then(res => setUser(res.data))
            .catch((err) => {
                console.error('Failed to fetch user', err);
                // Only redirect if valid token wasn't just set or if call failed despite it
                router.push('/login');
            });
    }, [router, searchParams]);

    const handleLogout = async () => {
        try {
            await api.post('/logout');
            localStorage.removeItem('token'); // Clear token
            router.push('/');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    if (!user) {
        return <div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>;
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-8">
            <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                     <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl font-bold mb-4">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                     </div>
                     <h1 className="text-3xl font-bold">{user.first_name} {user.last_name}</h1>
                     <p className="text-zinc-400">@{user.username}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-zinc-800/50 p-4 rounded-lg">
                        <span className="text-zinc-500 text-sm block mb-1">Email</span>
                        <span className="text-lg">{user.email || 'Not provided'}</span>
                    </div>
                    <div className="bg-zinc-800/50 p-4 rounded-lg">
                        <span className="text-zinc-500 text-sm block mb-1">Phone</span>
                        <span className="text-lg">{user.phone}</span>
                    </div>
                    <div className="bg-zinc-800/50 p-4 rounded-lg">
                        <span className="text-zinc-500 text-sm block mb-1">Date of Birth</span>
                        <span className="text-lg">{user.dob ? new Date(user.dob).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="bg-zinc-800/50 p-4 rounded-lg">
                        <span className="text-zinc-500 text-sm block mb-1">Status</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
                            Verified
                        </span>
                    </div>
                </div>
                
                <div className="flex justify-center">
                    <button 
                        onClick={handleLogout}
                        className="rounded-full bg-red-600/90 px-8 py-3 text-white font-semibold hover:bg-red-700 transition"
                    >
                        Logout
                    </button>
                </div>
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
