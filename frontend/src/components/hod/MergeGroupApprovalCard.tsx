import React, { useState } from 'react';
import {
    Users,
    Truck,
    Calendar,
    MapPin,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    XCircle,
    AlertTriangle,
    GitMerge,
    Clock,
    Eye
} from 'lucide-react';
import type { VehicleRequest } from '../../types';
import MergeGroupDetailModal from './MergeGroupDetailModal';

interface MergeGroup {
    group_id: string;
    requests: VehicleRequest[];
    total_passengers: number;
    earliest_date: string | null;
    earliest_time: string | null;
    status: string;
    proposed_vehicle_type_id: number | null;
    request_count: number;
    approved_count: number;
    pending_count: number;
}

interface MergeGroupApprovalCardProps {
    group: MergeGroup;
    onApproveGroup: (groupId: string) => void;
    onRejectGroup: (groupId: string) => void;
    /** If provided, individual requests can still be actioned one-by-one */
    onApproveIndividual?: (req: VehicleRequest) => void;
    onRejectIndividual?: (req: VehicleRequest) => void;
}

const MergeGroupApprovalCard: React.FC<MergeGroupApprovalCardProps> = ({
    group,
    onApproveGroup,
    onRejectGroup,
    onApproveIndividual,
    onRejectIndividual
}) => {
    const [expanded, setExpanded] = useState(false);
    const [showDetail, setShowDetail] = useState(false);

    const shortGroupId = group.group_id.split('-').slice(-2).join('-');

    const getDaysPending = (req: VehicleRequest) => {
        const diff = new Date().getTime() - new Date(req.submitted_at).getTime();
        return Math.floor(diff / (1000 * 3600 * 24));
    };

    const oldestDays = group.requests.length > 0
        ? Math.max(...group.requests.map(getDaysPending))
        : 0;

    const isUrgent = oldestDays > 2;

    return (
        <div className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-all
            ${isUrgent ? 'border-amber-300 shadow-amber-50' : 'border-violet-200 hover:border-violet-300'}`}
        >
            {/* Merge Group Header */}
            <div className="p-4">
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                    {/* Group Info */}
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border bg-violet-50 text-violet-700 border-violet-200">
                                <GitMerge size={10} />
                                Merged Trip
                            </span>
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                #{shortGroupId}
                            </span>
                            <span className="text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded">
                                {group.request_count} requests
                            </span>
                            <span className="text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Users size={10} />
                                {group.total_passengers} total passengers
                            </span>
                            {isUrgent && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                    <AlertTriangle size={10} />
                                    {oldestDays}d old
                                </span>
                            )}
                        </div>

                        {/* Trip schedule summary */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 bg-slate-50/50 p-2 rounded border border-slate-100">
                            {group.earliest_date && (
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={12} className="text-slate-400" />
                                    <span className="font-medium">{group.earliest_date}</span>
                                    {group.earliest_time && (
                                        <span className="text-slate-500 flex items-center gap-1">
                                            <Clock size={10} />
                                            {group.earliest_time}
                                        </span>
                                    )}
                                </div>
                            )}
                            {/* Compact route preview (first 2 legs) */}
                            {group.requests.slice(0, 2).map((r, i) => r.passengerDetails && (
                                <div key={i} className="flex items-center gap-1.5 text-xs">
                                    <MapPin size={11} className="text-violet-400" />
                                    <span className="truncate max-w-[90px] font-medium text-slate-700" title={r.passengerDetails.pickup_location}>
                                        {r.passengerDetails.pickup_location}
                                    </span>
                                    <span className="text-slate-300">→</span>
                                    <span className="truncate max-w-[90px] font-medium text-slate-700" title={r.passengerDetails.drop_location}>
                                        {r.passengerDetails.drop_location}
                                    </span>
                                </div>
                            ))}
                            {group.requests.length > 2 && (
                                <span className="text-[10px] text-slate-400 italic">+{group.requests.length - 2} more stops</span>
                            )}
                        </div>

                        {/* Expand toggle */}
                        <button
                            onClick={() => setExpanded(prev => !prev)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-800 transition-colors mt-1"
                        >
                            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {expanded ? 'Hide' : 'Show'} all {group.request_count} requests
                        </button>
                    </div>

                    {/* Group-level actions */}
                    <div className="flex flex-row md:flex-col items-stretch gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <button
                            onClick={() => setShowDetail(true)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-colors text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                        >
                            <Eye size={14} />
                            View Details
                        </button>
                        <button
                            onClick={() => onApproveGroup(group.group_id)}
                            className="flex-1 md:flex-none px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                        >
                            <CheckCircle size={14} />
                            Approve All
                        </button>
                        <button
                            onClick={() => onRejectGroup(group.group_id)}
                            className="flex-1 md:flex-none px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                        >
                            <XCircle size={14} />
                            Reject All
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded: individual request rows */}
            {expanded && (
                <div className="border-t border-slate-100 bg-slate-50/40 divide-y divide-slate-100">
                    {group.requests.map(r => (
                        <div key={r.id} className="px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-mono text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                    #{r.id}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border
                                    ${r.request_type === 'PASSENGER' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                    {r.request_type === 'PASSENGER' ? <Users size={9} /> : <Truck size={9} />}
                                    {r.request_type}
                                </span>
                                <span className="font-semibold text-slate-700 truncate max-w-[160px]">{r.project_name}</span>
                                <span className="text-slate-500">{r.requester?.name}</span>
                                {r.passengerDetails && (
                                    <span className="flex items-center gap-1 text-slate-600">
                                        <MapPin size={10} className="text-slate-400" />
                                        <span className="truncate max-w-[100px]">{r.passengerDetails.pickup_location}</span>
                                        <span className="text-slate-300">→</span>
                                        <span className="truncate max-w-[100px]">{r.passengerDetails.drop_location}</span>
                                        {r.passengerDetails.has_stops && r.passengerDetails.stops && r.passengerDetails.stops.length > 0 && (
                                            <span className="ml-1 text-[10px] text-violet-500 font-semibold">
                                                +{r.passengerDetails.stops.length} stop{r.passengerDetails.stops.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        <span className="ml-1 text-slate-500">· {r.passengerDetails.no_of_passengers} pax</span>
                                    </span>
                                )}
                            </div>

                            {/* Per-request actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => setShowDetail(true)}
                                    className="p-1.5 rounded bg-violet-50 text-violet-500 hover:bg-violet-100 transition-colors"
                                    title="View full details of this merge group"
                                >
                                    <Eye size={13} />
                                </button>
                                {onApproveIndividual && (
                                    <button
                                        onClick={() => onApproveIndividual(r)}
                                        className="p-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                        title="Approve this request only"
                                    >
                                        <CheckCircle size={13} />
                                    </button>
                                )}
                                {onRejectIndividual && (
                                    <button
                                        onClick={() => onRejectIndividual(r)}
                                        className="p-1.5 rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                        title="Reject this request only"
                                    >
                                        <XCircle size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            <MergeGroupDetailModal
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                group={group}
            />
        </div>
    );
};

export default MergeGroupApprovalCard;
