import { api } from './authService';
import type { TransportPackage, FuelType } from '../types';

export interface PackageFilters {
    vehicle_type_id?: string;
    fuel_type_id?: string;
    ac_type?: string;
    package_category?: string;
    status?: string;
    search?: string;
}

export const getTransportPackages = async (filters: PackageFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
        if (val) params.append(key, val);
    });
    const response = await api.get<TransportPackage[]>(`/transport-packages?${params.toString()}`);
    return response.data;
};

export const getTransportPackageById = async (id: number | string) => {
    const response = await api.get<TransportPackage>(`/transport-packages/${id}`);
    return response.data;
};

export const createTransportPackage = async (data: Partial<TransportPackage>) => {
    const response = await api.post<{ message: string; transportPackage: TransportPackage }>('/transport-packages', data);
    return response.data;
};

export const updateTransportPackage = async (id: number | string, data: Partial<TransportPackage>) => {
    const response = await api.put<{ message: string; transportPackage: TransportPackage; historyCreated?: boolean }>(`/transport-packages/${id}`, data);
    return response.data;
};

export const updateTransportPackageStatus = async (id: number | string, status: 'ACTIVE' | 'INACTIVE') => {
    const response = await api.patch<{ message: string; transportPackage: TransportPackage }>(`/transport-packages/${id}/status`, { status });
    return response.data;
};

export const deleteTransportPackage = async (id: number | string) => {
    const response = await api.delete<{ message: string }>(`/transport-packages/${id}`);
    return response.data;
};

export const getPackageHistory = async (params: {
    vehicle_type_id: number | string;
    fuel_type_id: number | string;
    ac_type: string;
    package_name: string;
    package_category: string;
}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
        searchParams.append(key, String(val));
    });
    const response = await api.get<TransportPackage[]>(`/transport-packages/history?${searchParams.toString()}`);
    return response.data;
};

// Fuel Types Management
export const getFuelTypes = async () => {
    const response = await api.get<FuelType[]>('/fuel-types');
    return response.data;
};

export const createFuelType = async (data: FormData) => {
    const response = await api.post<{ message: string; fuelType: FuelType }>('/admin/fuel-types', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const updateFuelType = async (id: number | string, data: FormData) => {
    const response = await api.put<{ message: string; fuelType: FuelType }>(`/admin/fuel-types/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const deleteFuelType = async (id: number | string) => {
    const response = await api.delete<{ message: string }>(`/admin/fuel-types/${id}`);
    return response.data;
};
