import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/auth';

const api = axios.create({
    baseURL: API_URL,
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
                // Refresh failed - redirect to login
                if (typeof window !== 'undefined') {
                    window.location.href = '/login'; 
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
