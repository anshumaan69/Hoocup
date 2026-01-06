import axios from 'axios';

const api = axios.create({
    baseURL: '/api/auth', // Trace through Next.js rewrite proxy for cookies
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
                
                if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                    window.location.href = '/login'; 
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
