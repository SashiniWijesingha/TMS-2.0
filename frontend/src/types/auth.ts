export interface User {
    id: number;
    email: string;
    name: string;
    role: 'ADMIN' | 'STAFF' | 'COORDINATOR' | 'HOD' | 'TRANSPORT';
    divisionId?: number;
}

export interface LoginResponse {
    token: string;
    role: string;
    name: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}
