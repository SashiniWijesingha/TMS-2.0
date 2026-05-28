import React, { useState } from 'react';
import { Search, AlertTriangle, X } from 'lucide-react';
import { RequestStatus } from '../../types';
import type { VehicleRequest } from '../../types';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const StatusBadge = ({ status }: { status: RequestStatus }) => {
    const colors: Record<string, string> = {
        [RequestStatus.PENDING_COORDINATOR]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        [RequestStatus.PENDING_HOD]: 'bg-orange-100 text-orange-800 border-orange-200',
        [RequestStatus.APPROVED]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        [RequestStatus.REJECTED]: 'bg-red-100 text-red-800 border-red-200',
        [RequestStatus.RETURNED]: 'bg-purple-100 text-purple-800 border-purple-200',
        [RequestStatus.ALLOCATED]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        [RequestStatus.COMPLETED]: 'bg-slate-200 text-slate-800 border-slate-300',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status.replace('_', ' ')}
        </span>
    );
};

interface RequestManagementProps {
    requests: VehicleRequest[];
    onRefresh: () => void;
}

const RequestManagement: React.FC<RequestManagementProps> = ({ requests, onRefresh }) => {
    const navigate = useNavigate();
    const [requestSearchTerm, setRequestSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    // Override Modal State
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<VehicleRequest | null>(null);
    const [overrideStatus, setOverrideStatus] = useState<RequestStatus | ''>('');

    const handleOverrideSubmit = async () => {
        if (!selectedRequest || !overrideStatus) return;
        if (!confirm(`Are you sure you want to force status change to ${overrideStatus}?\nThis may bypass standard workflows.`)) return;

        try {
            await api.put(`/requests/${selectedRequest.id}`, {
                status: overrideStatus
            });
            alert('Request status overriden successfully.');
            setIsOverrideModalOpen(false);
            onRefresh();
        } catch (error) {
            console.error(error);
            alert('Failed to override request.');
        }
    };

    const filteredRequests = requests.filter(r => {
        const matchesSearch = r.id.toString().includes(requestSearchTerm) ||
            r.project_name?.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
            r.requester?.name?.toLowerCase().includes(requestSearchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-6 rounded-2xl border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <div className="flex gap-4 w-full md:w-auto flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search ID, Project, or Requester..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                            value={requestSearchTerm}
                            onChange={e => setRequestSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-slate-900 outline-none bg-white font-medium text-sm text-slate-700"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">All Statuses</option>
                        {Object.keys(RequestStatus).map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b uppercase text-xs font-semibold text-slate-500">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Requester</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Project</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredRequests.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono font-medium text-slate-900">#{req.id}</td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{req.requester?.name || 'Unknown'}</div>
                                    <div className="text-xs text-slate-400">
                                        {req.division?.name || 'General'}
                                        {req.sub_division && <span className="text-slate-300 mx-1">/</span>}
                                        {req.sub_division}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${req.request_type === 'PASSENGER' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                        {req.request_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{req.project_name}</td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={req.status} />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => navigate(`/requests/${req.id}`)}
                                            className="desktop-btn desktop-btn-ghost min-w-0 px-3 py-2 text-xs"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedRequest(req);
                                                setOverrideStatus(req.status);
                                                setIsOverrideModalOpen(true);
                                            }}
                                            className="desktop-btn desktop-btn-danger min-w-0 px-3 py-2 text-xs"
                                        >
                                            Admin Action
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredRequests.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                    No requests found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Override Modal */}
            {isOverrideModalOpen && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                                <AlertTriangle size={24} />
                                Override Request #{selectedRequest.id}
                            </h2>
                            <button onClick={() => setIsOverrideModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                <strong>Warning:</strong> Forcing a status change may bypass standard approval workflows. Use with caution.
                            </p>

                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Current Status</p>
                                <StatusBadge status={selectedRequest.status} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-1.5">New Status</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white font-medium"
                                    value={overrideStatus}
                                    onChange={e => setOverrideStatus(e.target.value as RequestStatus)}
                                >
                                    {Object.values(RequestStatus).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                                <button
                                    onClick={() => setIsOverrideModalOpen(false)}
                                    className="desktop-btn desktop-btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleOverrideSubmit}
                                    className="desktop-btn desktop-btn-danger-solid flex-1"
                                >
                                    Confirm Override
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestManagement;
