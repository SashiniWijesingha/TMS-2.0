import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { Check, Bell, Clock, Calendar } from 'lucide-react';


interface Notification {
    id: number;
    message: string;
    is_read: boolean;
    created_at: string;
}

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const fetchNotifications = useCallback(() => {
        api.get('/notifications')
            .then(res => setNotifications(res.data))
            .catch(console.error);
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAsRead = async (id: number) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error(error);
        }
    };


    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Bell size={20} className="text-blue-500" />
                        Notifications
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">Stay updated with your request status and tasks.</p>
                </div>
                {/* Optional: 'Mark all as read' button could go here */}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                        <div className="p-3 bg-slate-50 rounded-full">
                            <Bell size={24} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium">You're all caught up! No new notifications.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {notifications.map(n => (
                            <div
                                key={n.id}
                                className={`p-4 flex gap-4 hover:bg-slate-50/80 transition-colors group ${!n.is_read ? 'bg-blue-50/40 relative' : ''}`}
                            >
                                {!n.is_read && (
                                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500"></div>
                                )}
                                <div className={`mt-1 p-2 rounded-full shrink-0 ${!n.is_read ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Bell size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm text-slate-800 mb-1 ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>
                                        {n.message}
                                    </p>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={10} />
                                            {new Date(n.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={10} />
                                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                {!n.is_read && (
                                    <button
                                        onClick={() => markAsRead(n.id)}
                                        className="p-1.5 self-start text-blue-600 hover:bg-blue-100 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Mark as read"
                                    >
                                        <Check size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
