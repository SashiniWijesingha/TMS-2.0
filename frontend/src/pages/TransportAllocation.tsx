import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { VehicleRequest } from '../types';
import { Truck, Calendar, MapPin, ArrowRight, User, Package, GitMerge, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface MergeGroup {
    groupId: string;
    requests: VehicleRequest[];
    totalPax: number;
    date: string;
}

type DisplayItem = ({ isGroup: true } & MergeGroup) | ({ isGroup: false } & VehicleRequest);

const TransportAllocation = () => {
    const navigate = useNavigate();
    const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await api.get('/requests');
            const approved: VehicleRequest[] = res.data.filter((r: VehicleRequest) => r.status === 'APPROVED');

            // Group by merge_group_id
            const groups: Record<string, VehicleRequest[]> = {};
            const singles: VehicleRequest[] = [];
            for (const r of approved) {
                if (r.merge_group_id) {
                    if (!groups[r.merge_group_id]) groups[r.merge_group_id] = [];
                    groups[r.merge_group_id].push(r);
                } else {
                    singles.push(r);
                }
            }

            const items: DisplayItem[] = [];
            for (const [groupId, reqs] of Object.entries(groups)) {
                items.push({
                    isGroup: true,
                    groupId,
                    requests: reqs,
                    totalPax: reqs.reduce((sum, r) => sum + (r.passengerDetails?.no_of_passengers ?? 0), 0),
                    date: reqs[0].passengerDetails?.date ?? '',
                });
            }
            for (const r of singles) {
                items.push({ isGroup: false, ...r });
            }
            // Newest first
            items.sort((a, b) => {
                const idA = a.isGroup ? a.requests[0].id : a.id;
                const idB = b.isGroup ? b.requests[0].id : b.id;
                return idB - idA;
            });
            setDisplayItems(items);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            next.has(groupId) ? next.delete(groupId) : next.add(groupId);
            return next;
        });
    };

    const openFinalizePage = (reqs: VehicleRequest[]) => {
        const totalPassengers = reqs.reduce((sum, r) => sum + (r.passengerDetails?.no_of_passengers ?? 0), 0);
        navigate('/transport/finalize-allocation', {
            state: {
                group: {
                    requests: reqs,
                    totalPassengers,
                },
                returnTo: '/transport/allocations',
            },
        });
    };

    if (loading) return <div className="p-12 text-center text-slate-400">Loading requests...</div>;

    return (
        <div className="desktop-page">
            <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pending Allocations</h1>
                <p className="text-xs text-slate-500 mt-0.5">Approved requests waiting for vehicle and driver assignment.</p>
            </div>

            <div className="space-y-4">
                {/* Merged group cards (full-width) */}
                {displayItems.filter(i => i.isGroup).map(item => {
                    const group = item as { isGroup: true } & MergeGroup;
                    const isExpanded = expandedGroups.has(group.groupId);
                    const firstReq = group.requests[0];

                    return (
                        <div key={group.groupId} className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
                            {/* Group header */}
                            <div
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-indigo-50/40 transition-colors"
                                onClick={() => toggleGroup(group.groupId)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                                        <GitMerge size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900 flex flex-wrap items-center gap-2 text-sm">
                                            Merged Trip Group
                                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                                {group.requests.length} requests
                                            </span>
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {group.date || firstReq.passengerDetails?.date || '—'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users size={12} />
                                                {group.totalPax} Passenger{group.totalPax !== 1 ? 's' : ''}
                                            </span>
                                            {firstReq.passengerDetails?.pickup_location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={12} />
                                                    {firstReq.passengerDetails.pickup_location}
                                                    {group.requests.length > 1 && ' + more stops'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={e => { e.stopPropagation(); openFinalizePage(group.requests); }}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                    >
                                        <GitMerge size={13} />
                                        Allocate Group
                                    </button>
                                    <span className="text-slate-400">
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </span>
                                </div>
                            </div>

                            {/* Expanded sub-request list */}
                            {isExpanded && (
                                <div className="border-t border-indigo-100 bg-indigo-50/30 divide-y divide-indigo-100/60">
                                    {group.requests.map(r => (
                                        <div key={r.id} className="px-6 py-3 flex justify-between items-center text-xs">
                                            <div>
                                                <span className="font-semibold text-slate-800">#{r.id} — {r.project_name}</span>
                                                <div className="text-slate-500 mt-0.5 flex items-center gap-1">
                                                    <MapPin size={10} />
                                                    {r.passengerDetails?.pickup_location} → {r.passengerDetails?.drop_location}
                                                </div>
                                            </div>
                                            <span className="text-slate-500 shrink-0 ml-4">
                                                {r.passengerDetails?.time?.slice(0, 5)} · {r.passengerDetails?.no_of_passengers} pax
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Individual request cards (grid) */}
                {displayItems.some(i => !i.isGroup) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {displayItems.filter(i => !i.isGroup).map(item => {
                            const req = item as { isGroup: false } & VehicleRequest;
                            const isPassenger = req.request_type === 'PASSENGER';
                            const details = isPassenger ? req.passengerDetails : req.materialDetails;

                            return (
                                <div key={req.id} className="desktop-section-card hover:shadow-md transition-shadow group flex flex-col">
                                    <div className="p-4 flex-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${isPassenger ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                {req.request_type}
                                            </div>
                                            <span className="font-mono text-[10px] text-slate-400">#{req.id}</span>
                                        </div>

                                        <h3 className="font-bold text-sm text-slate-900 mb-1 line-clamp-1" title={req.project_name}>
                                            {req.project_name}
                                        </h3>

                                        <div className="space-y-2 mt-3">
                                            <div className="flex items-center text-xs text-slate-600">
                                                <Calendar size={12} className="mr-2 text-slate-400 shrink-0" />
                                                <span className="font-medium">{details?.date}</span>
                                                <span className="mx-1 text-slate-300">|</span>
                                                {details?.time && <span>{details.time.slice(0, 5)}</span>}
                                            </div>
                                            <div className="flex items-center text-xs text-slate-600">
                                                <Truck size={12} className="mr-2 text-slate-400 shrink-0" />
                                                <span className="truncate">{details?.vehicle_type?.toLowerCase() === 'alto' ? 'Sedan' : details?.vehicle_type}</span>
                                            </div>
                                            {isPassenger && (
                                                <div className="flex items-center text-xs text-slate-600">
                                                    <User size={12} className="mr-2 text-slate-400 shrink-0" />
                                                    <span>{req.passengerDetails?.no_of_passengers} Passenger(s)</span>
                                                </div>
                                            )}
                                            {!isPassenger && (
                                                <div className="flex items-center text-xs text-slate-600">
                                                    <Package size={12} className="mr-2 text-slate-400 shrink-0" />
                                                    <span className="truncate">{req.materialDetails?.reason}</span>
                                                </div>
                                            )}
                                            <div className="flex items-start text-xs text-slate-600 pt-1">
                                                <MapPin size={12} className="mr-2 text-slate-400 shrink-0 mt-0.5" />
                                                <div className="space-y-0.5">
                                                    <p className="line-clamp-1" title={isPassenger ? req.passengerDetails?.pickup_location : req.materialDetails?.pickup_location_1}>
                                                        From: {isPassenger ? req.passengerDetails?.pickup_location : req.materialDetails?.pickup_location_1}
                                                    </p>
                                                    <p className="line-clamp-1" title={isPassenger ? req.passengerDetails?.drop_location : req.materialDetails?.drop_location_1}>
                                                        To: {isPassenger ? req.passengerDetails?.drop_location : req.materialDetails?.drop_location_1}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 border-t border-slate-100 bg-slate-50/50 rounded-b-lg">
                                        <button
                                            onClick={() => openFinalizePage([req])}
                                            className="desktop-btn desktop-btn-primary w-full text-xs sm:text-sm"
                                        >
                                            Allocate
                                            <ArrowRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {displayItems.length === 0 && (
                    <div className="py-12 text-center text-slate-500 bg-white rounded-lg border border-slate-200 border-dashed">
                        <div className="flex flex-col items-center gap-3">
                            <div className="p-3 bg-slate-50 rounded-full">
                                <Truck size={24} className="text-slate-300" />
                            </div>
                            <p className="text-sm font-medium">No approved requests waiting for allocation.</p>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default TransportAllocation;
