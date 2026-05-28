import { api } from './authService';
import type { Vehicle } from '../types';

type VehicleTypeResponse = {
    id: number;
    name: string;
    category: string;
    attributes?: Array<{ options?: unknown }>;
};

const normalizeAttributeOptions = (options: unknown): string[] | null => {
    if (Array.isArray(options)) {
        return options.map(opt => `${opt}`).filter(Boolean);
    }
    if (typeof options === 'string') {
        const trimmed = options.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map(opt => `${opt}`).filter(Boolean);
                }
            } catch {
                // Fall back to comma-separated parsing below.
            }
        }
        return trimmed
            .split(',')
            .map(part => part.trim())
            .filter(Boolean);
    }
    return null;
};

const normalizeVehicleTypes = (types: VehicleTypeResponse[]): VehicleTypeResponse[] => {
    return types.map(type => ({
        ...type,
        attributes: Array.isArray(type.attributes)
            ? type.attributes.map(attr => ({
                ...attr,
                options: normalizeAttributeOptions(attr.options)
            }))
            : []
    }));
};

export const getAllVehicles = async () => {
    const response = await api.get<Vehicle[]>('/vehicles');
    return response.data;
};

export const createVehicle = async (vehicleData: FormData | Partial<Vehicle>) => {
    const config = vehicleData instanceof FormData ? {
        headers: { 'Content-Type': 'multipart/form-data' }
    } : {};
    const response = await api.post('/vehicles', vehicleData, config);
    return response.data;
};

export const updateVehicle = async (id: number, vehicleData: Partial<Vehicle>) => {
    const response = await api.put(`/vehicles/${id}`, vehicleData);
    return response.data;
};

export const deleteVehicle = async (id: number) => {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
};

// Vehicle Types
export const getVehicleTypes = async () => {
    const response = await api.get<VehicleTypeResponse[]>('/vehicle-types');
    return normalizeVehicleTypes(response.data);
};

// Mock data for vehicle categories as per requirements
export const getVehicleCategories = async () => {
    // In production, this would be: await api.get(...)
    return [
        { id: 1, name: 'Any Car', type: 'Car', max_passengers: 4, luggage_capacity: '2 Large Bags' },
        { id: 2, name: 'Sedan Car', type: 'Car', max_passengers: 4, luggage_capacity: '2 Large Bags' },
        { id: 3, name: 'A/C Van', type: 'Van', max_passengers: 12, luggage_capacity: '4 Large Bags' },
        { id: 4, name: 'Non A/C Van', type: 'Van', max_passengers: 12, luggage_capacity: '4 Large Bags' },
        { id: 5, name: 'KDH 9 Seat', type: 'Van', max_passengers: 9, luggage_capacity: '5 Large Bags' },
        { id: 6, name: 'KDH 14 Seat', type: 'Van', max_passengers: 14, luggage_capacity: '6 Large Bags' },
        { id: 7, name: 'Double Cab', type: 'Double Cab', max_passengers: 4, luggage_capacity: 'Open Bed' }
    ];
};

export const createVehicleType = async (name: string, category: string) => {
    const response = await api.post('/vehicle-types', { name, category });
    return response.data;
};

export const deleteVehicleType = async (id: number) => {
    const response = await api.delete(`/vehicle-types/${id}`);
    return response.data;
};

export const updateVehicleType = async (id: number, name: string, category: string) => {
    const response = await api.put(`/vehicle-types/${id}`, { name, category });
    return response.data;
};

// Assignment

export const assignDriverToVehicle = async (vehicleId: number, driverId: number | null) => {
    const response = await api.post(`/vehicles/${vehicleId}/assign`, { driverId });
    return response.data;
};

export const assignPackageToVehicle = async (vehicleId: number, packageId: number | null) => {
    const response = await api.post(`/vehicles/${vehicleId}/assign-package`, { packageId });
    return response.data;
};

// Drivers (for Assignment)
export const getAllDrivers = async () => {
    const response = await api.get<any[]>('/admin/drivers');
    return response.data;
};
