import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    GitMerge,
    Users,
    Truck,
    Calendar,
    Clock,
    MapPin,
    Briefcase,
    Phone,
    Info,
    CheckCircle,
    XCircle,
    AlertCircle,
    Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { VehicleRequest } from '../../types';
import { RequestStatus } from '../../types';

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

interface MergeGroupDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: MergeGroup | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    [RequestStatus.PENDING_HOD]: {
        label: 'Pending HOD',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <AlertCircle size={11} />,
    },
    [RequestStatus.PENDING_CEO]: {
        label: 'Pending CEO',
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: <AlertCircle size={11} />,
    },
    [RequestStatus.APPROVED]: {
        label: 'Approved',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle size={11} />,
    },
    [RequestStatus.REJECTED]: {
        label: 'Rejected',
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: <XCircle size={11} />,
    },
    [RequestStatus.ALLOCATED]: {
        label: 'Allocated',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: <CheckCircle size={11} />,
    },
};

const getStatusBadge = (status: string) => {
    const cfg = statusConfig[status];
    if (!cfg) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold bg-slate-50 text-slate-600 border-slate-200">
            {status}
        </span>
    );
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
        </span>
    );
};

// Builds a sorted display of the route for a single request: pickup → [stops] → drop
const RouteTimeline: React.FC<{ request: VehicleRequest }> = ({ request }) => {
    const pd = request.passengerDetails;
    const md = request.materialDetails;

    if (pd) {
        const stops = pd.has_stops && Array.isArray(pd.stops) && pd.stops.length > 0 ? pd.stops : [];
        const waypoints = [pd.pickup_location, ...stops, pd.drop_location];
        return (
            <div className="flex flex-col gap-1 mt-1.5">
                {waypoints.map((wp, i) => (
                    <div key={i} className="flex items-start gap-2">
                        <div className="flex flex-col items-center shrink-0 mt-0.5">
                            <div className={`w-2 h-2 rounded-full border-2 shrink-0
                                ${i === 0 ? 'bg-emerald-400 border-emerald-500' :
                                  i === waypoints.length - 1 ? 'bg-red-400 border-red-500' :
                                  'bg-violet-300 border-violet-400'}`}
                            />
                            {i < waypoints.length - 1 && (
                                <div className="w-px flex-1 min-h-[10px] bg-slate-200 mt-0.5" />
                            )}
                        </div>
                        <div className="pb-1.5">
                            <p className={`text-xs font-medium leading-tight
                                ${i === 0 ? 'text-emerald-700' :
                                  i === waypoints.length - 1 ? 'text-red-700' :
                                  'text-violet-700'}`}>
                                {wp}
                            </p>
                            {i === 0 && pd.time && (
                                <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                                    <Clock size={9} /> {pd.time}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (md) {
        const waypoints = [md.pickup_location_1, md.pickup_location_2, md.drop_location_1, md.drop_location_2]
            .filter(Boolean) as string[];
        return (
            <div className="flex flex-col gap-1 mt-1.5">
                {waypoints.map((wp, i) => (
                    <div key={i} className="flex items-start gap-2">
                        <div className="flex flex-col items-center shrink-0 mt-0.5">
                            <div className={`w-2 h-2 rounded-full border-2 shrink-0
                                ${i === 0 ? 'bg-emerald-400 border-emerald-500' :
                                  i === waypoints.length - 1 ? 'bg-red-400 border-red-500' :
                                  'bg-violet-300 border-violet-400'}`}
                            />
                            {i < waypoints.length - 1 && (
                                <div className="w-px flex-1 min-h-[10px] bg-slate-200 mt-0.5" />
                            )}
                        </div>
                        <p className="pb-1.5 text-xs font-medium leading-tight text-slate-700">{wp}</p>
                    </div>
                ))}
            </div>
        );
    }

    return <p className="text-[11px] text-slate-400 italic mt-1">No location details</p>;
};

const MergeGroupDetailModal: React.FC<MergeGroupDetailModalProps> = ({ isOpen, onClose, group }) => {
    const navigate = useNavigate();

    if (!isOpen || !group) return null;

    // Sort requests by departure time
    const sortedRequests = [...group.requests].sort((a, b) => {
        const aTime = a.passengerDetails?.time ?? a.materialDetails?.time ?? '99:99';
        const bTime = b.passengerDetails?.time ?? b.materialDetails?.time ?? '99:99';
        return aTime.localeCompare(bTime);
    });

    const shortGroupId = group.group_id.split('-').slice(-2).join('-');
    const totalApproved = group.requests.filter(r => r.status === RequestStatus.APPROVED).length;
    const totalPending = group.requests.filter(r =>
        r.status === RequestStatus.PENDING_HOD || r.status === RequestStatus.PENDING_CEO
    ).length;
    const totalRejected = group.requests.filter(r => r.status === RequestStatus.REJECTED).length;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                />

                {/* Modal Panel */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 16 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90dvh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-slate-50 flex items-start justify-between gap-4 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                                <GitMerge size={18} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                    Merged Trip Group
                                    <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        #{shortGroupId}
                                    </span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {group.request_count} requests · {group.total_passengers} total passengers
                                    {group.earliest_date && (
                                        <> · <span className="font-medium">{group.earliest_date}</span></>
                                    )}
                                    {group.earliest_time && (
                                        <> from <span className="font-medium">{group.earliest_time}</span></>
                                    )}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Status Summary Bar */}
                    <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4 shrink-0 flex-wrap">
                        {totalPending > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                                <AlertCircle size={12} />
                                {totalPending} awaiting decision
                            </span>
                        )}
                        {totalApproved > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle size={12} />
                                {totalApproved} approved
                            </span>
                        )}
                        {totalRejected > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-700">
                                <XCircle size={12} />
                                {totalRejected} rejected
                            </span>
                        )}
                        {totalPending === 0 && totalRejected > 0 && totalApproved > 0 && (
                            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                <AlertCircle size={11} />
                                Partial result — approved requests will be freed for individual allocation
                            </span>
                        )}
                        {totalPending === 0 && totalApproved === group.request_count && (
                            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                <CheckCircle size={11} />
                                Fully approved — ready for vehicle allocation
                            </span>
                        )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                        {sortedRequests.map((r, index) => {
                            const pd = r.passengerDetails;
                            const md = r.materialDetails;
                            const typeLabel = r.request_type === 'PASSENGER' ? 'Passenger' : 'Material';
                            const isPassenger = r.request_type === 'PASSENGER';
                            const date = pd?.date ?? md?.date;
                            const time = pd?.time ?? md?.time;
                            const vehicleType = pd?.vehicle_type ?? md?.vehicle_type;
                            const reason = pd?.reason ?? md?.reason;
                            const contactName = pd?.contact_person_name ?? md?.contact_person_name;
                            const contactNo = pd?.contact_no ?? md?.contact_no;

                            return (
                                <div key={r.id} className="p-4 sm:p-5">
                                    {/* Request header row */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {/* Leg number badge */}
                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-black shrink-0">
                                                {index + 1}
                                            </span>
                                            <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                Req #{r.id}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border
                                                ${isPassenger ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                                {isPassenger ? <Users size={9} /> : <Truck size={9} />}
                                                {typeLabel}
                                            </span>
                                            {getStatusBadge(r.status)}
                                        </div>
                                        <button
                                            onClick={() => { onClose(); navigate(`/requests/${r.id}`); }}
                                            className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                            title="Open full request page"
                                        >
                                            <Eye size={11} />
                                            Full View
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Left: Route timeline */}
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                                <MapPin size={10} /> Route
                                            </p>
                                            <RouteTimeline request={r} />
                                        </div>

                                        {/* Right: Request metadata */}
                                        <div className="space-y-2 text-xs">
                                            {/* Project */}
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                                    <Briefcase size={10} /> Project
                                                </p>
                                                <p className="font-semibold text-slate-800 leading-snug">{r.project_name}</p>
                                                <p className="text-slate-500 text-[11px]">
                                                    <span className="font-mono">{r.job_number}</span>
                                                    {r.division?.name && <> · {r.division.name}</>}
                                                    {r.sub_division && <> / {r.sub_division}</>}
                                                </p>
                                            </div>

                                            {/* Requester */}
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Requested By</p>
                                                <p className="font-medium text-slate-700">{r.requester?.name ?? '—'}</p>
                                            </div>

                                            {/* Schedule */}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {date && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                                                        <Calendar size={10} className="text-slate-400" />
                                                        {date}
                                                    </span>
                                                )}
                                                {time && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                                                        <Clock size={10} className="text-slate-400" />
                                                        {time}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Passengers / Vehicle */}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {pd && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                                                        <Users size={10} className="text-slate-400" />
                                                        {pd.no_of_passengers} passenger{pd.no_of_passengers !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {vehicleType && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                        <Truck size={10} className="text-slate-400" />
                                                        {vehicleType}
                                                    </span>
                                                )}
                                                {pd?.specification && (
                                                    <span className="text-[11px] text-slate-500 italic">({pd.specification})</span>
                                                )}
                                            </div>

                                            {/* Contact */}
                                            {(contactName || contactNo) && (
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                                        <Phone size={10} /> Contact
                                                    </p>
                                                    <p className="text-[11px] text-slate-600">
                                                        {contactName && <span className="font-medium">{contactName}</span>}
                                                        {contactName && contactNo && ' · '}
                                                        {contactNo}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Reason */}
                                            {reason && (
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                                        <Info size={10} /> Purpose
                                                    </p>
                                                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">{reason}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
                        <p className="text-[11px] text-slate-400">
                            Group ID: <span className="font-mono">{group.group_id}</span>
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors shadow-sm"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MergeGroupDetailModal;
