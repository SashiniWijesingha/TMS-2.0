import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, X, MessageSquare, AlertCircle } from 'lucide-react';
import type { VehicleRequest } from '../../types';

interface ApprovalActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: VehicleRequest | null;
    actionType: 'APPROVE' | 'REJECT' | 'RETURN' | null;
    onConfirm: (comment: string) => Promise<void>;
}

const ApprovalActionModal: React.FC<ApprovalActionModalProps> = ({
    isOpen,
    onClose,
    request,
    actionType,
    onConfirm
}) => {
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setComment(actionType === 'APPROVE' ? 'Approved' : '');
            setIsSubmitting(false);
        }
    }, [isOpen, actionType]);

    const handleSubmit = async () => {
        if ((actionType === 'REJECT' || actionType === 'RETURN') && !comment.trim()) {
            return; // Validation handled by disabled button state logic usually, but good to have safeguard
        }
        setIsSubmitting(true);
        try {
            await onConfirm(comment);
        } catch (error) {
            // Error handling should be done by parent or toast here
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !request || !actionType) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden max-h-[calc(100dvh-2rem)] flex flex-col"
                >
                    <div className={`p-4 sm:p-6 border-b ${actionType === 'APPROVE' ? 'bg-emerald-50 border-emerald-100' : actionType === 'RETURN' ? 'bg-purple-50 border-purple-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex justify-between items-center">
                            <h3 className={`text-lg font-bold flex items-center gap-2 ${actionType === 'APPROVE' ? 'text-emerald-800' : actionType === 'RETURN' ? 'text-purple-800' : 'text-red-800'}`}>
                                {actionType === 'APPROVE' ? <CheckCircle size={20} /> : actionType === 'RETURN' ? <AlertCircle size={20} /> : <XCircle size={20} />}
                                {actionType === 'APPROVE' ? 'Approve Request' : actionType === 'RETURN' ? 'Return Request' : 'Reject Request'}
                            </h3>
                            <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-white/70">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                        <p className="text-slate-600 mb-4">
                            You are about to <strong>{actionType.toLowerCase()}</strong> the request for <span className="font-semibold text-slate-800">{request.project_name}</span>.
                        </p>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <MessageSquare size={16} />
                                {actionType === 'APPROVE' ? 'Approval Note (Optional)' : actionType === 'RETURN' ? 'Reason for Return (Required)' : 'Reason for Rejection (Required)'}
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder={actionType === 'APPROVE' ? "Add a note..." : actionType === 'RETURN' ? "Please explain why this request is being returned..." : "Please explain why this request is being rejected..."}
                                className={`w-full p-3 rounded-xl border focus:ring-2 focus:outline-none transition-all resize-none h-32 text-sm
                                    ${actionType === 'APPROVE'
                                        ? 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
                                        : actionType === 'RETURN'
                                            ? 'border-slate-200 focus:border-purple-500 focus:ring-purple-100'
                                            : 'border-slate-200 focus:border-red-500 focus:ring-red-100'
                                    }`}
                            />
                            {(actionType === 'REJECT' || actionType === 'RETURN') && !comment.trim() && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    Reason is required for {actionType.toLowerCase()}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="desktop-btn desktop-btn-secondary min-w-0"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || ((actionType === 'REJECT' || actionType === 'RETURN') && !comment.trim()) || (actionType === 'APPROVE' && isSubmitting)}
                            className={`desktop-btn min-w-[140px]
                                ${actionType === 'APPROVE'
                                    ? 'desktop-btn-success'
                                    : actionType === 'RETURN'
                                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-200 hover:bg-purple-700 focus:ring-purple-500/20'
                                    : 'desktop-btn-danger-solid'
                                }`}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing
                                </div>
                            ) : (
                                <>Confirm {actionType === 'APPROVE' ? 'Approval' : actionType === 'RETURN' ? 'Return' : 'Rejection'}</>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ApprovalActionModal;
