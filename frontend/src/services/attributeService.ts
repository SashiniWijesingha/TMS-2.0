import { api } from './authService';

export const createAttribute = async (vehicle_type_id: number, attr: any) => {
    const response = await api.post('/vehicle-attributes', { vehicle_type_id, ...attr });
    return response.data;
};

export const deleteAttribute = async (id: number) => {
    const response = await api.delete(`/vehicle-attributes/${id}`);
    return response.data;

};

export const updateAttribute = async (id: number, attr: any) => {
    const response = await api.put(`/vehicle-attributes/${id}`, attr);
    return response.data;
};
