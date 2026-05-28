import React, { useEffect, useState } from 'react';
import { Clock, Phone, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMyAllocations } from '../services/driverService';
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

const DriverHistory: React.FC = () => {
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAllocations();
        const interval = setInterval(fetchAllocations, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAllocations = async () => {
        try {
            const data = await getMyAllocations();
            setAllocations(data);
        } catch (error) {
            console.error('Failed to fetch allocations', error);
        } finally {
            setLoading(false);
        }
    };

    const historyTrips = allocations.filter(a => a.request?.status === RequestStatus.COMPLETED);
    
    // Sort descending by completion/allocation time
    historyTrips.sort((a, b) => new Date(b.allocated_at).getTime() - new Date(a.allocated_at).getTime());

    return (
        <div className="h-full bg-slate-50 relative flex flex-col font-sans">
            <header className="bg-slate-900 text-white shrink-0 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Recent History</h1>
                        <p className="text-sm text-slate-400 mt-0.5">
                            Completed Trips
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-800 p-2.5 sm:p-3 rounded-full border border-slate-700">
                            <Clock size={22} className="text-emerald-400" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto bg-slate-50/50 w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 h-full">
                            <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"></div>
                            <p className="text-sm font-medium">Syncing history...</p>
                        </div>
                    ) : (
                        <div className="space-y-4 md:max-w-3xl mx-auto">
                            {historyTrips.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                                    <Clock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-slate-500">No completed trips yet.</p>
                                </div>
                            ) : (
                                historyTrips.map(alloc => (
                                    <TripCard
                                        key={alloc.id}
                                        allocation={alloc}
                                        isHistory={true}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* --- Bottom Navigation Bar For Mobile --- */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-40 pb-safe">
                <div className="flex">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 transition-all text-slate-400 hover:text-slate-600 hover:bg-slate-50`}
                    >
                        <Calendar size={22} strokeWidth={2} />
                        <span className="text-[11px] font-bold">Schedule</span>
                    </button>
                    <button
                        onClick={() => navigate('/driver/history')}
                        className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 transition-all text-blue-600 bg-blue-50/50`}
                    >
                        <Clock size={22} strokeWidth={2.5} />
                        <span className="text-[11px] font-bold">History</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

interface TripCardProps {
    allocation: Allocation;
    isHistory?: boolean;
}

const TripCard: React.FC<TripCardProps> = ({ allocation, isHistory }) => {
    const { request } = allocation;
    if (!request) return null;

    const details = getRequestDetails(request);
    if (!details) return (<div className="p-4 bg-red-50 text-red-500">Invalid Request Data</div>);

    const isPassenger = request.request_type === RequestType.PASSENGER;

    const openMap = (location: string) => {
        const query = encodeURIComponent(location);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    return (
        <div className="relative bg-white rounded-xl overflow-hidden transition-all shadow-sm border border-slate-200">
            <div className={`px-4 py-2.5 flex justify-between items-center bg-slate-50 border-b border-slate-100`}>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${isPassenger ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                        {isPassenger ? 'Passenger' : 'Material'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">#{request.id}</span>
                </div>
                {isHistory && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        Completed
                    </span>
                )}
            </div>

            <div className="p-4">
                <div className="relative pl-4 space-y-6 mb-5">
                    <div className="absolute top-2 left-[5px] bottom-4 w-0.5 bg-slate-200"></div>

                    <div className="relative">
                        <div className="absolute -left-[16px] top-1 h-3 w-3 rounded-full border-2 border-blue-500 bg-white shadow-sm z-10"></div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wider">Pickup Location</p>
                            <div className="flex justify-between items-start gap-2">
                                <p className="text-sm font-semibold text-slate-900 leading-tight">{details.pickup}</p>
                                <button
                                    onClick={() => openMap(details.pickup)}
                                    className="p-1.5 bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View on Maps"
                                >
                                    <MapPin size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -left-[16px] top-1 h-3 w-3 rounded-full border-2 border-slate-400 bg-white shadow-sm z-10"></div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wider">Drop Location</p>
                            <div className="flex justify-between items-start gap-2">
                                <p className="text-sm font-semibold text-slate-900 leading-tight">{details.drop}</p>
                                <button
                                    onClick={() => openMap(details.drop)}
                                    className="p-1.5 bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View on Maps"
                                >
                                    <MapPin size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
            </div>
        </div>
    );
};

export default DriverHistory;
