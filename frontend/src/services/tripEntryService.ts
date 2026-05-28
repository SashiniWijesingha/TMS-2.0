import api from './api';
import type { TripEntry } from '../types';

export type TripEntryPayload = {
    driverId: number | string;
    vehicleId: number | string;
    packageId: number | string;
    totalKm: number | string;
    totalTripDays: number | string;
    otHours: number | string;
    nightOutCount: number | string;
};

export type TripEntryQuery = {
    q?: string;
    status?: string;
    from?: string;
    to?: string;
};

export const createTripEntry = async (payload: TripEntryPayload | FormData) => {
    const config = payload instanceof FormData ? {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    } : {};
    const response = await api.post('/trip-entries', payload, config);
    return response.data;
};

export const getTripEntries = async (query: TripEntryQuery = {}) => {
    const params = new URLSearchParams();
    if (query.q) params.append('q', query.q);
    if (query.status) params.append('status', query.status);
    if (query.from) params.append('from', query.from);
    if (query.to) params.append('to', query.to);

    const response = await api.get<TripEntry[]>(`/trip-entries?${params.toString()}`);
    return response.data;
};

export const getTripEntryById = async (id: number | string) => {
    const response = await api.get<TripEntry>(`/trip-entries/${id}`);
    return response.data;
};
