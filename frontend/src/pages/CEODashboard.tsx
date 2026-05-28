import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import type { VehicleRequest } from '../types';
import { RequestStatus } from '../types';
import { CheckCircle, AlertCircle, Clock, XCircle, Eye } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ApprovalActionModal from '../components/hod/ApprovalActionModal';
import { useNavigate } from 'react-router-dom';

const CEODashboard = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [requests, setRequests] = useState<VehicleRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedRequest, setSelectedRequest] = useState<VehicleRequest | null>(null);
    const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'RETURN' | null>(null);

    const loadRequests = useCallback(() => {
        setLoading(true);
        api.get('/requests')
            .then(res => {
                setRequests(res.data);
            })
            .catch(err => {
                console.error(err);
                showToast("Failed to load requests", "error");
            })
            .finally(() => setLoading(false));
    }, [showToast]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);
    const handleOpenModal = (req: VehicleRequest, type: 'APPROVE' | 'REJECT' | 'RETURN') => {
        setSelectedRequest(req);
        setActionType(type);
    };

    const handleConfirmAction = async (comment: string) => {
        if (!selectedRequest || !actionType) return;

        const reqId = selectedRequest.id;

        try {
            let status = 'APPROVED';
            if (actionType === 'REJECT') status = 'REJECTED';
            if (actionType === 'RETURN') status = 'RETURNED';

            await api.put(`/requests/${reqId}/approve`, { status, comment });

            showToast(
                `Special Request #${reqId} ${status.toLowerCase()} successfully`,
                actionType === 'APPROVE' ? 'success' : 'info'
            );
            handleCloseModal();
            loadRequests(); // Refresh to update counts
        } catch (error) {
            console.error(error);
            showToast(`Failed to process request. Please try again.`, 'error');
        }
    };

    const handleCloseModal = () => {
        setSelectedRequest(null);
        setActionType(null);
    };

    // Derived State
    const pendingSpecialRequests = requests.filter(r => r.is_special && r.status === 'PENDING_CEO' as RequestStatus);

    // Count approvals done by CEO (approver_id matching current user, or just looking at role === 'CEO' in approvals)
    // Since we don't have current user ID easily available here without context, checking approvals role is best.
    const approvedByCEO = requests.filter(r => r.is_special && r.approvals?.some(a => a.role === 'CEO' && a.status === 'APPROVED'));
    const rejectedByCEO = requests.filter(r => r.is_special && r.approvals?.some(a => a.role === 'CEO' && a.status === 'REJECTED'));

    const truncateText = (text: string | null | undefined, max: number) => {
        if (!text) return '-';
        return text.length > max ? text.substring(0, max) + '...' : text;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-12 px-3 sm:px-0">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CEO Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1">Overview and actions for Special Transport Requests.</p>
            </div>

            {/* Executive Summary Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Pending Approval</p>
                        <h3 className="text-3xl font-black text-amber-900 tracking-tight">{loading ? '-' : pendingSpecialRequests.length}</h3>
                    </div>
                    <div className="w-12 h-12 bg-amber-200/50 rounded-full flex items-center justify-center text-amber-600">
                        <Clock size={24} />
                    </div>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Approved Requests</p>
                        <h3 className="text-3xl font-black text-emerald-900 tracking-tight">{loading ? '-' : approvedByCEO.length}</h3>
                    </div>
                    <div className="w-12 h-12 bg-emerald-200/50 rounded-full flex items-center justify-center text-emerald-600">
                        <CheckCircle size={24} />
                    </div>
                </div>

                <div className="bg-red-50 rounded-2xl p-6 border border-red-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-red-700 uppercase tracking-widest mb-1">Rejected Requests</p>
                        <h3 className="text-3xl font-black text-red-900 tracking-tight">{loading ? '-' : rejectedByCEO.length}</h3>
                    </div>
                    <div className="w-12 h-12 bg-red-200/50 rounded-full flex items-center justify-center text-red-600">
                        <XCircle size={24} />
                    </div>
                </div>
            </div>

            {/* Pending Approvals Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-500" />
                        Special Requests Awaiting Approval
                    </h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Loading requests...</div>
                ) : pendingSpecialRequests.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <CheckCircle size={40} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-medium">No pending special requests at the moment.</p>
                    </div>
                ) : (
                    <>
                        <div className="md:hidden p-3 space-y-3 bg-slate-50/40">
                            {pendingSpecialRequests.map(req => (
                                <article key={req.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-mono text-xs font-semibold text-slate-500">#{req.id}</p>
                                            <h3 className="text-sm font-bold text-slate-900 mt-1">{req.project_name || '-'}</h3>
                                            <p className="text-xs text-slate-500 mt-1">{new Date(req.submitted_at).toLocaleDateString()}</p>
                                        </div>
                                        <span className="inline-flex px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide border bg-amber-100 text-amber-700 border-amber-200">
                                            Pending CEO
                                        </span>
                                    </div>

                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Raised By</p>
                                            <p className="font-semibold text-slate-900">{req.requester?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Division</p>
                                            <span className="mt-1 inline-flex px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 whitespace-nowrap">
                                                {req.division?.name || '-'} {req.sub_division ? `/ ${req.sub_division}` : ''}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purpose</p>
                                            <p className="text-slate-700">{req.passengerDetails?.reason || req.materialDetails?.reason || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Justification</p>
                                            <p className="text-sm text-amber-900 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100 italic">
                                                "{truncateText(req.special_justification, 120)}"
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => navigate(`/requests/${req.id}`)}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"
                                        >
                                            <Eye size={16} />
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal(req, 'APPROVE')}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
                                        >
                                            <CheckCircle size={16} />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal(req, 'REJECT')}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                                        >
                                            <XCircle size={16} />
                                            Reject
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                        <th className="px-6 py-3">ID</th>
                                        <th className="px-6 py-3">Raised By</th>
                                        <th className="px-6 py-3">Division</th>
                                        <th className="px-6 py-3">Project / Purpose</th>
                                        <th className="px-6 py-3 w-1/4">Justification Preview</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {pendingSpecialRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">#{req.id}</td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-900">{req.requester?.name}</p>
                                                <p className="text-xs text-slate-500">{new Date(req.submitted_at).toLocaleDateString()}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 whitespace-nowrap">
                                                    {req.division?.name || '-'}
                                                    {req.sub_division && <span className="text-slate-400 mx-1">/</span>}
                                                    {req.sub_division}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-800 text-xs truncate max-w-[200px]" title={req.project_name}>
                                                    {req.project_name || '-'}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]" title={req.passengerDetails?.reason || req.materialDetails?.reason}>
                                                    {req.passengerDetails?.reason || req.materialDetails?.reason || '-'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="relative group/tooltip">
                                                    <p className="text-xs text-amber-900 bg-amber-50 px-2 py-1.5 rounded border border-amber-100 italic">
                                                        "{truncateText(req.special_justification, 60)}"
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => navigate(`/requests/${req.id}`)}
                                                        className="inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenModal(req, 'APPROVE')}
                                                        className="inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenModal(req, 'REJECT')}
                                                        className="inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                        title="Reject"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <ApprovalActionModal
                isOpen={!!selectedRequest}
                onClose={handleCloseModal}
                request={selectedRequest}
                actionType={actionType}
                onConfirm={handleConfirmAction}
            />
        </div>
    );
};

export default CEODashboard;
