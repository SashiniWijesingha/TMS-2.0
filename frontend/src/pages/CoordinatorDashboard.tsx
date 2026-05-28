import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { VehicleRequest } from '../types';
import {
    Clock, CheckCircle, Truck, Search,
    ChevronRight, AlertOctagon, Check, X, Share2, Filter, GitMerge
} from 'lucide-react';

const CoordinatorDashboard = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<VehicleRequest[]>([]);
    const [stats, setStats] = useState({
        pendingReview: 0,
        hodApproval: 0,
        readyForAllocation: 0,
        returned: 0
    });
    const [activeTab, setActiveTab] = useState<'PENDING' | 'HOD' | 'RETURNED' | 'APPROVED'>('PENDING');

    // Reject Modal State
    const [rejectModal, setRejectModal] = useState<{ open: boolean, requestId: number | null, comment: string }>({
        open: false,
        requestId: null,
        comment: ''
    });

    const [showSharedOnly, setShowSharedOnly] = useState(false);

    const fetchRequests = () => {
        api.get('/requests')
            .then(res => {
                const all = res.data as VehicleRequest[];
                setRequests(all);

                // Calculate Stats
                setStats({
                    pendingReview: all.filter(r => (r.status as string) === 'PENDING_COORDINATOR').length,
                    hodApproval: all.filter(r => (r.status as string) === 'PENDING_HOD').length,
                    readyForAllocation: all.filter(r => (r.status as string) === 'APPROVED' || (r.status as string) === 'ALLOCATED' || (r.status as string) === 'COMPLETED').length,
                    returned: all.filter(r => (r.status as string) === 'RETURNED').length
                });
            })
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleQuickApprove = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm('Submit to HOD for approval?')) return;
        try {
            await api.put(`/requests/${id}/verify`, { status: 'VERIFIED', comment: 'Quick Approved via Dashboard' });
            fetchRequests();
        } catch (error) {
            console.error(error);
            alert('Failed to submit.');
        }
    };

    const openRejectModal = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setRejectModal({ open: true, requestId: id, comment: '' });
    };

    const handleQuickReject = async () => {
        if (!rejectModal.requestId || !rejectModal.comment) {
            alert('Please provide a reason.');
            return;
        }
        try {
            await api.put(`/requests/${rejectModal.requestId}/verify`, { status: 'RETURNED', comment: rejectModal.comment });
            setRejectModal({ open: false, requestId: null, comment: '' });
            fetchRequests();
        } catch (error) {
            console.error(error);
            alert('Failed to reject.');
        }
    };

    const filteredRequests = requests.filter(r => {
        const status = r.status as string;
        switch (activeTab) {
            case 'PENDING': return status === 'PENDING_COORDINATOR';
            case 'HOD': return status === 'PENDING_HOD';
            case 'RETURNED': return status === 'RETURNED';
            case 'APPROVED': return status === 'APPROVED' || status === 'ALLOCATED' || status === 'COMPLETED';
            default: return true;
        }
    }).filter(r => {
        if (showSharedOnly) {
            const details = r.passengerDetails || r.materialDetails;
            return details?.share_vehicle === true;
        }
        return true;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING_COORDINATOR':
                return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100">Review Required</span>;
            case 'PENDING_HOD':
                return <span className="px-2.5 py-1 bg-orange-50 text-[#FF5F1F] rounded-lg text-[10px] font-black uppercase tracking-widest border border-orange-100">HOD Approval</span>;
            case 'APPROVED':
                return <span className="px-2.5 py-1 bg-green-50 text-[#005C2E] rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-100">Approved</span>;
            case 'ALLOCATED':
                return <span className="px-2.5 py-1 bg-green-100 text-[#005C2E] rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-200">Allocated</span>;
            case 'RETURNED':
                return <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-100">Returned</span>;
            case 'COMPLETED':
                return <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">Completed</span>;
            default:
                return <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">{status}</span>;
        }
    };

    const tabs = [
        { id: 'PENDING', label: 'Pending Review', count: stats.pendingReview, icon: <Clock size={14} /> },
        { id: 'HOD', label: 'HOD Approval', count: stats.hodApproval, icon: <CheckCircle size={14} /> },
        { id: 'RETURNED', label: 'Returned', count: stats.returned, icon: <AlertOctagon size={14} /> },
        { id: 'APPROVED', label: 'History', count: stats.readyForAllocation, icon: <Truck size={14} /> },
    ];

    return (
        <div className="desktop-page-compact space-y-4 relative max-w-[1600px]">
            {/* Header */}
            <div className="desktop-toolbar border-b border-slate-200 pb-3 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Coordinator Dashboard</h1>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">Manage and review division vehicle requests.</p>
                </div>
                <button
                    onClick={() => navigate('/coordinator/optimization')}
                    className="desktop-btn bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm shadow-slate-200 border-none"
                >
                    <GitMerge size={16} className="text-blue-400 mr-2" />
                    Route Mapping & Merge
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden min-h-[320px] sm:min-h-[500px] flex flex-col">
                {/* Tabs & Toolbar Combined */}
                <div className="border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center bg-slate-50/50">
                    <div className="flex overflow-x-auto w-full sm:w-auto text-[10px]">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex items-center space-x-2 px-6 py-4 font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap outline-none focus:outline-none
                                    ${activeTab === tab.id
                                        ? 'border-[#005C2E] text-[#005C2E] bg-[#005C2E]/5'
                                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}
                                `}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                                {tab.count > 0 && (
                                    <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black
                                        ${activeTab === tab.id ? 'bg-[#005C2E] text-white shadow-sm' : 'bg-slate-200 text-slate-500'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-2 flex flex-col sm:flex-row gap-2 w-full sm:w-auto border-t sm:border-t-0 border-slate-100">
                        <button
                            onClick={() => setShowSharedOnly(!showSharedOnly)}
                            className={`desktop-btn min-w-0
                            ${showSharedOnly
                                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <Filter size={12} className={showSharedOnly ? 'text-teal-600' : 'text-slate-400'} />
                            {showSharedOnly ? 'Shared Only' : 'Filter Shared'}
                            {showSharedOnly && <X size={12} className="ml-1 text-teal-500" />}
                        </button>

                        <div className="relative flex-grow sm:flex-grow-0">
                            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="desktop-input pl-8 w-full sm:w-48"
                            />
                        </div>
                    </div>
                </div>

                <div className="md:hidden flex-1 p-3 space-y-3 bg-slate-50/40">
                    {filteredRequests.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50"><Search size={20} /></div>
                            <p className="font-medium text-sm">No requests found</p>
                        </div>
                    ) : (
                        filteredRequests.map(req => {
                            const details = req.passengerDetails || req.materialDetails;
                            const date = details?.date || 'N/A';
                            const time = details?.time || 'N/A';
                            const isShared = details?.share_vehicle;
                            const requestDetailText = req.passengerDetails
                                ? `${req.passengerDetails.no_of_passengers} Pax • ${req.passengerDetails.vehicle_type}`
                                : `${req.materialDetails?.vehicle_type} • ${req.materialDetails?.lorry_size || ''}`;

                            return (
                                <article
                                    key={req.id}
                                    onClick={() => {
                                        if ((req.status as string) === 'PENDING_COORDINATOR') {
                                            navigate(`/coordinator/requests/${req.id}/review`);
                                        } else {
                                            navigate(`/requests/${req.id}`);
                                        }
                                    }}
                                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-mono text-xs font-semibold text-slate-500">#{req.id}</p>
                                            <h3 className="text-sm font-bold text-slate-900 mt-1">{req.project_name}</h3>
                                            <p className="text-sm text-slate-500 mt-1">{date} at {time}</p>
                                        </div>
                                        {getStatusBadge(req.status)}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requester</p>
                                            <p className="font-semibold text-slate-800">{req.requester?.name}</p>
                                            <p className="text-slate-500 break-all">{req.requester?.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Request Type</p>
                                            <span className={`mt-1 inline-flex px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase border ${req.request_type === 'PASSENGER' ? 'bg-orange-50 text-[#FF5F1F] border-orange-100' : 'bg-green-50 text-[#005C2E] border-green-100'}`}>
                                                {req.request_type}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trip Details</p>
                                            <p className="font-medium text-slate-700">{requestDetailText}</p>
                                            {isShared && (
                                                <div className="mt-2 space-y-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs uppercase font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                                        <Share2 size={10} /> Pool
                                                    </span>
                                                    {details?.sharing_remarks && (
                                                        <p className="text-xs text-slate-500 italic">"{details.sharing_remarks}"</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                                        {(req.status as string) === 'PENDING_COORDINATOR' ? (
                                            <>
                                                <button
                                                    onClick={(e) => handleQuickApprove(e, req.id)}
                                                    className="desktop-btn desktop-btn-success"
                                                >
                                                    <Check size={16} strokeWidth={3} />
                                                    Approve and Send to HOD
                                                </button>
                                                <button
                                                    onClick={(e) => openRejectModal(e, req.id)}
                                                    className="desktop-btn desktop-btn-danger"
                                                >
                                                    <X size={16} strokeWidth={3} />
                                                    Return Request
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/requests/${req.id}`);
                                                }}
                                                className="desktop-btn desktop-btn-primary"
                                            >
                                                Details
                                                <ChevronRight size={16} />
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>

                {/* Table */}
                <div className="hidden md:block overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider sticky top-0 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Schedule</th>
                                <th className="px-4 py-3">Requester</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3 w-1/3">Details</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs lg:text-sm">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-3 bg-slate-50 rounded-full"><Search size={20} /></div>
                                            <p className="font-medium">No requests found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map(req => {
                                    const details = req.passengerDetails || req.materialDetails;
                                    const date = details?.date || 'N/A';
                                    const time = details?.time || 'N/A';
                                    const isShared = details?.share_vehicle;
                                    const requestDetailText = req.passengerDetails
                                        ? `${req.passengerDetails.no_of_passengers} Pax • ${req.passengerDetails.vehicle_type}`
                                        : `${req.materialDetails?.vehicle_type} • ${req.materialDetails?.lorry_size || ''}`;

                                    return (
                                        <tr key={req.id}
                                            onClick={() => {
                                                if ((req.status as string) === 'PENDING_COORDINATOR') {
                                                    navigate(`/coordinator/requests/${req.id}/review`);
                                                } else {
                                                    navigate(`/requests/${req.id}`);
                                                }
                                            }}
                                            className="hover:bg-blue-50/30 transition-colors group cursor-pointer even:bg-slate-50/30"
                                        >
                                            <td className="px-4 py-3 font-mono font-medium text-slate-500">#{req.id}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-700">{date}</div>
                                                <div className="text-slate-400 text-xs">{time}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-800">{req.requester?.name}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-[160px]">{req.requester?.email}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${req.request_type === 'PASSENGER' ? 'bg-orange-50 text-[#FF5F1F] border-orange-100' : 'bg-green-50 text-[#005C2E] border-green-100'}`}>
                                                    {req.request_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="font-medium text-slate-700">{req.project_name}</span>
                                                    <span className="text-slate-500">{requestDetailText}</span>
                                                    {isShared && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs uppercase font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                                                <Share2 size={10} /> Pool
                                                            </span>
                                                            {details?.sharing_remarks && (
                                                                <span className="text-xs text-slate-400 italic truncate max-w-[150px]">
                                                                    "{details.sharing_remarks}"
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(req.status)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {(req.status as string) === 'PENDING_COORDINATOR' ? (
                                                    <div className="flex justify-end gap-2 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => handleQuickApprove(e, req.id)}
                                                            className="desktop-btn-icon desktop-btn-icon-success"
                                                            title="Approve & Send to HOD"
                                                        >
                                                            <Check size={12} strokeWidth={3} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => openRejectModal(e, req.id)}
                                                            className="desktop-btn-icon desktop-btn-icon-danger"
                                                            title="Reject / Return"
                                                        >
                                                            <X size={12} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/requests/${req.id}`);
                                                        }}
                                                        className="text-slate-300 hover:text-[#005C2E] font-black text-[10px] inline-flex items-center uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        Details
                                                        <ChevronRight size={12} className="ml-0.5" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reject Modal */}
            {rejectModal.open && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl p-5 w-full max-w-sm animate-in fade-in zoom-in duration-200 border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-900 mb-1">Return Request</h3>
                        <p className="text-[11px] text-slate-500 mb-4">Please provide a reason for returning this request to the requester.</p>

                        <textarea
                            className="desktop-input mb-4 p-2.5 text-xs"
                            rows={3}
                            placeholder="Reason for return..."
                            value={rejectModal.comment}
                            onChange={e => setRejectModal({ ...rejectModal, comment: e.target.value })}
                            autoFocus
                        ></textarea>

                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setRejectModal({ open: false, requestId: null, comment: '' })}
                                className="desktop-btn desktop-btn-ghost min-w-0 px-3 py-2 text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleQuickReject}
                                className="desktop-btn desktop-btn-danger min-w-0 px-3 py-2 text-xs"
                            >
                                Return Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoordinatorDashboard;
