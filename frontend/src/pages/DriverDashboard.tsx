import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Truck, MapPin, Calendar, Clock, Phone, Navigation, CheckCircle, Package, Search, LayoutGrid, Rows3, ArrowRight
} from 'lucide-react';
import { getMyAllocations, updateTripStatus } from '../services/driverService';
import { useNavigate } from 'react-router-dom';
import { RequestStatus, RequestType } from '../types';
import type { Allocation, VehicleRequest } from '../types';

// --- Type Helpers ---
const getRequestDetails = (req: VehicleRequest) => {
    if (req.request_type === RequestType.PASSENGER && req.passengerDetails) {
        return {
            pickup: req.passengerDetails.pickup_location,
            drop: req.passengerDetails.drop_location,
            contact: req.passengerDetails.contact_no,
            person: req.passengerDetails.contact_person_name,
            count: req.passengerDetails.no_of_passengers,
            time: req.passengerDetails.time,
            date: req.passengerDetails.date
        };
    } else if (req.request_type === RequestType.MATERIAL && req.materialDetails) {
        return {
            pickup: req.materialDetails.pickup_location_1,
            drop: req.materialDetails.drop_location_1,
            contact: req.materialDetails.contact_no,
            person: req.materialDetails.contact_person_name,
            count: 'Material Load',
            time: req.materialDetails.time,
            date: req.materialDetails.date
        };
    }
    return null;
};

