import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import type { VehicleRequest } from '../types';
import { RequestStatus, RequestType } from '../types';
import {
    Search, Eye, Trash2, Pencil, XCircle, Plus,
    Calendar, FileText, Truck, User
} from 'lucide-react';

const StatusBadge = ({ status }: { status: RequestStatus }) => {
    const config: Record<string, { color: string; label: string }> = {
        [RequestStatus.PENDING_CEO]: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'CEO Approval' },
        [RequestStatus.PENDING_COORDINATOR]: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending Review' },
        [RequestStatus.PENDING_HOD]: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'HOD Approval' },
        [RequestStatus.APPROVED]: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Approved' },
        [RequestStatus.REJECTED]: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Rejected' },
        [RequestStatus.RETURNED]: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Returned' },
        [RequestStatus.CANCELLED]: { color: 'bg-slate-100 text-slate-500 border-slate-200 line-through', label: 'Cancelled' },
        [RequestStatus.ALLOCATED]: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Confirmed' },
        [RequestStatus.ACCEPTED]: { color: 'bg-sky-100 text-sky-800 border-sky-200', label: 'Accepted' },
        [RequestStatus.ON_GOING]: { color: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse', label: 'On Going' },
        [RequestStatus.COMPLETED]: { color: 'bg-slate-100 text-slate-800 border-slate-200', label: 'Completed' },
    };

    const style = config[status] || { color: 'bg-slate-100 text-slate-600 border-slate-200', label: status.replace(/_/g, ' ') };

    return (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${style.color} inline-flex items-center gap-1.5 shadow-sm`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {style.label}
        </span>
    );
};

const MyRequests = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<VehicleRequest[]>([]);
    const [filter, setFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        api.get('/requests?mine=true')
            .then(res => setRequests(res.data))
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, []);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const matchesSearch =
                req.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.id.toString().includes(searchTerm);

            if (!matchesSearch) return false;

            if (filter === 'ALL') return true;
            if (filter === 'PENDING') return [RequestStatus.PENDING_CEO, RequestStatus.PENDING_COORDINATOR, RequestStatus.PENDING_HOD].includes(req.status as any);
            if (filter === 'ACTIVE') return [RequestStatus.APPROVED, RequestStatus.ALLOCATED, RequestStatus.ON_GOING].includes(req.status as any);
            if (filter === 'COMPLETED') return [RequestStatus.COMPLETED, RequestStatus.REJECTED, RequestStatus.CANCELLED].includes(req.status as any);
            return true;
        });
    }, [requests, filter, searchTerm]);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this request?')) return;
        try {
            await api.delete(`/requests/${id}`);
            setRequests(requests.filter(r => r.id !== id));
        } catch (error) {
            console.error(error);
            alert('Failed to delete request.');
        }
    };

    const handleCancel = async (id: number) => {
        if (!confirm('Are you sure you want to cancel this request?')) return;
        try {
            await api.put(`/requests/${id}/cancel`);
            setRequests(requests.map(r => r.id === id ? { ...r, status: RequestStatus.CANCELLED } : r));
        } catch (error) {
            console.error(error);
            alert('Failed to cancel request.');
        }
    };

    const TABS = [
        { id: 'ALL', label: 'All Requests' },
        { id: 'PENDING', label: 'Pending' },
        { id: 'ACTIVE', label: 'Active / Approved' },
        { id: 'COMPLETED', label: 'Past / Completed' }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Requests</h1>
                    <p className="text-sm text-slate-500 mt-1">Track and manage your vehicle transport requests.</p>
                </div>
                <button
                    onClick={() => navigate('/create-request')}
                    className="bg-[#005C2E] text-white px-6 py-3 rounded-2xl hover:bg-[#004d26] transition-all shadow-lg shadow-green-900/10 text-sm font-black uppercase tracking-widest flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create New Request
                </button>
            </div>

            {/* Controls Section */}
            <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex p-1 bg-slate-100/50 rounded-2xl w-full md:w-auto overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === tab.id
                                ? 'bg-[#005C2E] text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                        type="text"
                        placeholder="Search ID or Project..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-green-900/5 focus:border-[#005C2E] transition-all text-sm font-medium"
                    />
                </div>
            </div>

            {/* List Section */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <th className="px-6 py-4">Request Details</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading requests...</td></tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <FileText size={48} className="mb-4 text-slate-200" />
                                            <p className="text-lg font-medium text-slate-600">No requests found</p>
                                            <p className="text-sm">Try adjusting your search or filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((req, idx) => (
                                    <motion.tr
                                        key={req.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-slate-50/80 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800 text-sm">{req.project_name || 'Untitled Request'}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-slate-500 font-mono">ID: #{req.id}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                                                        {req.division?.name} {req.sub_division ? `/ ${req.sub_division}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${req.request_type === RequestType.PASSENGER
                                                ? 'bg-orange-50 text-[#FF5F1F] border-orange-100'
                                                : 'bg-green-50 text-[#005C2E] border-green-100'
                                                }`}>
                                                {req.request_type === RequestType.PASSENGER ? <User size={13} /> : <Truck size={13} />}
                                                {req.request_type}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                {new Date(req.submitted_at).toLocaleDateString(undefined, {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={req.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => navigate(`/requests/${req.id}`)}
                                                    className="p-2.5 text-slate-400 hover:text-[#005C2E] hover:bg-green-50 rounded-xl transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>

                                                {(req.status === RequestStatus.PENDING_CEO || req.status === RequestStatus.PENDING_COORDINATOR || req.status === RequestStatus.RETURNED) && (
                                                    <>
                                                        <button
                                                            onClick={() => navigate(`/requests/${req.id}/edit`)}
                                                            className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                                            title="Edit"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(req.id)}
                                                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}

                                                {![RequestStatus.COMPLETED, RequestStatus.REJECTED, RequestStatus.CANCELLED].includes(req.status as any) && (
                                                    <button
                                                        onClick={() => handleCancel(req.id)}
                                                        className="p-2.5 text-slate-400 hover:text-[#FF5F1F] hover:bg-orange-50 rounded-xl transition-all"
                                                        title="Cancel"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MyRequests;
