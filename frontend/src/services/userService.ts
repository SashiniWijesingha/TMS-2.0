import { api } from './authService';
import type { User, Division } from '../types';

export const getAllUsers = async () => {
    const response = await api.get<User[]>('/users');
    return response.data;
};

export const createUser = async (userData: Partial<User> & { password: string, role: string, division_id?: number | null }) => {
    const response = await api.post('/users', userData);
    return response.data;
};

export const updateUser = async (id: number | string, userData: Partial<User> & { password?: string, role?: string, division_id?: number | null }) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
};

export const deleteUser = async (id: number | string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};

export const getDivisions = async () => {
    const response = await api.get<Division[]>('/divisions');
    return response.data;
};

export const createDivision = async (name: string) => {
    const response = await api.post('/divisions', { name });
    return response.data;
};

export const updateDivision = async (id: number, name: string) => {
    const response = await api.put(`/divisions/${id}`, { name });
    return response.data;
};

export const deleteDivision = async (id: number) => {
    const response = await api.delete(`/divisions/${id}`);
    return response.data;
};

// SubDivision Services
export const createSubDivision = async (divisionId: number, name: string) => {
    const response = await api.post(`/divisions/${divisionId}/sub-divisions`, { name });
    return response.data;
};

export const updateSubDivision = async (id: number, name: string) => {
    const response = await api.put(`/sub-divisions/${id}`, { name });
    return response.data;
};

export const deleteSubDivision = async (id: number) => {
    const response = await api.delete(`/sub-divisions/${id}`);
    return response.data;
};
