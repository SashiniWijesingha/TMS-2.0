import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { approveMergeGroup } from '../services/requestService';
import type { VehicleRequest } from '../types';
import { RequestStatus } from '../types';
import { CheckCircle, AlertCircle, GitMerge, Search, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import ApprovalActionModal from '../components/hod/ApprovalActionModal';
import ApprovalRequestCard from '../components/hod/ApprovalRequestCard';
import MergeGroupApprovalCard from '../components/hod/MergeGroupApprovalCard';

const HODApproval = () => {
    const { showToast } = useToast();
    const [requests, setRequests] = useState<VehicleRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State — for individual request action
    const [selectedRequest, setSelectedRequest] = useState<VehicleRequest | null>(null);
    const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);

    // Modal state — for merge group action
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [groupModalAction, setGroupModalAction] = useState<'APPROVE' | 'REJECT' | null>(null);
    const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);

    const loadRequests = useCallback(() => {
        setLoading(true);
        api.get('/requests')
            .then(res => {
                const pending = res.data.filter((r: VehicleRequest) => r.status === RequestStatus.PENDING_HOD);
                setRequests(pending);
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

    // Tactical Search Filtering Logic
    const searchedRequests = requests.filter(r => {
        const query = searchTerm.toLowerCase();
        return (
            r.project_name?.toLowerCase().includes(query) ||
            r.requester?.name?.toLowerCase().includes(query) ||
            r.job_number?.toLowerCase().includes(query) ||
            r.id.toString().includes(query)
        );
    });

    const totalPending = searchedRequests.length;

    // Derive merge groups and individual (ungrouped) requests
    const mergeGroupMap = new Map<string, VehicleRequest[]>();
    const singleRequests: VehicleRequest[] = [];

    for (const r of searchedRequests) {
        if (r.merge_group_id) {
            if (!mergeGroupMap.has(r.merge_group_id)) mergeGroupMap.set(r.merge_group_id, []);
            mergeGroupMap.get(r.merge_group_id)!.push(r);
        } else {
            singleRequests.push(r);
        }
    }

    const mergeGroups = Array.from(mergeGroupMap.entries()).map(([group_id, reqs]) => {
        const totalPax = reqs.reduce((sum, r) => sum + (r.passengerDetails?.no_of_passengers ?? 0), 0);
        const sortedByDate = [...reqs].filter(r => r.passengerDetails).sort((a, b) =>
            (a.passengerDetails!.date + a.passengerDetails!.time).localeCompare(
                b.passengerDetails!.date + b.passengerDetails!.time
            )
        );
        return {
            group_id,
            requests: reqs,
            total_passengers: totalPax,
            earliest_date: sortedByDate[0]?.passengerDetails?.date ?? null,
            earliest_time: sortedByDate[0]?.passengerDetails?.time ?? null,
            status: reqs[0]?.status ?? RequestStatus.PENDING_HOD,
            proposed_vehicle_type_id: reqs[0]?.merge_group_id ? null : null,
            request_count: reqs.length,
            approved_count: 0,
            pending_count: reqs.length,
        };
    });

    const groupModalSyntheticRequest = pendingGroupId ? (mergeGroupMap.get(pendingGroupId)?.[0] ?? null) : null;

    // Individual request handlers
    const handleOpenModal = (req: VehicleRequest, type: 'APPROVE' | 'REJECT') => {
        setSelectedRequest(req);
        setActionType(type);
    };

    const handleConfirmAction = async (comment: string) => {
        if (!selectedRequest || !actionType) return;

        const reqId = selectedRequest.id;
        const previousRequests = [...requests];

        setRequests(prev => prev.filter(r => r.id !== reqId));
        handleCloseModal();

        try {
            const status = actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED';
            await api.put(`/requests/${reqId}/approve`, { status, comment });
            showToast(
                `Request #${reqId} ${actionType === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
                actionType === 'APPROVE' ? 'success' : 'info'
            );
        } catch (error) {
            console.error(error);
            setRequests(previousRequests);
            showToast(`Failed to ${actionType.toLowerCase()} request. Please try again.`, 'error');
        }
    };

    const handleCloseModal = () => {
        setSelectedRequest(null);
        setActionType(null);
    };

    // Merge group handlers
    const handleOpenGroupModal = (groupId: string, action: 'APPROVE' | 'REJECT') => {
        setPendingGroupId(groupId);
        setGroupModalAction(action);
        setGroupModalOpen(true);
    };

    const handleConfirmGroupAction = async (comment: string) => {
        if (!pendingGroupId || !groupModalAction) return;

        const groupId = pendingGroupId;
        const action = groupModalAction;

        // Optimistic: remove all requests in this group from list
        setRequests(prev => prev.filter(r => r.merge_group_id !== groupId));
        setGroupModalOpen(false);
        setPendingGroupId(null);
        setGroupModalAction(null);

        try {
            const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
            await approveMergeGroup(groupId, status, comment);
            showToast(
                `Merged trip group ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
                action === 'APPROVE' ? 'success' : 'info'
            );
        } catch (error) {
            console.error(error);
            loadRequests(); // Reload on failure to restore state
            showToast(`Failed to ${action.toLowerCase()} group. Please try again.`, 'error');
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 px-4">
            <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-black text-[#0f172a] tracking-tight uppercase tracking-widest">Department Approvals</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Review and authorize transport missions.</p>
                </div>
                {totalPending > 0 && (
                    <div className="bg-[#FF5F1F] text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-orange-500/20 border border-[#FF5F1F]/20">
                        <AlertCircle size={14} />
                        {totalPending} Missions Found
                    </div>
                )}
            </div>

            {/* Tactical Search Toolbar */}
            <div className="relative group max-w-md mx-auto xl:mx-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#005C2E] transition-colors" />
                <input
                    type="text"
                    placeholder="Search by Project, Requester, or Job No..."
                    className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#005C2E]/5 focus:border-[#005C2E] transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-red-500"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-40 bg-white rounded-xl shadow-sm border border-slate-100 animate-pulse" />
                    ))}
                </div>
            ) : totalPending === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                    <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-400">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">All Caught Up!</h3>
                    <p className="text-slate-500 mt-1">No pending requests matching your criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                    {/* Merge Groups Section - LEFT */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-violet-50/50 p-4 rounded-3xl border border-violet-100 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-600 rounded-xl text-white shadow-lg shadow-violet-200">
                                    <GitMerge size={18} strokeWidth={3} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-violet-900">
                                        Merged Trip Groups
                                    </h2>
                                    <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">{mergeGroups.length} Batched Missions</p>
                                </div>
                            </div>
                        </div>

                        {mergeGroups.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Batched Missions</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                <AnimatePresence mode="popLayout">
                                    {mergeGroups.map(group => (
                                        <MergeGroupApprovalCard
                                            key={group.group_id}
                                            group={group}
                                            onApproveGroup={(id) => handleOpenGroupModal(id, 'APPROVE')}
                                            onRejectGroup={(id) => handleOpenGroupModal(id, 'REJECT')}
                                            onApproveIndividual={(r) => handleOpenModal(r, 'APPROVE')}
                                            onRejectIndividual={(r) => handleOpenModal(r, 'REJECT')}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Individual Requests Section - RIGHT */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-[#005C2E]/5 p-4 rounded-3xl border border-[#005C2E]/10 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#005C2E] rounded-xl text-white shadow-lg shadow-green-200">
                                    <CheckCircle size={18} strokeWidth={3} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-[#005C2E]">
                                        Individual Requests
                                    </h2>
                                    <p className="text-[10px] font-bold text-[#005C2E]/60 uppercase tracking-widest">{singleRequests.length} Standard Missions</p>
                                </div>
                            </div>
                        </div>

                        {singleRequests.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Individual Missions</p>
                            </div>
                        ) : (
                            <div className="grid gap-5">
                                <AnimatePresence mode="popLayout">
                                    {singleRequests.map(req => (
                                        <ApprovalRequestCard
                                            key={req.id}
                                            request={req}
                                            onApprove={(r) => handleOpenModal(r, 'APPROVE')}
                                            onReject={(r) => handleOpenModal(r, 'REJECT')}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Individual request approval modal */}
            <ApprovalActionModal
                isOpen={!!selectedRequest}
                onClose={handleCloseModal}
                request={selectedRequest}
                actionType={actionType}
                onConfirm={handleConfirmAction}
            />

            {/* Merge group approval modal — reuses same modal with representative request */}
            <ApprovalActionModal
                isOpen={groupModalOpen}
                onClose={() => { setGroupModalOpen(false); setPendingGroupId(null); setGroupModalAction(null); }}
                request={groupModalSyntheticRequest}
                actionType={groupModalAction}
                onConfirm={handleConfirmGroupAction}
            />
        </div>
    );
};

export default HODApproval;
