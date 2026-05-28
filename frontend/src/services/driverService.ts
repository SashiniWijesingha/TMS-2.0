import api from './api';
import type { Allocation, RequestStatus } from '../types';

export const getMyAllocations = async () => {
    const response = await api.get<Allocation[]>('/driver/allocations');
    return response.data;
};

export const updateTripStatus = async (requestId: number, status: RequestStatus) => {
    const response = await api.put(`/driver/requests/${requestId}/status`, { status });
    return response.data;
};
