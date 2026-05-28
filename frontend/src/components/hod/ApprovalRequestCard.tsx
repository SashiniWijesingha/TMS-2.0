import React from 'react';
import {
    Users,
    Truck,
    Calendar,
    MapPin,
    Eye,
    CheckCircle,
    XCircle,
    AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { VehicleRequest } from '../../types';

interface ApprovalRequestCardProps {
    request: VehicleRequest;
    onApprove: (req: VehicleRequest) => void;
    onReject: (req: VehicleRequest) => void;
}

const ApprovalRequestCard: React.FC<ApprovalRequestCardProps> = ({
    request,
    onApprove,
    onReject
}) => {
    const navigate = useNavigate();

    const getDaysPending = (dateStr: string) => {
        const diff = new Date().getTime() - new Date(dateStr).getTime();
        return Math.floor(diff / (1000 * 3600 * 24));
    };

    const daysPending = getDaysPending(request.submitted_at);
    const isUrgent = daysPending > 2;

    return (
        <div
            className={`bg-white rounded-lg shadow-sm border transition-all overflow-hidden group
                ${isUrgent ? 'border-amber-200 shadow-amber-50' : 'border-slate-200 hover:border-slate-300'}`}
        >
            <div className="p-4">
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                    {/* Request Info */}
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">#{request.id}</span>

                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border flex items-center gap-1
                                ${request.request_type === 'PASSENGER' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                {request.request_type === 'PASSENGER' ? <Users size={10} /> : <Truck size={10} />}
                                {request.request_type}
                            </span>

                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium bg-white border border-slate-100 px-1.5 py-0.5 rounded">
                                <Calendar size={10} />
                                {new Date(request.submitted_at).toLocaleDateString()}
                            </span>

                            {isUrgent && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                    <AlertTriangle size={10} />
                                    {daysPending} days ago
                                </span>
                            )}
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-800 leading-tight">{request.project_name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Assigned to <span className="font-semibold text-slate-700">{request.requester?.name || 'Unknown User'}</span>
                                <span className="mx-1.5 opacity-30">•</span>
                                <span className="text-slate-400">
                                    {request.division?.name} {request.sub_division ? `/ ${request.sub_division}` : ''}
                                </span>
                            </p>
                        </div>

                        {/* Details Block Compact */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 bg-slate-50/50 p-2 rounded border border-slate-100">
                            {request.request_type === 'PASSENGER' && request.passengerDetails ? (
                                <>
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={12} className="text-slate-400" />
                                        <span className="font-medium text-slate-700 truncate max-w-[120px]" title={request.passengerDetails.pickup_location}>{request.passengerDetails.pickup_location}</span>
                                        <span className="text-slate-300">→</span>
                                        <span className="font-medium text-slate-700 truncate max-w-[120px]" title={request.passengerDetails.drop_location}>{request.passengerDetails.drop_location}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                                        <Users size={12} className="text-slate-400" />
                                        <span className="font-medium">{request.passengerDetails.no_of_passengers} Pax</span>
                                    </div>
                                </>
                            ) : request.materialDetails ? (
                                <>
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={12} className="text-slate-400" />
                                        <span className="font-medium text-slate-700 truncate max-w-[120px]">{request.materialDetails.pickup_location_1}</span>
                                        <span className="text-slate-300">→</span>
                                        <span className="font-medium text-slate-700 truncate max-w-[120px]">{request.materialDetails.drop_location_1}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                                        <Truck size={12} className="text-slate-400" />
                                        <span className="font-medium">{request.materialDetails.vehicle_type}</span>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row md:flex-col items-stretch gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <div className="flex gap-2">
                            <button
                                onClick={() => onApprove(request)}
                                className="flex-1 md:flex-none px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <CheckCircle size={14} />
                                Approve
                            </button>
                            <button
                                onClick={() => onReject(request)}
                                className="flex-1 md:flex-none px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <XCircle size={14} />
                                Reject
                            </button>
                        </div>
                        <button
                            onClick={() => navigate(`/requests/${request.id}`)}
                            className="w-full px-3 py-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors text-[10px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1"
                        >
                            <Eye size={12} />
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApprovalRequestCard;
