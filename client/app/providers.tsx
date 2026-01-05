'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

export function Providers({ children }: { children: React.ReactNode }) {
    // Replace with your actual Google Client ID from env
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'mock_client_id';

    return (
        <GoogleOAuthProvider clientId={clientId}>
            {children}
        </GoogleOAuthProvider>
    );
}