const openLocationInMaps = (location: string) => {
    const query = encodeURIComponent(location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
};

const openTripRouteInMaps = (request: VehicleRequest) => {
    const isPassenger = request.request_type === RequestType.PASSENGER;
    const pDetails = request.passengerDetails;
    const mDetails = request.materialDetails;

    let origin = '';
    let destination = '';
    let waypoints: string[] = [];

    if (isPassenger && pDetails) {
        origin = pDetails.pickup_location || '';
        destination = pDetails.drop_location || '';
        if (pDetails.stops && pDetails.stops.length > 0) {
            waypoints = [...pDetails.stops];
        }
    } else if (!isPassenger && mDetails) {
        origin = mDetails.pickup_location_1 || '';
        destination = mDetails.drop_location_1 || '';
        if (mDetails.pickup_location_2) waypoints.push(mDetails.pickup_location_2);
        if (mDetails.drop_location_2) waypoints.push(mDetails.drop_location_2);
        if (mDetails.stops && mDetails.stops.length > 0) waypoints.push(...mDetails.stops);
    }

    if (!origin || !destination) return;

    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
    if (waypoints.length > 0) {
        url += `&waypoints=${waypoints.map(w => encodeURIComponent(w)).join('|')}`;
    }
    window.open(url, '_blank');
};

const DriverDashboard: React.FC = () => {
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
        const savedView = localStorage.getItem('driver-portal-view-mode');
        return savedView === 'list' ? 'list' : 'cards';
    });
    const navigate = useNavigate();

    // Auto-refresh interval (e.g., every 30 seconds)
    useEffect(() => {
        fetchAllocations();
        const interval = setInterval(fetchAllocations, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        localStorage.setItem('driver-portal-view-mode', viewMode);
    }, [viewMode]);

    const fetchAllocations = async () => {
        try {
            const data = await getMyAllocations();
            // Sort: Ongoing first, then by date/time
            const sorted = data.sort((a, b) => {
                const statusA = a.request?.status;
                const statusB = b.request?.status;
                if (statusA === RequestStatus.ON_GOING) return -1;
                if (statusB === RequestStatus.ON_GOING) return 1;
                return new Date(a.allocated_at).getTime() - new Date(b.allocated_at).getTime();
            });
            setAllocations(sorted);
        } catch (error) {
            console.error('Failed to fetch allocations', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (requestId: number, newStatus: RequestStatus) => {
        if (actionLoading) return;
        setActionLoading(requestId);
        try {
            await updateTripStatus(requestId, newStatus);
            await fetchAllocations();
        } catch (error) {
            console.error('Failed to update status', error);
            // In a real app, use a toast notification here
            alert('Failed to connect to server. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    // Filter Logic
    const filteredAllocations = allocations.filter(a => {
        if (!searchTerm) return true;
        
        const term = searchTerm.toLowerCase();
        const req = a.request;
        if (!req) return false;
        
        if (req.id.toString().includes(term)) return true;
        
        const details = getRequestDetails(req);
        if (!details) return false;

        return (
            (details.pickup && details.pickup.toLowerCase().includes(term)) ||
            (details.drop && details.drop.toLowerCase().includes(term)) ||
            (details.person && details.person.toLowerCase().includes(term)) ||
            (details.contact && details.contact.toLowerCase().includes(term)) ||
            (details.date && details.date.includes(term)) ||
            (details.time && details.time.includes(term))
        );
    });

    const activeTrip = filteredAllocations.find(a => a.request?.status === RequestStatus.ON_GOING);
    const upcomingTrips = filteredAllocations.filter(a => a.request?.status === RequestStatus.ALLOCATED || a.request?.status === RequestStatus.ACCEPTED);
    const historyTrips = allocations.filter(a => a.request?.status === RequestStatus.COMPLETED);

    const stats = {
        today: allocations.filter(a => {
            const details = a.request ? getRequestDetails(a.request) : null;
            return details?.date === new Date().toISOString().split('T')[0];
        }).length,
        completed: historyTrips.length
    };

    const viewOptions = [
        { id: 'cards' as const, label: 'Cards', icon: LayoutGrid },
        { id: 'list' as const, label: 'List', icon: Rows3 },
    ];

    return (
        <div className="h-full bg-slate-50 relative flex flex-col font-sans">
            {/* --- Top App Bar --- */}
            <header className="bg-slate-900 text-white shrink-0 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Driver Portal</h1>
                        <p className="text-sm text-slate-400 mt-0.5">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-800 p-2.5 sm:p-3 rounded-full border border-slate-700">
                            <Truck size={22} className="text-blue-400" />
                        </div>
                    </div>
                </div>

                {/* Stats Banner */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-5">
                    <div className="flex gap-3 sm:gap-4 md:max-w-md">
                        <div className="flex-1 bg-slate-800/80 rounded-xl p-3 flex sm:flex-col sm:items-start items-center justify-between border border-slate-700/50 shadow-inner">
                            <span className="text-xs sm:text-sm text-slate-400 font-medium">Today's Trips</span>
                            <span className="text-lg sm:text-2xl font-bold text-white mt-1">{stats.today}</span>
                        </div>
                        <div className="flex-1 bg-slate-800/80 rounded-xl p-3 flex sm:flex-col sm:items-start items-center justify-between border border-slate-700/50 shadow-inner">
                            <span className="text-xs sm:text-sm text-slate-400 font-medium">Completed</span>
                            <span className="text-lg sm:text-2xl font-bold text-emerald-400 mt-1">{stats.completed}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- Main Content --- */}
            <main className="flex-1 overflow-auto bg-slate-50/50 w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
                    {/* Loader */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 h-full">
                            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                            <p className="text-sm font-medium">Syncing trips...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="relative w-full lg:max-w-md">
                                    <input
                                        type="text"
                                        placeholder="Search by ID, location, name, mobile, date, time..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm text-sm"
                                    />
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search size={18} className="text-slate-400" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                                    {viewOptions.map((option) => {
                                        const Icon = option.icon;

                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => setViewMode(option.id)}
                                                className={`inline-flex min-h-[42px] items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${viewMode === option.id
                                                    ? 'bg-slate-900 text-white shadow-sm'
                                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                                    }`}
                                                aria-pressed={viewMode === option.id}
                                            >
                                                <Icon size={16} />
                                                <span>{option.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-8">
                            
                            {/* Schedule Section */}
                            <div className="flex-1 space-y-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar className="text-blue-600 hidden md:block" size={20} />
                                    <h2 className="text-lg font-bold text-slate-800 hidden md:block">Active & Upcoming Schedule</h2>
                                </div>
                                <AnimatePresence mode="popLayout">
                                    {/* 1. Active Trip Card (Priority) */}
                                    {activeTrip && activeTrip.request && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mb-6 lg:mb-8"
                                        >
                                            <div className="flex items-center justify-between mb-3 pl-1">
                                                <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                    <span className="relative flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                                    </span>
                                                    Current Trip
                                                </h2>
                                            </div>
                                            <TripCard
                                                allocation={activeTrip}
                                                isActive={true}
                                                onAction={handleStatusUpdate}
                                                loadingId={actionLoading}
                                            />
                                        </motion.div>
                                    )}

                                    {/* 2. Upcoming Trips */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between pl-1">
                                            <h2 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest">
                                                Upcoming Trips
                                            </h2>
                                            <span className="text-xs font-semibold text-slate-400 bg-slate-200 px-2.5 py-1 rounded-full">{upcomingTrips.length}</span>
                                        </div>
                                        {upcomingTrips.length === 0 && !activeTrip ? (
                                            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm">
                                                <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                                <p className="text-base font-semibold text-slate-600">No scheduled trips</p>
                                                <p className="text-sm text-slate-400 mt-1">You're all caught up for now.</p>
                                            </div>
                                        ) : (
                                            viewMode === 'cards' ? (
                                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                    {upcomingTrips.map(alloc => (
                                                        <TripCard
                                                            key={alloc.id}
                                                            allocation={alloc}
                                                            onAction={handleStatusUpdate}
                                                            loadingId={actionLoading}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {upcomingTrips.map(alloc => (
                                                        <TripListItem
                                                            key={alloc.id}
                                                            allocation={alloc}
                                                            onAction={handleStatusUpdate}
                                                            loadingId={actionLoading}
                                                        />
                                                    ))}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </AnimatePresence>
                            </div>

                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* --- Bottom Navigation Bar For Mobile --- */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-40 pb-safe">
                <div className="flex">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 transition-all text-blue-600 bg-blue-50/50`}
                    >
                        <Calendar size={22} strokeWidth={2.5} />
                        <span className="text-[11px] font-bold">Schedule</span>
                    </button>
                    <button
                        onClick={() => navigate('/driver/history')}
                        className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 transition-all text-slate-400 hover:text-slate-600 hover:bg-slate-50`}
                    >
                        <Clock size={22} strokeWidth={2} />
                        <span className="text-[11px] font-bold">History</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Sub-Components ---

const SliderButton = ({ onComplete, disabled }: { onComplete: () => void, disabled: boolean }) => {
    const [val, setVal] = useState(0);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVal(Number(e.target.value));
    };

    const handleRelease = () => {
        if (val >= 90) {
            setVal(100);
            onComplete();
        } else {
            setVal(0);
        }
    };

    return (
        <div className="relative w-full h-12 bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center touch-none">
            <span className="absolute w-full text-center text-slate-400 font-bold text-xs uppercase tracking-widest pointer-events-none select-none sm:hidden">
                Slide to Complete
            </span>
            <div 
                className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all pointer-events-none"
                style={{ width: `${val}%` }}
            />
            <input 
                type="range"
                min="0"
                max="100"
                value={val}
                onChange={handleChange}
                onTouchEnd={handleRelease}
                onMouseUp={handleRelease}
                disabled={disabled}
                className="absolute w-full h-full opacity-0 cursor-pointer sm:hidden"
            />
            <div 
                className="absolute h-10 w-12 bg-white rounded-lg shadow-sm flex items-center justify-center top-1 transition-all pointer-events-none sm:hidden z-10"
                style={{ left: `calc(${val}% - ${val > 50 ? 44 : 4}px)`, marginLeft: val === 0 ? '4px' : '0' }}
            >
                <CheckCircle size={20} className="text-emerald-500" />
            </div>

            {/* Desktop Button strictly for Mouse fallback */}
            <div className="hidden sm:flex absolute inset-0 bg-slate-900 items-center justify-center">
                <button 
                    onClick={onComplete}
                    disabled={disabled}
                    className="w-full h-full text-white font-bold tracking-widest text-sm hover:text-emerald-400 transition-colors flex items-center justify-center gap-2"
                >
                    <CheckCircle size={18} />
                    CLICK TO COMPLETE
                </button>
            </div>
        </div>
    );
};

interface TripCardProps {
    allocation: Allocation;
    isActive?: boolean;
    isHistory?: boolean;
    onAction?: (id: number, status: RequestStatus) => void;
    loadingId?: number | null;
}

const TripCard: React.FC<TripCardProps> = ({ allocation, isActive, isHistory, onAction, loadingId }) => {
    const { request } = allocation;
    if (!request) return null;

    const details = getRequestDetails(request);
    if (!details) return (<div className="p-4 bg-red-50 text-red-500">Invalid Request Data</div>);

    const isPassenger = request.request_type === RequestType.PASSENGER;

    return (
        <div className={`relative bg-white rounded-xl overflow-hidden transition-all ${isActive
            ? 'shadow-lg border-2 border-blue-500 ring-4 ring-blue-500/10'
            : 'shadow-sm border border-slate-200'
            }`}>
            {/* Header: Type & ID */}
            <div className={`px-4 py-2.5 flex justify-between items-center ${isActive ? 'bg-blue-50' : 'bg-slate-50 border-b border-slate-100'}`}>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${isPassenger ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-orange-100 text-orange-700 border-orange-200'
                        }`}>
                        {isPassenger ? 'Passenger' : 'Material'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">#{request.id}</span>
                </div>
                {!isHistory && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <Clock size={12} className="text-slate-400" />
                        {details.time.substring(0, 5)}
                    </div>
                )}
                {isHistory && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        Done
                    </span>
                )}
            </div>

            <div className="p-4">
                {/* Route Visual */}
                <div className="relative pl-4 space-y-6 mb-5">
                    {/* Connecting Line */}
                    <div className="absolute top-2 left-[5px] bottom-4 w-0.5 bg-slate-200"></div>

                    {/* Pickup */}
                    <div className="relative">
                        <div className="absolute -left-[16px] top-1 h-3 w-3 rounded-full border-2 border-blue-500 bg-white shadow-sm z-10"></div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wider">Pickup Location</p>
                            <div className="flex justify-between items-start gap-2">
                                <p className="text-sm font-semibold text-slate-900 leading-tight">{details.pickup}</p>
                                <button
                                    onClick={() => openLocationInMaps(details.pickup)}
                                    className="p-1.5 bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View on Maps"
                                >
                                    <MapPin size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Drop */}
                    <div className="relative">
                        <div className="absolute -left-[16px] top-1 h-3 w-3 rounded-full border-2 border-slate-400 bg-white shadow-sm z-10"></div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wider">Drop Location</p>
                            <div className="flex justify-between items-start gap-2">
                                <p className="text-sm font-semibold text-slate-900 leading-tight">{details.drop}</p>
                                <button
                                    onClick={() => openLocationInMaps(details.drop)}
                                    className="p-1.5 bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View on Maps"
                                >
                                    <MapPin size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button
                    onClick={() => openTripRouteInMaps(request)}
                    className="w-full py-2 mb-5 bg-blue-50/50 hover:bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors border border-blue-100"
                >
                    <MapPin size={16} />
                    View Full Route on Map
                </button>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Contact Person</p>
                        <p className="text-xs font-semibold text-slate-700 truncate">{details.person}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Mobile</p>
                        {details.contact ? (
                            <a href={`tel:${details.contact}`} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline">
                                <Phone size={12} fill="currentColor" />
                                {details.contact}
                            </a>
                        ) : (
                            <span className="text-xs text-slate-400 italic">Not available</span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                {!isHistory && onAction && (
                    <div className="mt-2">
                        {request.status === RequestStatus.COMPLETED ? null : 
                         request.status === RequestStatus.ALLOCATED ? (
                            <button
                                onClick={() => {
                                    if(window.confirm('Are you sure you want to accept this trip?')) {
                                        onAction(request.id, RequestStatus.ACCEPTED as any);
                                    }
                                }}
                                disabled={loadingId === request.id}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold shadow-md shadow-blue-200 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-70 disabled:scale-100"
                            >
                                {loadingId === request.id ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        <span>Accept Trip</span>
                                    </>
                                )}
                            </button>
                        ) : request.status === RequestStatus.ACCEPTED ? (
                            <button
                                onClick={() => onAction(request.id, RequestStatus.ON_GOING)}
                                disabled={loadingId === request.id}
                                className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-70 disabled:scale-100 shadow-md"
                            >
                                {loadingId === request.id ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Navigation size={18} />
                                        <span>Start Trip</span>
                                    </>
                                )}
                            </button>
                        ) : request.status === RequestStatus.ON_GOING ? (
                            loadingId === request.id ? (
                                <div className="w-full py-3 bg-emerald-600 flex items-center justify-center rounded-xl shadow-md">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            ) : (
                                <SliderButton 
                                    onComplete={() => onAction(request.id, RequestStatus.COMPLETED)} 
                                    disabled={loadingId === request.id} 
                                />
                            )
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
};

const TripListItem: React.FC<TripCardProps> = ({ allocation, isActive, isHistory, onAction, loadingId }) => {
    const { request } = allocation;
    if (!request) return null;

    const details = getRequestDetails(request);
    if (!details) return (<div className="p-4 bg-red-50 text-red-500">Invalid Request Data</div>);

    const isPassenger = request.request_type === RequestType.PASSENGER;

    return (
        <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${isActive
            ? 'border-blue-500 ring-2 ring-blue-500/10'
            : 'border-slate-200'
            }`}>
            <div className={`flex flex-col gap-4 p-4 sm:p-5 ${isActive ? 'bg-blue-50/40' : ''}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${isPassenger ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                {isPassenger ? 'Passenger' : 'Material'}
                            </span>
                            <span className="text-xs font-mono text-slate-400">#{request.id}</span>
                            {isActive && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                    Live
                                </span>
                            )}
                            {isHistory && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                    Done
                                </span>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-start gap-2 text-sm text-slate-700">
                                <MapPin size={16} className="mt-0.5 shrink-0 text-blue-500" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-900 break-words">{details.pickup}</p>
                                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                        <ArrowRight size={12} />
                                        <span className="truncate">{details.drop}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Date</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">{details.date}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Time</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">{details.time?.substring(0, 5)}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Contact Person</p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-700">{details.person}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mobile</p>
                        {details.contact ? (
                            <a href={`tel:${details.contact}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline">
                                <Phone size={13} fill="currentColor" />
                                {details.contact}
                            </a>
                        ) : (
                            <span className="mt-1 inline-block text-sm italic text-slate-400">Not available</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                        <button
                            type="button"
                            onClick={() => openLocationInMaps(details.pickup)}
                            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                        >
                            <MapPin size={15} />
                            Pickup
                        </button>
                        <button
                            type="button"
                            onClick={() => openTripRouteInMaps(request)}
                            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                        >
                            <Navigation size={15} />
                            Route
                        </button>
                    </div>
                </div>

                {!isHistory && onAction && (
                    <div>
                        {request.status === RequestStatus.COMPLETED ? null :
                            request.status === RequestStatus.ALLOCATED ? (
                                <button
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to accept this trip?')) {
                                            onAction(request.id, RequestStatus.ACCEPTED as any);
                                        }
                                    }}
                                    disabled={loadingId === request.id}
                                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-200 transition-transform hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70 disabled:scale-100"
                                >
                                    {loadingId === request.id ? 'Updating...' : 'Accept Trip'}
                                </button>
                            ) : request.status === RequestStatus.ACCEPTED ? (
                                <button
                                    onClick={() => onAction(request.id, RequestStatus.ON_GOING)}
                                    disabled={loadingId === request.id}
                                    className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-md transition-transform hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70 disabled:scale-100"
                                >
                                    {loadingId === request.id ? 'Updating...' : 'Start Trip'}
                                </button>
                            ) : request.status === RequestStatus.ON_GOING ? (
                                loadingId === request.id ? (
                                    <div className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3 text-white shadow-md">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    </div>
                                ) : (
                                    <SliderButton
                                        onComplete={() => onAction(request.id, RequestStatus.COMPLETED)}
                                        disabled={loadingId === request.id}
                                    />
                                )
                            ) : null}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverDashboard;
