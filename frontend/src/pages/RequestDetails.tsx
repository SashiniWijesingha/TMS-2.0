import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { VehicleRequest } from '../types';
import { RequestType, RequestStatus } from '../types';
import {
    ChevronLeft,
    Truck,
    Calendar,
    MapPin,
    Users,
    User,
    FileText,
    XCircle,
    Clock,
    CheckCircle,
    Building2,
    Phone
} from 'lucide-react';
import StatusStepper from '../components/common/StatusStepper';
import { useToast } from '../context/ToastContext';
import ApprovalActionModal from '../components/hod/ApprovalActionModal';

const RequestDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [request, setRequest] = useState<VehicleRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole] = useState<string | null>(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        try {
            const user = JSON.parse(userStr);
            return user && typeof user.role === 'string' ? user.role : null;
        } catch (error) {
            console.error('Failed to parse user from localStorage', error);
            localStorage.removeItem('user');
            return null;
        }
    });

    // Approval Modal State
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'RETURN' | null>(null);

    const fetchRequest = useCallback(() => {
        setLoading(true);
        api.get(`/requests/${id}`)
            .then(res => setRequest(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);


    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel this request?')) return;
        try {
            await api.put(`/requests/${id}/cancel`);
            showToast('Request cancelled successfully', 'success');
            fetchRequest();
        } catch (error) {
            console.error('Cancellation failed', error);
            showToast('Failed to cancel request.', 'error');
        }
    };

    useEffect(() => {
        fetchRequest();
    }, [fetchRequest]);


    const openApprovalModal = (type: 'APPROVE' | 'REJECT' | 'RETURN') => {
        setActionType(type);
        setIsActionModalOpen(true);
    };

    const handleApprovalAction = async (comment: string) => {
        if (!request || !actionType) return;

        try {
            let status = 'APPROVED';
            if (actionType === 'REJECT') status = 'REJECTED';
            if (actionType === 'RETURN') status = 'RETURNED';

            await api.put(`/requests/${request.id}/approve`, { status, comment });

            showToast(
                `Request ${status.toLowerCase()} successfully`,
                actionType === 'APPROVE' ? 'success' : 'info'
            );
            setIsActionModalOpen(false);
            fetchRequest(); // Refresh data
        } catch (error) {
            console.error(error);
            showToast(`Failed to process request.`, 'error');
            throw error; // Re-throw to let modal handle loading state if mapped
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!request) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
            <h2 className="text-lg font-semibold mb-2">Request Not Found</h2>
            <p className="mb-4 text-xs">The vehicle request you are looking for does not exist.</p>
            <button
                onClick={() => navigate('/my-requests')}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
                Back to My Requests
            </button>
        </div>
    );

    const passengerDetails = request.passengerDetails;
    const materialDetails = request.materialDetails;

    // Helper to get status badge styles
    const getStatusBadge = (status: string) => {
        switch (status) {
            case RequestStatus.PENDING_CEO:
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case RequestStatus.PENDING_COORDINATOR:
                return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case RequestStatus.PENDING_HOD:
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case RequestStatus.APPROVED:
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case RequestStatus.REJECTED:
                return 'bg-red-50 text-red-700 border-red-200';
            case RequestStatus.RETURNED:
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case RequestStatus.ALLOCATED:
                return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case RequestStatus.COMPLETED:
                return 'bg-slate-50 text-slate-700 border-slate-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const isPassenger = request.request_type === RequestType.PASSENGER;
    const themeBg = isPassenger ? 'bg-orange-50' : 'bg-green-50';
    const themeBorder = isPassenger ? 'border-orange-100' : 'border-green-100';
    const themeText = isPassenger ? 'text-[#FF5F1F]' : 'text-[#005C2E]';
    const themeShadow = isPassenger ? 'shadow-orange-900/5' : 'shadow-green-900/5';

    return (
        <div className="max-w-5xl mx-auto py-10 px-6 space-y-8 pb-32">
            {/* 1. Centered Page Header */}
            <div className="flex flex-col items-center justify-center text-center space-y-4 mb-2">
                <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-xl shadow-${isPassenger ? 'orange' : 'green'}-900/10 ${isPassenger ? 'bg-gradient-to-br from-[#FF5F1F] to-[#FF8C00]' : 'bg-gradient-to-br from-[#005C2E] to-[#007F41]'}`}>
                    {isPassenger ? <User size={32} className="text-white" /> : <Truck size={32} className="text-white" />}
                </div>
                <div className="space-y-1">
                    <div className="flex flex-col items-center gap-2">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">
                            {isPassenger ? 'Passenger Booking' : 'Material Dispatch'}
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${getStatusBadge(request.status)}`}>
                                {request.status.replace(/_/g, ' ')}
                            </span>
                            {request.is_special && (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 uppercase tracking-widest border border-amber-200">
                                    Special Mission
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-[0.2em]">
                        Reference ID: #{request.id}
                    </p>
                </div>
            </div>

            {/* Visual Stepper */}
            <div className={`bg-white p-8 rounded-[2rem] border ${themeBorder} ${themeShadow} shadow-sm`}>
                <StatusStepper currentStatus={request.status} isSpecial={request.is_special} />
            </div>

            {/* 2. Request Basic Information */}
            <section className={`bg-white rounded-[2rem] shadow-sm border ${themeBorder} ${themeShadow} overflow-hidden relative group transition-all hover:shadow-md`}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${themeBg} flex items-center justify-center`}>
                            <FileText size={15} className={themeText} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Mission Essentials</h3>
                            <p className="text-[11px] text-slate-400 font-medium">Core project and division data</p>
                        </div>
                    </div>
                </div>
                <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Request Type</label>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            {isPassenger ? <Users size={14} className="text-orange-500" /> : <Truck size={14} className="text-green-600" />}
                            {request.request_type}
                        </p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Scheduled Date & Time</label>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            {isPassenger
                                ? `${formatDate(passengerDetails?.date)} @ ${passengerDetails?.time}`
                                : `${formatDate(materialDetails?.date)} @ ${materialDetails?.time}`
                            }
                        </p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mission Category</label>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                            {isPassenger ? (passengerDetails as any).subType || 'Standard' : (materialDetails as any).subType || 'Standard'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">WBS / GL Code</label>
                        <p className="text-sm font-mono font-black text-slate-900">{request.job_number}</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Project Assignment</label>
                        <p className="text-sm font-bold text-slate-900 truncate" title={request.project_name}>{request.project_name}</p>
                    </div>
                    {isPassenger && passengerDetails?.cost_centre && (
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cost Centre</label>
                            <p className="text-sm font-mono font-bold text-slate-900">{passengerDetails.cost_centre}</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Main Division</label>
                        <p className="text-sm font-bold text-slate-900">{request.division?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sub Division</label>
                        <p className="text-sm font-bold text-slate-900">{request.sub_division || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Requested By</label>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                                {request.requester?.name?.charAt(0)}
                            </div>
                            <p className="text-sm font-bold text-slate-900 truncate">{request.requester?.name || 'Unknown'}</p>
                        </div>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4 mt-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reason for Request</label>
                            <p className="text-sm text-slate-600 font-medium italic leading-relaxed">
                                {isPassenger ? passengerDetails?.reason : materialDetails?.reason}
                            </p>
                        </div>
                        {(isPassenger ? passengerDetails?.distance : materialDetails?.distance) && (
                            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center min-w-[120px]">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Distance</span>
                                <p className="text-sm font-black text-slate-900">{(isPassenger ? passengerDetails?.distance : materialDetails?.distance)} km</p>
                            </div>
                        )}
                    </div>
                    {request.is_special && (
                        <div className="sm:col-span-2 lg:col-span-4 bg-amber-50/50 border border-amber-100 p-5 rounded-2xl">
                            <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2">Special Justification</label>
                            <p className="text-sm text-amber-900 font-bold leading-relaxed">
                                {request.special_justification || 'No justification provided.'}
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* 3. Operational Details */}
            <section className={`bg-white rounded-[2rem] shadow-sm border ${themeBorder} ${themeShadow} overflow-hidden relative group transition-all hover:shadow-md`}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${themeBg} flex items-center justify-center`}>
                            {isPassenger ? <Users size={15} className={themeText} /> : <Truck size={15} className={themeText} />}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Operational Particulars</h3>
                            <p className="text-[11px] text-slate-400 font-medium">Service configuration and requirements</p>
                        </div>
                    </div>
                </div>
                <div className="p-8">
                    {isPassenger && passengerDetails && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-8">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Passenger Count</label>
                                    <p className="text-lg font-black text-slate-900">{passengerDetails.no_of_passengers}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Trip Duration</label>
                                    <p className="text-lg font-black text-slate-900">{passengerDetails.no_of_days} Day(s)</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vehicle Type</label>
                                    <p className="text-sm font-bold text-slate-900 uppercase leading-none">{passengerDetails.vehicle_type}</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{passengerDetails.specification || 'Standard Class'}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Requestor EPF</label>
                                    <p className="text-sm font-mono font-black text-slate-900">{passengerDetails.epf_no || '-'}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Booking Type</label>
                                    <p className={`text-[10px] font-black uppercase tracking-[0.12em] px-2 py-1.5 rounded-lg border text-center ${passengerDetails.return_trip ? 'bg-[#FF5F1F]/10 text-[#FF5F1F] border-[#FF5F1F]/20' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                        {passengerDetails.return_trip ? 'Round Trip' : 'One Way'}
                                    </p>
                                </div>
                            </div>

                            {/* Remarks Section (Sharing Remarks / Extras) */}
                            {passengerDetails.sharing_remarks && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Additional Remarks</label>
                                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                        "{passengerDetails.sharing_remarks}"
                                    </p>
                                </div>
                            )}

                            {/* Contact Person Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">On-Ground Contact</p>
                                        <p className="text-sm font-bold text-slate-900">{passengerDetails.contact_person_name}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                        <Phone size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Number</p>
                                        <p className="text-sm font-mono font-bold text-slate-900">{passengerDetails.contact_no}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Passenger List */}
                            {passengerDetails.passenger_list && passengerDetails.passenger_list.length > 0 && (
                                <div className="space-y-4 pt-6 border-t border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Users size={12} className="text-[#FF5F1F]" /> Travel Manifest
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {passengerDetails.passenger_list.map((p, idx) => (
                                            <div key={idx} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                                                        {idx + 2}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-900 uppercase">{p.name}</p>
                                                        <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">EPF: {p.epf_no}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin size={12} /> Deployment Origin
                                    </label>
                                    <div className="p-4 bg-orange-50/30 rounded-2xl border border-orange-100/50">
                                        <p className="text-sm font-bold text-slate-900">{passengerDetails.pickup_location}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin size={12} /> Target Destination
                                    </label>
                                    <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                                        <p className="text-sm font-bold text-slate-900">{passengerDetails.drop_location}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {passengerDetails.has_stops && passengerDetails.stops && passengerDetails.stops.length > 0 && (
                                <div className="pt-6 border-t border-slate-100">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">
                                        Operational Waypoints
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {passengerDetails.stops.map((stop, index) => (
                                            <span key={index} className="px-4 py-2 bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 flex items-center gap-2">
                                                <MapPin size={12} className="text-slate-400" />
                                                {stop}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!isPassenger && materialDetails && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vehicle Configuration</label>
                                    <p className="text-sm font-black text-slate-900 uppercase">{materialDetails.vehicle_type}</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{materialDetails.lorry_size || materialDetails.crane_weight || 'Standard Service'}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Technical Specs</label>
                                    <div className="text-[10px] font-black text-slate-900 space-y-1 uppercase tracking-wider">
                                        {materialDetails.arm_capacity && <p>Arm: {materialDetails.arm_capacity}</p>}
                                        {materialDetails.man_bucket_height && <p>Height: {materialDetails.man_bucket_height}</p>}
                                        {materialDetails.lorry_type && <p>Type: {materialDetails.lorry_type}</p>}
                                        {materialDetails.is_open_lorry && <p className="text-orange-600">Open Body Lorry</p>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Manifest Particulars</label>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ground Support:</span>
                                            <span className="text-[10px] font-black text-green-700">{materialDetails.no_of_labours}</span>
                                        </div>
                                        {materialDetails.return_materials && (
                                            <div className="flex justify-between items-center bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Return Load:</span>
                                                <span className="text-[10px] font-black text-blue-700 font-mono">YES</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Requestor EPF</label>
                                    <p className="text-sm font-mono font-black text-slate-900">{materialDetails.epf_no || '-'}</p>
                                </div>
                            </div>

                            {/* Contact Person Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logistics Contact</p>
                                        <p className="text-sm font-bold text-slate-900">{materialDetails.contact_person_name}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <Phone size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Number</p>
                                        <p className="text-sm font-mono font-bold text-slate-900">{materialDetails.contact_no}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin size={12} /> Logistics Origin Points
                                    </label>
                                    <div className="space-y-2">
                                        <div className="p-3 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                                            <p className="text-[11px] font-bold text-slate-900">{materialDetails.pickup_location_1}</p>
                                        </div>
                                        {materialDetails.pickup_location_2 && (
                                            <div className="p-3 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                                                <p className="text-[11px] font-bold text-slate-900">{materialDetails.pickup_location_2}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin size={12} /> Logistics Drop Points
                                    </label>
                                    <div className="space-y-2">
                                        <div className="p-3 bg-orange-50/30 rounded-2xl border border-orange-100/50">
                                            <p className="text-[11px] font-bold text-slate-900">{materialDetails.drop_location_1}</p>
                                        </div>
                                        {materialDetails.drop_location_2 && (
                                            <div className="p-3 bg-orange-50/30 rounded-2xl border border-orange-100/50">
                                                <p className="text-[11px] font-bold text-slate-900">{materialDetails.drop_location_2}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {materialDetails.has_stops && materialDetails.stops && materialDetails.stops.length > 0 && (
                                <div className="pt-6 border-t border-slate-100">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">
                                        Tactical Waypoints
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {materialDetails.stops.map((stop, index) => (
                                            <span key={index} className="px-4 py-2 bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 flex items-center gap-2">
                                                <MapPin size={12} className="text-slate-400" />
                                                {stop}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* 4. Approval History Section */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={12} /> Approval History
                    </h2>
                </div>
                <div className="p-4">
                    {!request.approvals || request.approvals.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No approval actions recorded yet.</p>
                    ) : (
                        <div className="space-y-4 relative pl-1.5">
                            {/* Line */}
                            <div className="absolute left-[9px] top-2 bottom-4 w-px bg-gray-100"></div>

                            {request.approvals.slice().sort((a, b) => new Date(a.approved_at).getTime() - new Date(b.approved_at).getTime()).map((approval) => (
                                <div key={approval.id} className="relative flex gap-3">
                                    <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ring-1 
                                        ${approval.status === 'APPROVED' ? 'ring-emerald-500 bg-emerald-100' :
                                            approval.status === 'REJECTED' ? 'ring-red-500 bg-red-100' :
                                                approval.status === 'RETURNED' ? 'ring-purple-500 bg-purple-100' : 'ring-gray-300 bg-gray-50'}`}>

                                        {approval.status === 'APPROVED' && <CheckCircle size={10} className="text-emerald-600" />}
                                        {(approval.status === 'REJECTED' || approval.status === 'RETURNED') && <XCircle size={10} className={approval.status === 'REJECTED' ? "text-red-600" : "text-purple-600"} />}
                                    </div>

                                    <div className="flex-1 bg-gray-50 p-3 rounded border border-gray-100">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <p className="text-xs font-bold text-gray-800">
                                                    {approval.role === 'COORDINATOR' ? 'Coordinator Verification' : approval.role === 'CEO' ? 'CEO Approval' : 'HOD Approval'}
                                                </p>
                                                <p className="text-[10px] text-gray-500">
                                                    Action by: {approval.approver?.name || 'Unknown'}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-1.5 py-0 rounded border uppercase 
                                                ${approval.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    approval.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                                                        approval.status === 'RETURNED' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-100'}`}>
                                                {approval.status}
                                            </span>
                                        </div>
                                        {approval.comment && (
                                            <div className="bg-white p-2 rounded border border-gray-200 mb-1">
                                                <p className="text-xs text-gray-600 italic">"{approval.comment}"</p>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-gray-400 text-right">{formatDateTime(approval.approved_at)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* 5. Transport Allocation Details (Company Vehicle) */}
            {(request.status === RequestStatus.ALLOCATED || request.status === RequestStatus.COMPLETED) && request.allocation && (
                <section className="bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 rounded-lg shadow-sm border border-indigo-100 overflow-hidden relative">
                    <div className="px-4 py-2 border-b border-indigo-100/50 flex items-center gap-1.5 bg-indigo-50/30">
                        <Truck size={12} className="text-indigo-600" />
                        <h2 className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Transport Allocation</h2>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-0.5">Vehicle Details</label>
                                <div className="bg-white p-2.5 rounded border border-indigo-100 shadow-sm transition-all hover:border-indigo-200">
                                    <p className="text-lg font-bold text-gray-900 leading-tight">{request.allocation.vehicle?.vehicle_number}</p>
                                    <p className="text-xs text-gray-500">{request.allocation.vehicle?.vehicle_type}</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-0.5">Allocation Date</label>
                                <p className="text-xs font-medium text-gray-600">{formatDate(request.allocation.allocated_at)}</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-0.5">Driver Details</label>
                            <div className="bg-white p-2.5 rounded border border-indigo-100 shadow-sm transition-all hover:border-indigo-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs ring-2 ring-white shadow-sm">
                                        {request.allocation.driver?.user?.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 leading-tight">{request.allocation.driver?.user?.name}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                                            PH: {request.allocation.driver?.contact_no}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* 5b. Vendor Allocation Details */}
            {(request.status === RequestStatus.VENDOR_ALLOCATED || (request.status === RequestStatus.COMPLETED && request.vendor_name)) && request.vendor_name && (
                <section className="bg-gradient-to-br from-violet-50/50 via-white to-purple-50/50 rounded-lg shadow-sm border border-violet-100 overflow-hidden relative">
                    <div className="px-4 py-2 border-b border-violet-100/50 flex items-center gap-1.5 bg-violet-50/30">
                        <Building2 size={12} className="text-violet-600" />
                        <h2 className="text-[10px] font-bold text-violet-900 uppercase tracking-wider">Vendor Assignment</h2>
                        <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 text-violet-700 border border-violet-200 uppercase">
                            External Vendor
                        </span>
                    </div>
                    <div className="p-4">
                        <div className="bg-white p-3 rounded border border-violet-100 shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0">
                                <Building2 size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 leading-tight">{request.vendor_name}</p>
                                {request.vendor_code && (
                                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">Code: {request.vendor_code}</p>
                                )}
                                <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-1">
                                    <Phone size={11} className="text-violet-500" />
                                    <span className="font-mono">{request.vendor_mobile}</span>
                                </p>
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                            Vehicle and driver details for this request are managed by the vendor company. Contact the number above for transport arrangements.
                        </p>
                    </div>
                </section>
            )}

            {/* 6. Footer Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-6 flex justify-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button
                    onClick={() => navigate('/my-requests')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-700 transition-all shadow-sm"
                >
                    <ChevronLeft size={14} />
                    Back to Requests
                </button>

                {/* Staff Cancel Action */}
                {userRole === 'STAFF' && request && (request.status === RequestStatus.PENDING_COORDINATOR || request.status === RequestStatus.PENDING_HOD) && (
                    <button
                        onClick={handleCancel}
                        className="ml-4 flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded text-xs font-bold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all shadow-sm"
                    >
                        <XCircle size={14} />
                        Cancel Request
                    </button>
                )}

                {userRole === 'HOD' && request.status === RequestStatus.PENDING_HOD && (
                    <div className="flex gap-2 ml-4">
                        <button
                            onClick={() => openApprovalModal('REJECT')}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded text-xs font-bold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all shadow-sm"
                        >
                            <XCircle size={14} />
                            Reject
                        </button>
                        <button
                            onClick={() => openApprovalModal('APPROVE')}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                        >
                            <CheckCircle size={14} />
                            Approve
                        </button>
                    </div>
                )}

                {userRole === 'CEO' && request.status === 'PENDING_CEO' as RequestStatus && (
                    <div className="flex gap-2 ml-4">
                        <button
                            onClick={() => openApprovalModal('RETURN')}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded text-xs font-bold hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-all shadow-sm"
                        >
                            <ChevronLeft size={14} />
                            Return
                        </button>
                        <button
                            onClick={() => openApprovalModal('REJECT')}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded text-xs font-bold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all shadow-sm"
                        >
                            <XCircle size={14} />
                            Reject
                        </button>
                        <button
                            onClick={() => openApprovalModal('APPROVE')}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                        >
                            <CheckCircle size={14} />
                            Approve
                        </button>
                    </div>
                )}

                {/* Transport Officer Allocation Action */}
                {(userRole === 'TRANSPORT' || userRole === 'ADMIN') && request.status === RequestStatus.APPROVED && (
                    <button
                        onClick={() => navigate(`/requests/${request.id}/allocate`)}
                        className="ml-4 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
                    >
                        <Truck size={14} />
                        Allocate Vehicle
                    </button>
                )}
            </div>

            <ApprovalActionModal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                request={request}
                actionType={actionType}
                onConfirm={handleApprovalAction}
            />
        </div>
    );
};

export default RequestDetails;
