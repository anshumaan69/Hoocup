'use client';

import { Suspense, useState, useEffect } from 'react';
import api from '../../services/api';
import { useRouter, useSearchParams } from 'next/navigation';

export function RegisterDetailsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        dob: '',
        username: ''
    });

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            localStorage.setItem('token', token);
            // Optional: clean URL
             const newUrl = window.location.pathname;
             window.history.replaceState({}, '', newUrl);
        }
    }, [searchParams]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGenerateUsername = () => {
        const base = formData.first_name ? formData.first_name.toLowerCase().replace(/\s/g, '') : 'user';
        const random = Math.floor(Math.random() * 10000);
        setFormData({ ...formData, username: `${base}${random}` });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/register-details', formData);
            router.push('/home');
        } catch (error: any) {
            console.error('Registration failed', error);
            const msg = error.response?.data?.message || 'Failed to update details';
            alert(msg);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
             <div className="w-full max-w-md border border-zinc-800 p-8 rounded-lg bg-zinc-900/50">
                <h1 className="text-3xl font-bold mb-6 text-center">Complete Your Profile</h1>
                <p className="text-zinc-400 mb-8 text-center">One last step to join the community.</p>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1 text-zinc-300">First Name</label>
                            <input 
                                type="text"
                                name="first_name"
                                required
                                className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500"
                                value={formData.first_name}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1 text-zinc-300">Last Name</label>
                            <input 
                                type="text"
                                name="last_name"
                                required
                                className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500"
                                value={formData.last_name}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-zinc-300">Username</label>
                        <div className="flex gap-2">
                             <input 
                                type="text"
                                name="username"
                                required
                                className="flex-1 p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500"
                                value={formData.username}
                                onChange={handleChange}
                            />
                            <button 
                                type="button"
                                onClick={handleGenerateUsername}
                                className="px-3 py-2 bg-zinc-700 rounded hover:bg-zinc-600 text-xs text-white"
                            >
                                Generate
                            </button>
                        </div>
                    </div>

                    <div>
                         <label className="block text-sm font-medium mb-1 text-zinc-300">Date of Birth</label>
                         <input 
                            type="date"
                            name="dob"
                            required
                            className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500 text-white"
                            value={formData.dob}
                            onChange={handleChange}
                        />
                    </div>

                    <button 
                        type="submit"
                        className="mt-4 bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Finish Setup
                    </button>
                </form>
             </div>
        </div>
    );
}

export default function RegisterDetails() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterDetailsContent />
    </Suspense>
  );
}
