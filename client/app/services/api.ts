import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Trace through Next.js rewrite proxy for cookies
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Add CSRF Token if present
api.interceptors.request.use((config) => {
    if (typeof document !== 'undefined') {
        // Read "csrf_token" from cookie (not httpOnly)
        const match = document.cookie.match(new RegExp('(^| )csrf_token=([^;]+)'));
        if (match) {
            config.headers['X-CSRF-Token'] = match[2];
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Silent Refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loops
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/refresh')) {
            originalRequest._retry = true;
            try {
                // Attempt refresh
                await api.post('/refresh');
                // Retry original request (cookies will be automatically attached)
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed - try to logout to clear cookies, then redirect
                try {
                    await api.post('/logout'); 
                } catch (e) { 
                    /* Ignore logout error */ 
                }
                
                // FORCE CLEANUP: Manually clear cookies if API failed to do so
                if (typeof document !== 'undefined') {
                    document.cookie = 'access_token=; Max-Age=0; path=/;';
                    document.cookie = 'refresh_token=; Max-Age=0; path=/;';
                    document.cookie = 'csrf_token=; Max-Age=0; path=/;';
                }

                if (typeof window !== 'undefined') {
                    const path = window.location.pathname;
                    // Prevent redirect loop if already on login or signup
                    if (!path.startsWith('/login') && !path.startsWith('/signup')) {
                        console.log('[API] 401 Force Logout -> Redirecting to Login');
                         window.location.href = '/login'; 
                    } else {
                        console.log('[API] 401 on Login Page - suppressing redirect');
                    }
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
