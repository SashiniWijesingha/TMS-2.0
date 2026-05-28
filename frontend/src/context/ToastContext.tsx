/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            layout
                            className={`pointer-events-auto min-w-[300px] max-w-sm p-4 rounded-xl shadow-lg border flex items-start gap-3 backdrop-blur-md
                                ${toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-900' :
                                    toast.type === 'error' ? 'bg-red-50/90 border-red-100 text-red-900' :
                                        'bg-blue-50/90 border-blue-100 text-blue-900'}`}
                        >
                            <div className="mt-0.5 shrink-0">
                                {toast.type === 'success' && <CheckCircle size={18} className="text-emerald-600" />}
                                {toast.type === 'error' && <XCircle size={18} className="text-red-600" />}
                                {toast.type === 'info' && <AlertCircle size={18} className="text-blue-600" />}
                            </div>
                            <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
                            <button onClick={() => removeToast(toast.id)} className="shrink-0 text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
