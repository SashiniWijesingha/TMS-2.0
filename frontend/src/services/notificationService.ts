
import api from './api';

export interface Notification {
    id: number;
    user_id: number;
    request_id?: number;
    message: string;
    is_read: boolean;
    createdAt: string;
}

export const getNotifications = async (): Promise<Notification[]> => {
    const response = await api.get('/notifications');
    return response.data;
};

export const markAsRead = async (id: number): Promise<void> => {
    await api.put(`/notifications/${id}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
    await api.put('/notifications/read-all');
};

export const deleteNotification = async (id: number): Promise<void> => {
    await api.delete(`/notifications/${id}`);
};

export const clearAllNotifications = async (): Promise<void> => {
    await api.delete('/notifications/clear-all');
};
