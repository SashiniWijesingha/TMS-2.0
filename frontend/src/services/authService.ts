import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const login = async (email: string, password: string): Promise<any> => {
    const response = await api.post('/auth/login', { email, password });
    
    // Skip setting tokens if we hit the OTP Setup Gateway
    if (response.data.status === 'REQUIRE_FIRST_TIME_SETUP') {
        return response.data; 
    }

    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify({
            name: response.data.name,
            role: response.data.role
        }));
        // Trigger auth update event
        window.dispatchEvent(new Event('auth-change'));
    }
    return response.data;
};

export const verifyOtpAndSetup = async (email: string, otp: string, newPassword: string) => {
    const response = await api.post('/auth/verify-otp', { email, otp, newPassword });
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify({
            name: response.data.name,
            role: response.data.role
        }));
        window.dispatchEvent(new Event('auth-change'));
    }
    return response.data;
};

// FUTURE: Optional privacy mode for shared devices.
// If enabled, convert logout to async and call `await unsubscribeFromPush()`
// before clearing local auth state and redirecting.
// Example:
// export const logout = async () => {
//   if (!keepPushAfterLogout) await unsubscribeFromPush();
//   localStorage.removeItem('token');
//   localStorage.removeItem('user');
//   window.dispatchEvent(new Event('auth-change'));
//   window.location.href = '/login';
// };
export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Trigger auth update event
    window.dispatchEvent(new Event('auth-change'));
    window.location.href = '/';
};

export const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
}

export const changePassword = async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
};

export const requestPasswordReset = async (email: string) => {
    const response = await api.post('/auth/request-password-reset', { email });
    return response.data;
};

export const resetPasswordWithOtp = async (email: string, otp: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { email, otp, newPassword });
    return response.data;
};
