import api from './api';

export const getRequests = async () => {
    const response = await api.get('/requests');
    return response.data;
};

export const getRequestById = async (id: string) => {
    const response = await api.get(`/requests/${id}`);
    return response.data;
};

export const createRequest = async (data: any) => {
    const response = await api.post('/requests', data);
    return response.data;
};

export const updateRequest = async (id: string, data: any) => {
    const response = await api.put(`/requests/${id}`, data);
    return response.data;
};

export const verifyRequest = async (id: string, status: string, comment: string) => {
    const response = await api.put(`/requests/${id}/verify`, { status, comment });
    return response.data;
};

export const approveRequest = async (id: string, status: string, comment: string) => {
    const response = await api.put(`/requests/${id}/approve`, { status, comment });
    return response.data;
};

export const allocateVehicle = async (id: string, allocationData: any) => {
    const response = await api.put(`/requests/${id}/allocate`, allocationData);
    return response.data;
};

export const updateAllocation = async (requestId: string, vehicleId: number, driverId: number) => {
    const response = await api.put(`/requests/${requestId}/update-allocation`, { vehicleId, driverId });
    return response.data;
};

export const getAllocationResources = async (type: string, requestIds?: number[]) => {
    const params: any = { type };
    if (requestIds && requestIds.length > 0) {
        params.requestIds = requestIds.join(',');
    }
    const response = await api.get('/allocation/resources', { params });
    return response.data;
};

// Optimization Features
export const getSharedVehicleSuggestions = async (params: any) => {
    const response = await api.get('/requests/shared-vehicles', { params });
    return response.data;
};

export const getRouteOptimizationSuggestions = async (
    startDate?: string,
    endDate?: string,
    viewAll?: boolean,
    divisionScope: 'all' | 'own' = 'all'
) => {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (viewAll) params.viewAll = 'true';
    params.divisionScope = divisionScope;

    const response = await api.get('/requests/optimization-suggestions', { params });
    return response.data;
};

export const mergeRequests = async (
    requestIds: number[],
    vehicleTypeId: number,
    startTime?: string,
    proposedAttributes?: any,
    vehicleId?: number,
    driverId?: number
) => {
    const payload = {
        requestIds,
        vehicleTypeId,
        startTime,
        proposedAttributes,
        vehicleId,
        driverId
    };
    const response = await api.post('/allocations/merge', payload);
    return response.data;
};

export const calculateRoute = async (pickup: any, drop: any, stops: any[] = []) => {
    try {
        const response = await api.post('/requests/calculate-route', {
            pickup,
            drop,
            stops
        });
        return response.data;
    } catch (error) {
        console.error('Route calculation failed:', error);
        return null;
    }
};

// Merge Group Management
export const getMergeGroups = async () => {
    const response = await api.get('/requests/merge-groups');
    return response.data;
};

export const approveMergeGroup = async (groupId: string, status: 'APPROVED' | 'REJECTED', comment?: string) => {
    const response = await api.put(`/requests/merge-groups/${groupId}/approve`, { status, comment });
    return response.data;
};

export const unmergeGroup = async (groupId: string) => {
    const response = await api.delete(`/requests/merge-groups/${groupId}`);
    return response.data;
};
