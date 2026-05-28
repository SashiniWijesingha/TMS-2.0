import api from './api';
import type { Trip } from '../types';

export const getTrips = async () => {
    const response = await api.get<Trip[]>('/trips');
    return response.data;
};

export const createTrip = async (tripData: any) => {
    const response = await api.post('/trips', tripData);
    return response.data;
};

export const deleteTrip = async (id: number) => {
    const response = await api.delete(`/trips/${id}`);
    return response.data;
};
