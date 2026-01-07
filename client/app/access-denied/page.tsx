'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get('message') || 'Access to this account has been restricted.';

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-red-900/50 rounded-2xl p-8 text-center shadow-2xl shadow-red-900/20">
        <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-red-500">Access Denied</h1>
        
        <p className="text-zinc-400 mb-8 leading-relaxed">
          {message}
        </p>

        <button 
          onClick={() => router.push('/login')}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </button>
      </div>
    </div>
  );
}

export default function AccessDenied() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
            <AccessDeniedContent />
        </Suspense>
    );
}
