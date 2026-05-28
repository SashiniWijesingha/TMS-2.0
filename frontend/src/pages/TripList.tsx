import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Calendar, Users, ArrowLeft, Trash2, Eye } from 'lucide-react';
import { getTrips, deleteTrip } from '../services/tripService';
import type { Trip } from '../types';

const TripList = () => {
    const navigate = useNavigate();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrips();
    }, []);

    const fetchTrips = async () => {
        try {
            setLoading(true);
            const data = await getTrips();
            setTrips(data);
        } catch (error) {
            console.error('Failed to fetch trips', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this trip? This will NOT cancel the requests, but will remove the grouping.')) return;
        try {
            await deleteTrip(id);
            fetchTrips();
        } catch (error) {
            console.error('Failed to delete trip', error);
            alert('Failed to delete trip');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Trip Management</h1>
                        <p className="text-xs text-slate-500 mt-1">Manage consolidated trips and journeys.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-12 text-center text-slate-400">Loading trips...</div>
                    ) : trips.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">No active trips found.</div>
                    ) : (
                        trips.map((trip) => (
                            <div key={trip.id} className="p-6 hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    {/* Trip ID & Status */}
                                    <div className="min-w-[120px]">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-mono text-sm font-bold text-slate-500">#{trip.id}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${trip.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                trip.status === 'ON_GOING' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                {trip.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            <Calendar size={14} className="text-slate-400" />
                                            <span className="font-medium">{trip.date}</span>
                                            <span className="text-slate-400">|</span>
                                            <span className="font-medium">{trip.start_time}</span>
                                        </div>
                                    </div>

                                    {/* Vehicle & Driver */}
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vehicle</div>
                                            <div className="flex items-center gap-2">
                                                <Truck size={16} className="text-indigo-600" />
                                                <span className="font-bold text-slate-800">
                                                    {/* We assume vehicle details are joined or need to be fetched. 
                                                        For now, displaying ID if object not populated, or number if available. 
                                                        The Type Check might vary based on backend response structure.
                                                     */}
                                                    {(trip as any).vehicle?.vehicle_number || `Vehicle #${trip.vehicle_id}`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Driver</div>
                                            <div className="flex items-center gap-2">
                                                <Users size={16} className="text-indigo-600" />
                                                <span className="font-bold text-slate-800">
                                                    {(trip as any).driver?.user?.name || `Driver #${trip.driver_id}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Request Count & Actions */}
                                    <div className="flex flex-col items-end gap-3 min-w-[150px]">
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-slate-900 leading-none">
                                                {trip.requests?.length || 0}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Requests Linked</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDelete(trip.id)}
                                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                title="Delete Trip grouping"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Linked Requests Summary */}
                                {trip.requests && trip.requests.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Linked Jobs</div>
                                        <div className="flex flex-wrap gap-2">
                                            {trip.requests.map(req => (
                                                <div key={req.id} onClick={() => navigate(`/requests/${req.id}`)} className="cursor-pointer bg-white border border-slate-200 hover:border-indigo-300 text-xs px-2 py-1 rounded flex items-center gap-2 transition-colors">
                                                    <span className="font-mono font-bold text-slate-600">#{req.id}</span>
                                                    <span className="text-slate-800 truncate max-w-[150px]">{req.project_name}</span>
                                                    <Eye size={10} className="text-slate-400" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default TripList;
