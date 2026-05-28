import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, Calendar, CheckCircle, Clock, MapPin, GitMerge, Users, ChevronDown, ChevronUp, Eye, ArrowRight, User, Package, X, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { VehicleRequest } from '../types';
import AllocationModal from '../components/transport/AllocationModal';
import { useGoogleMaps } from '../context/GoogleMapsContext';

type AllocatedTripCard = {
    tripKey: string;
    tripId: number | null;
    tripStatus: string;
    isMerged: boolean;
    date: string;
    startTime: string;
    startPlace: string;
    requests: VehicleRequest[];
    totalPassengers: number;
    vehicleNumber: string;
    driverName: string;
};

type TripStop = {
    label: string;
};

const StatCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-shadow duration-300 relative overflow-hidden h-full"
    >
        <div className="relative z-10">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-bold mt-1 text-slate-800 tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color} relative z-10`}>
            {icon}
        </div>
    </motion.div>
);

const TransportDashboard = () => {
    const navigate = useNavigate();
    const { isLoaded: isGoogleMapsLoaded } = useGoogleMaps();
    const [stats, setStats] = useState({
        pendingAllocation: 0,
        activeTrips: 0,
        completedToday: 0,
        totalVehicles: 0
    });
    const [recentRequests, setRecentRequests] = useState<any[]>([]);
    const [allocatedTrips, setAllocatedTrips] = useState<AllocatedTripCard[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state (kept for edit-allocation in active list)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequests, setSelectedRequests] = useState<VehicleRequest[]>([]);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editInitialData, setEditInitialData] = useState<{
        vehicleTypeId?: number;
        vehicleId?: number;
        driverId?: number;
    }>({});

    // Group State
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [expandedAllocatedTrips, setExpandedAllocatedTrips] = useState<Set<string>>(new Set());
    const [tripDetailOpen, setTripDetailOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<AllocatedTripCard | null>(null);
    const [resolvedPlaces, setResolvedPlaces] = useState<Record<number, { pickup?: string; drop?: string }>>({});

    const getRequestDate = (req: VehicleRequest) => req.passengerDetails?.date || req.materialDetails?.date || '';
    const getRequestTime = (req: VehicleRequest) => req.passengerDetails?.time || req.materialDetails?.time || '00:00';
    const getPassengerCount = (req: VehicleRequest) => req.passengerDetails?.no_of_passengers || 0;
    const getRequesterName = (req: VehicleRequest) => req.requester?.name || req.project_name || `Request #${req.id}`;
    const getDivisionName = (req: VehicleRequest) => req.division?.name || 'N/A';
    const getPickupCoords = (req: VehicleRequest) => {
        const p: any = req.passengerDetails as any;
        if (p?.pickup_lat != null && p?.pickup_lng != null) {
            return { lat: Number(p.pickup_lat), lng: Number(p.pickup_lng) };
        }
        if (p?.pickup_coordinates?.lat != null && p?.pickup_coordinates?.lng != null) {
            return { lat: Number(p.pickup_coordinates.lat), lng: Number(p.pickup_coordinates.lng) };
        }

        const m: any = req.materialDetails as any;
        if (m?.pickup_coordinates?.lat != null && m?.pickup_coordinates?.lng != null) {
            return { lat: Number(m.pickup_coordinates.lat), lng: Number(m.pickup_coordinates.lng) };
        }
        return null;
    };
    const getDropCoords = (req: VehicleRequest) => {
        const p: any = req.passengerDetails as any;
        if (p?.drop_lat != null && p?.drop_lng != null) {
            return { lat: Number(p.drop_lat), lng: Number(p.drop_lng) };
        }
        if (p?.drop_coordinates?.lat != null && p?.drop_coordinates?.lng != null) {
            return { lat: Number(p.drop_coordinates.lat), lng: Number(p.drop_coordinates.lng) };
        }

        const m: any = req.materialDetails as any;
        if (m?.drop_coordinates?.lat != null && m?.drop_coordinates?.lng != null) {
            return { lat: Number(m.drop_coordinates.lat), lng: Number(m.drop_coordinates.lng) };
        }
        return null;
    };
    const getPickupLocation = (req: VehicleRequest) => {
        const resolved = resolvedPlaces[req.id]?.pickup;
        if (resolved) return resolved;
        const p: any = req.passengerDetails as any;
        const m: any = req.materialDetails as any;
        return p?.pickup_coordinates?.address || p?.pickup_location || m?.pickup_coordinates?.address || m?.pickup_location_1 || '-';
    };
    const getDropLocation = (req: VehicleRequest) => {
        const resolved = resolvedPlaces[req.id]?.drop;
        if (resolved) return resolved;
        const p: any = req.passengerDetails as any;
        const m: any = req.materialDetails as any;
        return p?.drop_coordinates?.address || p?.drop_location || m?.drop_coordinates?.address || m?.drop_location_1 || '-';
    };
    const parseTimeToMinutes = (value?: string) => {
        if (!value) return null;
        const safe = value.slice(0, 5);
        const [hStr, mStr] = safe.split(':');
        const h = Number(hStr);
        const m = Number(mStr);
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        return (h * 60) + m;
    };
    const formatMinutesToTime = (minutes: number) => {
        const normalized = ((minutes % 1440) + 1440) % 1440;
        const h = Math.floor(normalized / 60);
        const m = normalized % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    const getRequestStops = (req: VehicleRequest): TripStop[] => {
        if (req.request_type === 'PASSENGER') {
            const p = req.passengerDetails;
            if (!p) return [];
            const stops: TripStop[] = [];
            if (p.pickup_location) stops.push({ label: `Pickup: ${p.pickup_location}` });
            if (Array.isArray(p.stops)) {
                p.stops.filter(Boolean).forEach((s) => stops.push({ label: `Stop: ${s}` }));
            }
            if (p.drop_location) stops.push({ label: `Destination: ${p.drop_location}` });
            return stops;
        }

        const m = req.materialDetails;
        if (!m) return [];
        const stops: TripStop[] = [];
        if (m.pickup_location_1) stops.push({ label: `Pickup 1: ${m.pickup_location_1}` });
        if (m.pickup_location_2) stops.push({ label: `Pickup 2: ${m.pickup_location_2}` });
        if (Array.isArray(m.stops)) {
            m.stops.filter(Boolean).forEach((s) => stops.push({ label: `Stop: ${s}` }));
        }
        if (m.drop_location_1) stops.push({ label: `Destination 1: ${m.drop_location_1}` });
        if (m.drop_location_2) stops.push({ label: `Destination 2: ${m.drop_location_2}` });
        return stops;
    };

    const toggleGroup = (groupId: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(groupId)) newSet.delete(groupId);
        else newSet.add(groupId);
        setExpandedGroups(newSet);
    };

    const toggleAllocatedTrip = (tripKey: string) => {
        const newSet = new Set(expandedAllocatedTrips);
        if (newSet.has(tripKey)) newSet.delete(tripKey);
        else newSet.add(tripKey);
        setExpandedAllocatedTrips(newSet);
    };

    const openTripDetails = (trip: AllocatedTripCard) => {
        setSelectedTrip(trip);
        setTripDetailOpen(true);
    };

    const closeTripDetails = () => {
        setTripDetailOpen(false);
        setSelectedTrip(null);
        setResolvedPlaces({});
    };

    useEffect(() => {
        if (!tripDetailOpen || !selectedTrip || !isGoogleMapsLoaded || !window.google?.maps?.Geocoder) return;

        const geocoder = new window.google.maps.Geocoder();
        let cancelled = false;

        const resolveAddress = async (lat: number, lng: number): Promise<string | null> => {
            try {
                const result = await geocoder.geocode({ location: { lat, lng } });
                const first = result.results?.[0];
                return first?.formatted_address || null;
            } catch {
                return null;
            }
        };

        (async () => {
            const updates: Record<number, { pickup?: string; drop?: string }> = {};
            for (const req of selectedTrip.requests) {
                const pickup = getPickupCoords(req);
                const drop = getDropCoords(req);
                const pickupAddr = pickup ? await resolveAddress(pickup.lat, pickup.lng) : null;
                const dropAddr = drop ? await resolveAddress(drop.lat, drop.lng) : null;

                if (pickupAddr || dropAddr) {
                    updates[req.id] = {
                        pickup: pickupAddr || undefined,
                        drop: dropAddr || undefined,
                    };
                }
            }

            if (!cancelled && Object.keys(updates).length > 0) {
                setResolvedPlaces(prev => ({ ...prev, ...updates }));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [tripDetailOpen, selectedTrip, isGoogleMapsLoaded]);

    const openFinalizePage = (reqs: VehicleRequest[]) => {
        const totalPassengers = reqs.reduce((sum, r) => sum + (r.passengerDetails?.no_of_passengers ?? 0), 0);
        navigate('/transport/finalize-allocation', {
            state: {
                group: {
                    requests: reqs,
                    totalPassengers,
                },
                returnTo: '/dashboard',
            },
        });
    };

    const tripNumberLabel = (trip: AllocatedTripCard) => {
        if (trip.tripId != null) return `Trip No. ${trip.tripId}`;
        return `Trip No. ${trip.tripKey.replace(/^(trip-|group-|single-)/, '')}`;
    };

    const handleEditAllocation = async (partialReq: VehicleRequest) => {
        try {
            // Fetch fresh request data to ensure deep properties (like vehicle_type_id) are present
            const res = await api.get(`/requests/${partialReq.id}`);
            const fullReq = res.data;

            setSelectedRequests([fullReq]);
            setIsEditMode(true);
            setEditInitialData({
                vehicleTypeId: fullReq.allocation?.vehicle?.vehicle_type_id,
                vehicleId: fullReq.allocation?.vehicle_id,
                driverId: fullReq.allocation?.driver_id
            });
            setIsModalOpen(true);
        } catch (error) {
            console.error('Failed to prepare edit mode:', error);
            alert('Could not load allocation details. Please try again.');
        }
    };

    const handleEditTripAllocation = async () => {
        if (!selectedTrip || selectedTrip.requests.length === 0) return;
        await handleEditAllocation(selectedTrip.requests[0]);
        closeTripDetails();
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/requests');
            const allRequests: VehicleRequest[] = res.data;

            const pending = allRequests.filter(r => r.status === 'APPROVED').length;
            const activeTripRequests = allRequests.filter(r => r.status === 'ALLOCATED' || r.status === 'ON_GOING');
            const activeTripKeys = new Set(activeTripRequests.map(r => r.trip_id ? `trip-${r.trip_id}` : `single-${r.id}`));
            const completed = allRequests.filter(r => r.status === 'COMPLETED').length;

            setStats({
                pendingAllocation: pending,
                activeTrips: activeTripKeys.size,
                completedToday: completed, // Simplified
                totalVehicles: 15 // Mock number for fleet size
            });

            // Group Pending Requests
            const pendingReqs = allRequests.filter(r => r.status === 'APPROVED');
            const groups: { [key: string]: VehicleRequest[] } = {};
            const singles: VehicleRequest[] = [];

            pendingReqs.forEach(req => {
                if (req.merge_group_id) {
                    if (!groups[req.merge_group_id]) groups[req.merge_group_id] = [];
                    groups[req.merge_group_id].push(req);
                } else {
                    singles.push(req);
                }
            });

            // Combine into a display list
            const displayList: any[] = [];

            // Add Groups
            Object.entries(groups).forEach(([groupId, reqs]) => {
                displayList.push({
                    isGroup: true,
                    groupId,
                    requests: reqs,
                    totalPax: reqs.reduce((sum, r) => sum + (r.passengerDetails?.no_of_passengers || 0), 0),
                    date: reqs[0].passengerDetails?.date // Sort key
                });
            });

            // Add Singles
            singles.forEach(req => {
                displayList.push(req);
            });

            // Sort by Date/ID (Newest first or priority)
            displayList.sort((a, b) => {
                const idA = a.isGroup ? a.requests[0].id : a.id;
                const idB = b.isGroup ? b.requests[0].id : b.id;
                return idB - idA;
            });

            setRecentRequests(displayList.slice(0, 10));

            // Build trip-level cards for active/recent allocations
            const allocatedRequests = allRequests.filter(r =>
                r.status === 'ALLOCATED' || r.status === 'ON_GOING' || r.status === 'COMPLETED'
            );

            const tripGroups = new Map<string, VehicleRequest[]>();
            allocatedRequests.forEach((req) => {
                const key = req.trip_id
                    ? `trip-${req.trip_id}`
                    : req.merge_group_id
                        ? `group-${req.merge_group_id}`
                        : `single-${req.id}`;
                if (!tripGroups.has(key)) tripGroups.set(key, []);
                tripGroups.get(key)!.push(req);
            });

            const tripCards: AllocatedTripCard[] = Array.from(tripGroups.entries()).map(([tripKey, requests]) => {
                const sortedReqs = [...requests].sort((a, b) => {
                    const aDateTime = `${getRequestDate(a)}T${getRequestTime(a)}`;
                    const bDateTime = `${getRequestDate(b)}T${getRequestTime(b)}`;
                    return new Date(aDateTime).getTime() - new Date(bDateTime).getTime();
                });

                const firstReq = sortedReqs[0];
                const allocationSource = sortedReqs.find(r => r.allocation) || firstReq;
                const hasOnGoing = sortedReqs.some(r => r.status === 'ON_GOING');
                const hasAllocated = sortedReqs.some(r => r.status === 'ALLOCATED');
                const earliestRequestMinutes = sortedReqs.reduce((min, req) => {
                    const t = parseTimeToMinutes(getRequestTime(req));
                    if (t == null) return min;
                    return min == null ? t : Math.min(min, t);
                }, null as number | null);
                const tripStartMinutesRaw = parseTimeToMinutes(firstReq.trip?.start_time || '');
                // If stored trip time seems off from request timeline, prefer request timeline.
                const resolvedStartMinutes =
                    earliestRequestMinutes != null && tripStartMinutesRaw != null && Math.abs(tripStartMinutesRaw - earliestRequestMinutes) > 180
                        ? earliestRequestMinutes
                        : (tripStartMinutesRaw ?? earliestRequestMinutes ?? (8 * 60));

                return {
                    tripKey,
                    tripId: firstReq.trip_id ?? null,
                    tripStatus: firstReq.trip?.status || (hasOnGoing ? 'ON_GOING' : hasAllocated ? 'PLANNED' : 'COMPLETED'),
                    isMerged: sortedReqs.length > 1,
                    date: firstReq.trip?.date || getRequestDate(firstReq),
                    startTime: formatMinutesToTime(resolvedStartMinutes),
                    startPlace: getPickupLocation(sortedReqs[0]),
                    requests: sortedReqs,
                    totalPassengers: sortedReqs.reduce((sum, r) => sum + getPassengerCount(r), 0),
                    vehicleNumber: allocationSource.allocation?.vehicle?.vehicle_number || 'N/A',
                    driverName: allocationSource.allocation?.driver?.user?.name || 'N/A',
                };
            }).sort((a, b) => {
                const aDate = new Date(`${a.date || '1970-01-01'}T${a.startTime || '00:00'}`).getTime();
                const bDate = new Date(`${b.date || '1970-01-01'}T${b.startTime || '00:00'}`).getTime();
                return bDate - aDate;
            }).slice(0, 10);

            setAllocatedTrips(tripCards);

        } catch (error) {
            console.error('Failed to fetch transport stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Transport Officer Dashboard</h1>
                    <p className="text-xs text-slate-500 mt-1">Overview of fleet operations and allocations.</p>
                </div>
                <button
                    onClick={() => navigate('/transport/route-optimization')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-semibold text-sm shadow-sm"
                >
                    <Truck size={16} className="text-emerald-400" />
                    Route Optimization
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Pending Allocation"
                    value={stats.pendingAllocation}
                    icon={<Clock size={20} className="text-amber-600" />}
                    color="bg-amber-50"
                />
                <StatCard
                    title="Active Trips"
                    value={stats.activeTrips}
                    icon={<Truck size={20} className="text-blue-600" />}
                    color="bg-blue-50"
                />
                <StatCard
                    title="Completed Jobs"
                    value={stats.completedToday}
                    icon={<CheckCircle size={20} className="text-emerald-600" />}
                    color="bg-emerald-50"
                />
                <StatCard
                    title="Fleet Status"
                    value={`${stats.activeTrips}/${stats.totalVehicles}`}
                    icon={<MapPin size={20} className="text-purple-600" />}
                    color="bg-purple-50"
                />
            </div>

            {/* Awaiting Allocation Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 text-lg">Requests Awaiting Allocation</h2>
                    <span className="text-sm text-slate-500 font-medium">Top Priority Groups</span>
                </div>

                {/* Merged group cards (full-width) */}
                {recentRequests.filter((i: any) => i.isGroup).map((item: any) => {
                    const groupId = item.groupId;
                    const isExpanded = expandedGroups.has(groupId);
                    const firstReq = item.requests[0];

                    return (
                        <div key={groupId} className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
                            {/* Group header */}
                            <div
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-indigo-50/40 transition-colors"
                                onClick={() => toggleGroup(groupId)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                                        <GitMerge size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900 flex flex-wrap items-center gap-2 text-sm">
                                            Merged Trip Group
                                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                                {item.requests.length} requests
                                            </span>
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {item.date || firstReq.passengerDetails?.date || '—'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users size={12} />
                                                {item.totalPax} Passenger{item.totalPax !== 1 ? 's' : ''}
                                            </span>
                                            {firstReq.passengerDetails?.pickup_location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={12} />
                                                    {firstReq.passengerDetails.pickup_location}
                                                    {item.requests.length > 1 && ' + more stops'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={e => { e.stopPropagation(); openFinalizePage(item.requests); }}
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
                                    {item.requests.map((r: any) => (
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
                {recentRequests.some((i: any) => !i.isGroup) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {recentRequests.filter((i: any) => !i.isGroup).map((req: any) => {
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

                {loading && (
                    <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-100">Loading requests...</div>
                )}

                {!loading && recentRequests.length === 0 && (
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

            <AllocationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                requests={selectedRequests}
                onSuccess={fetchData}
                isEditMode={isEditMode}
                initialVehicleTypeId={editInitialData.vehicleTypeId}
                initialVehicleId={editInitialData.vehicleId}
                initialDriverId={editInitialData.driverId}
            />

            {/* Active Allocations Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-bold text-slate-800 text-lg">Active & Recent Allocations</h2>
                    <span className="text-sm text-slate-500 font-medium">Latest Updates</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Loading...</div>
                    ) : allocatedTrips.length > 0 ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-0">
                            {[
                                { title: 'Merged Trips', items: allocatedTrips.filter(t => t.isMerged), icon: <GitMerge size={16} className="text-indigo-600" />, bg: 'bg-indigo-50/50', border: 'border-r border-slate-100' },
                                { title: 'Individual Trips', items: allocatedTrips.filter(t => !t.isMerged), icon: <Truck size={16} className="text-purple-600" />, bg: 'bg-emerald-50/50', border: '' },
                            ].map(section => (
                                <div key={section.title} className={section.border}>
                                    <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between ${section.bg}`}>
                                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">{section.icon}{section.title}</h3>
                                        <span className="text-xs text-slate-500">{section.items.length} items</span>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {section.items.length > 0 ? section.items.map((trip) => {
                                            const isExpanded = expandedAllocatedTrips.has(trip.tripKey);
                                            const badgeStyle =
                                                trip.tripStatus === 'COMPLETED'
                                                    ? 'bg-green-100 text-green-700'
                                                    : trip.tripStatus === 'ON_GOING'
                                                        ? 'bg-orange-100 text-orange-700'
                                                        : 'bg-blue-100 text-blue-700';

                                            return (
                                                <div key={trip.tripKey} className="p-6 hover:bg-slate-50 transition-colors">
                                                    <div
                                                        className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                                                        onClick={() => toggleAllocatedTrip(trip.tripKey)}
                                                    >
                                                        <div className="flex items-start gap-4 min-w-0">
                                                            <div className={`p-3 rounded-xl ${trip.isMerged ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
                                                                {trip.isMerged ? <GitMerge size={20} /> : <Truck size={20} />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    <h4 className="font-semibold text-slate-900">
                                                                        {trip.isMerged ? 'Merged Trip' : 'Individual Trip'}
                                                                    </h4>
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                                                                        {tripNumberLabel(trip)}
                                                                    </span>
                                                                    <span className="px-1.5 py-px rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                                                                        {trip.requests.length} req
                                                                    </span>
                                                                    <span className={`px-1.5 py-px rounded text-[10px] font-bold uppercase ${badgeStyle}`}>
                                                                        {trip.tripStatus}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                                    <span className="flex items-center gap-1"><Calendar size={12} /> {trip.date || '—'}</span>
                                                                    <span className="flex items-center gap-1"><Clock size={12} /> {trip.startTime ? String(trip.startTime).slice(0, 5) : '—'}</span>
                                                                    <span className="flex items-center gap-1 max-w-[220px]"><MapPin size={12} /><span className="truncate" title={trip.startPlace}>Start: {trip.startPlace}</span></span>
                                                                    <span className="flex items-center gap-1"><Users size={12} /> {trip.totalPassengers} pax</span>
                                                                    <span className="flex items-center gap-1"><Truck size={12} /> {trip.vehicleNumber}</span>
                                                                    <span className="flex items-center gap-1"><User size={12} /> {trip.driverName}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button onClick={(e) => { e.stopPropagation(); openTripDetails(trip); }} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap flex items-center gap-2 shadow-sm">
                                                                <Eye size={14} className="text-slate-400" />
                                                                View Trip
                                                            </button>
                                                            {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                                                            {trip.requests.map((req) => (
                                                                <div key={req.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                                    <div className="min-w-0">
                                                                        <div className="font-semibold text-slate-800 truncate">#{req.id} - {getRequesterName(req)}</div>
                                                                        <div className="text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                                                                            <span>{getRequestDate(req) || '-'}</span>
                                                                            <span>{(getRequestTime(req) || '').slice(0, 5) || '-'}</span>
                                                                            <span>{getPassengerCount(req)} pax</span>
                                                                            <span className="truncate">{getPickupLocation(req)}</span>
                                                                            <span>→</span>
                                                                            <span className="truncate">{getDropLocation(req)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <button onClick={() => navigate(`/requests/${req.id}`)} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">View Details</button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }) : (
                                            <div className="p-8 text-center text-slate-400 text-sm">No {section.title.toLowerCase()}.</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                    ) : (
                        <div className="p-8 text-center text-slate-400 text-sm">No active allocations</div>
                    )}
                </div>
            </div>

            {tripDetailOpen && selectedTrip && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-slate-900">
                                        {selectedTrip.isMerged ? 'Merged Trip Details' : 'Trip Details'}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                                        {selectedTrip.requests.length} request(s)
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        selectedTrip.tripStatus === 'COMPLETED'
                                            ? 'bg-green-100 text-green-700'
                                            : selectedTrip.tripStatus === 'ON_GOING'
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {selectedTrip.tripStatus}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                                    <span className="flex items-center gap-1"><Calendar size={12} /> {selectedTrip.date || '-'}</span>
                                    <span className="flex items-center gap-1"><Clock size={12} /> Start {selectedTrip.startTime ? String(selectedTrip.startTime).slice(0, 5) : '-'}</span>
                                    <span className="flex items-center gap-1 max-w-[360px]"><MapPin size={12} /> <span className="truncate" title={selectedTrip.startPlace}>Start Place: {selectedTrip.startPlace}</span></span>
                                    <span className="flex items-center gap-1"><Users size={12} /> {selectedTrip.totalPassengers} pax</span>
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">
                                        <Truck size={12} /> Vehicle: {selectedTrip.vehicleNumber}
                                    </span>
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200">
                                        <User size={12} /> Driver: {selectedTrip.driverName}
                                    </span>
                                </div>
                            </div>
                            <button onClick={closeTripDetails} className="w-9 h-9 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-2">Who Is Joining This Trip</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {selectedTrip.requests.map((member) => (
                                        <div key={`trip-member-${member.id}`} className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                                            <span className="truncate font-medium">{getRequesterName(member)}</span>
                                            <div className="text-right shrink-0">
                                                <div className="text-slate-500">{getDivisionName(member)}</div>
                                                <div className="text-[11px] text-slate-500 mt-0.5 max-w-[220px] truncate" title={getPickupLocation(member)}>
                                                    {getPickupLocation(member)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedTrip.requests.map((req) => {
                                const reqStops = getRequestStops(req);
                                return (
                                    <div key={req.id} className="border border-slate-200 rounded-xl p-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="font-semibold text-slate-900 truncate">#{req.id} - {getRequesterName(req)}</div>
                                                <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
                                                    <span className="flex items-center gap-1"><Clock size={12} /> {String(getRequestTime(req) || '-').slice(0, 5)}</span>
                                                    <span className="flex items-center gap-1"><Users size={12} /> {getPassengerCount(req)} pax</span>
                                                    <span className="flex items-center gap-1"><Building2 size={12} /> {getDivisionName(req)}</span>
                                                    <span className="flex items-center gap-1"><Truck size={12} /> {selectedTrip.vehicleNumber}</span>
                                                    <span className="flex items-center gap-1"><MapPin size={12} /> {getPickupLocation(req)} → {getDropLocation(req)}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/requests/${req.id}`)}
                                                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                            >
                                                View Request
                                            </button>
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 gap-4">
                                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                                                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">Stops & Destination</p>
                                                <ul className="space-y-1">
                                                    {reqStops.length > 0 ? reqStops.map((s, idx) => (
                                                        <li key={`${req.id}-stop-${idx}`} className="text-xs text-slate-700 flex items-start gap-2">
                                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                            <span>{s.label}</span>
                                                        </li>
                                                    )) : (
                                                        <li className="text-xs text-slate-500">No stops available</li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={closeTripDetails}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                Close
                            </button>
                            {(selectedTrip.tripStatus === 'PLANNED' || selectedTrip.tripStatus === 'ON_GOING') && (
                                <button
                                    onClick={handleEditTripAllocation}
                                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                                >
                                    Edit Trip Allocation
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransportDashboard;
