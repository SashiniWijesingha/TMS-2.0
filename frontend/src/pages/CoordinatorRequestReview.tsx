import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { VehicleRequest } from '../types';
import {
    ArrowLeft, Calendar, Clock, MapPin,
    Truck, User, Building, Share2, Edit, Route, CheckCircle
} from 'lucide-react';
import PassengerForm from './forms/PassengerForm';
import MaterialForm from './forms/MaterialForm';

const CoordinatorRequestReview = () => {
    // Hooks to get the URL parameter (request ID) and navigation function
    const { id } = useParams();
    const navigate = useNavigate();

    // State Management
    const [request, setRequest] = useState<VehicleRequest | null>(null); // Stores the request details
    const [loading, setLoading] = useState(true); // Loading state for async operations
    const [submitting, setSubmitting] = useState(false); // Submitting state to prevent double clicks
    const [comment, setComment] = useState(''); // Stores the coordinator's comment
    const [isEditing, setIsEditing] = useState(false); // Toggles between View and Edit modes

    // Checklist State: Coordinator must check these before approving
    const [checklist, setChecklist] = useState({
        detailsComplete: false, // Are all details filled?
        jobCodeValid: false,    // Is the Job Number/WBS correct?
        serviceHours: false     // Is the request within allowed hours?
    });

    // Effect Hook: Fetches request details when the component mounts or 'id' changes
    useEffect(() => {
        fetchRequest();
    }, [id]);

    // Function to fetch the vehicle request data from the backend API
    const fetchRequest = async () => {
        try {
            const res = await api.get(`/requests/${id}`);
            setRequest(res.data);
        } catch (error) {
            console.error('Failed to fetch request:', error);
        } finally {
            setLoading(false); // Stop loading spinner regardless of success/failure
        }
    };

    // Handler: Approves the request and sends it to the HOD (Head of Department)
    const handleApprove = async () => {
        if (!confirm('Submit to HOD for approval?')) return;
        setSubmitting(true);
        try {
            // Sends 'VERIFIED' status to backend. This transitions the request to 'PENDING_HOD'.
            await api.put(`/requests/${id}/verify`, { status: 'VERIFIED', comment });
            alert('Request verified and sent to HOD.');
            navigate('/coordinator/requests'); // Redirect back to list
        } catch (error) {
            console.error(error);
            alert('Failed to submit.');
        } finally {
            setSubmitting(false);
        }
    };

    // Handler: Returns the request to the Staff member for corrections
    const handleReturn = async () => {
        if (!comment) {
            alert('Please add a comment explaining why the request is being returned.');
            return;
        }
        if (!confirm('Return this request to the staff member for corrections?')) return;
        setSubmitting(true);
        try {
            // Sends 'RETURNED' status. Staff will see this and can edit again.
            await api.put(`/requests/${id}/verify`, { status: 'RETURNED', comment });
            alert('Request returned to staff.');
            navigate('/coordinator/requests');
        } catch (error) {
            console.error(error);
            alert('Failed to return request.');
        } finally {
            setSubmitting(false);
        }
    };

    // Handler: Rejects the request permanently (or sends back as rejected)
    const handleReject = async () => {
        if (!comment) {
            alert('Please provide a reason for rejection.');
            return;
        }
        if (!confirm('Are you sure you want to REJECT this request? This cannot be undone.')) return;
        setSubmitting(true);
        try {
            // Currently using 'RETURNED' status with a [REJECTED] tag in the comment.
            // Ideally, there should be a 'REJECTED' status in the backend.
            await api.put(`/requests/${id}/verify`, { status: 'RETURNED', comment: `[REJECTED] ${comment}` });
            alert('Request rejected.');
            navigate('/coordinator/requests');
        } catch (error) {
            console.error(error);
            alert('Failed to reject request.');
        } finally {
            setSubmitting(false);
        }
    };

    // Handler: Updates the request details when in 'Edit' mode
    const handleUpdate = async (formData: any) => {
        if (!request) return;
        setSubmitting(true);
        try {
            // Construct payload based on request type (Passenger vs Material)
            let payload: any = {
                requestType: request.request_type,
                jobNo: formData.job_number,
                projectName: formData.project_name,
            };

            if (request.request_type === 'PASSENGER') {
                payload.passengerDetails = { ...formData, distance: formData.distance };
            } else {
                // Determine material specific fields
                const materialPayload = {
                    ...formData,
                    lorry_size: formData.vehicle_type === 'Boom Truck' ? formData.boom_truck_size : formData.lorry_size,
                    man_bucket_height: formData.bucket_remarks,
                    man_bucket_weight: formData.bucket_weight
                };
                payload.materialDetails = materialPayload;
            }

            // Send UPDATE request to backend
            await api.put(`/requests/${id}`, payload);
            alert('Request updated successfully.');
            setIsEditing(false); // Exit edit mode
            fetchRequest(); // Refresh data to show new values
        } catch (error) {
            console.error('Update failed:', error);
            alert('Failed to update request.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    // Determine if all checklist items are checked
    const allChecked = Object.values(checklist).every(Boolean);

    // Conditional Rendering: Loading state
    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
    // Conditional Rendering: Request not found case
    if (!request) return <div className="p-8 text-center text-slate-500 text-sm">Request not found</div>;

    // Helper constants for rendering
    const isPassenger = request.request_type === 'PASSENGER';
    const isMaterial = request.request_type === 'MATERIAL';
    const details = isPassenger ? request.passengerDetails : request.materialDetails;
    const date = details?.date;
    const time = details?.time;
    const isShared = details?.share_vehicle;

    // Format helper
    const formatDate = (d: string) => new Date(d).toLocaleDateString();

    // View: Edit Mode - Renders the appropriate form (PassengerForm or MaterialForm)
    if (isEditing) {
        return (
            <div className="desktop-page-narrow max-w-4xl space-y-4 pb-12">
                <div className="flex items-center space-x-2 mb-4">
                    <button onClick={handleCancelEdit} className="desktop-btn-icon desktop-btn-icon-neutral">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-lg font-bold text-slate-800 tracking-tight">Edit Request #{request.id}</h1>
                </div>
                <div className="desktop-section-card p-6">
                    {/* Render Form with initial data populated from the request */}
                    {isPassenger ? (
                        <PassengerForm
                            initialData={{
                                date: details?.date,
                                time: details?.time,
                                no_of_days: (details as any).no_of_days,
                                main_division: request.division?.name || '',
                                sub_division: request.sub_division || '',
                                job_number: request.job_number,
                                project_name: request.project_name,
                                no_of_passengers: (details as any).no_of_passengers,
                                contact_person_name: (details as any).contact_person_name,
                                contact_no: (details as any).contact_no,
                                vehicle_type: (details as any).vehicle_type,
                                specification: (details as any).specification,
                                pickup_location: (details as any).pickup_location,
                                drop_location: (details as any).drop_location,
                                distance: (details as any).distance || '',
                                return_trip: (details as any).return_trip,
                                share_vehicle: (details as any).share_vehicle,
                                sharing_remarks: (details as any).sharing_remarks,
                                reason: (details as any).reason,
                                service_category: (details as any).service_category,
                                cost_centre: (details as any).cost_centre,
                                has_stops: (details as any).stops?.length > 0,
                                stops: (details as any).stops || []
                            }}
                            isEditMode={true}
                            serviceCategory={(details as any).service_category}
                            onSubmit={handleUpdate}
                        />
                    ) : (
                        <MaterialForm
                            initialData={{
                                date: details?.date,
                                time: details?.time,
                                main_division: request.division?.name || '',
                                sub_division: request.sub_division || '',
                                job_number: request.job_number,
                                project_name: request.project_name,
                                contact_person_name: (details as any).contact_person_name,
                                contact_no: (details as any).contact_no,
                                vehicle_type: (details as any).vehicle_type || 'Lorry',
                                lorry_type: (details as any).lorry_type || 'Full Body Lorry',
                                lorry_size: (details as any).lorry_size || '7.5Ft',
                                boom_truck_size: (details as any).vehicle_type === 'Boom Truck' ? (details as any).lorry_size : '14.5Ft',
                                arm_capacity: (details as any).arm_capacity || '3Ton',
                                crane_weight: (details as any).crane_weight || '10Ton',
                                bucket_remarks: (details as any).man_bucket_height || '',
                                bucket_weight: (details as any).man_bucket_weight || '2.5Ton',
                                pickup_location_1: (details as any).pickup_location_1,
                                drop_location_1: (details as any).drop_location_1,
                                distance: (details as any).distance || '',
                                has_stops: (details as any).stops?.length > 0,
                                stops: (details as any).stops || [],
                                no_of_labours: (details as any).no_of_labours || 'No',
                                return_materials: (details as any).return_materials || false,
                                share_vehicle: (details as any).share_vehicle || false,
                                sharing_remarks: (details as any).sharing_remarks || '',
                                reason: (details as any).reason
                            }}
                            isEditMode={true}
                            onSubmit={handleUpdate}
                        />
                    )}
                </div>
            </div>
        );
    }

    // View: Main Coordinator Review Dashboard
    return (
        <div className="desktop-page-compact max-w-6xl space-y-4 pb-12">
            {/* Header Section: Title, ID, Date, and Print/Edit Buttons */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center space-x-3">
                    <button onClick={() => navigate('/coordinator/requests')} className="desktop-btn-icon desktop-btn-icon-neutral">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            Review Request
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] uppercase font-bold rounded border border-amber-200 tracking-wide">
                                Pending
                            </span>
                        </h1>
                        <p className="text-slate-500 text-xs mt-0.5">ID: <span className="font-mono text-slate-700 font-medium">#{request.id}</span> • Submitted: {new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Edit Button: Opens the form in edit mode */}
                {(isPassenger || isMaterial) && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="desktop-btn desktop-btn-secondary min-w-0 text-xs sm:text-sm"
                    >
                        <Edit size={14} />
                        Edit Request
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Left Col */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Project & Division Details */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                            <h3 className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <Building className="mr-1.5" size={14} />
                                Project & Division Details
                            </h3>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Main Division</p>
                                <p className="text-sm text-slate-800 font-semibold">{request.division?.name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Sub Division</p>
                                <p className="text-sm text-slate-800 font-semibold">{request.sub_division || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Requester</p>
                                <p className="text-sm text-slate-800 font-semibold flex items-center">
                                    <User size={12} className="mr-1 text-slate-400" /> {request.requester?.name}
                                </p>
                                <p className="text-[10px] text-slate-500 pl-4">ID: {request.requester?.employee_id}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">WBS (Job No)</p>
                                <p className="text-sm text-slate-800 font-mono font-medium">{request.job_number}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Project Name</p>
                                <p className="text-sm text-slate-800 font-medium truncate" title={request.project_name}>{request.project_name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Requirements */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                            <h3 className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <Truck className="mr-1.5" size={14} />
                                Vehicle Requirements
                            </h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-2.5 rounded border border-slate-100 bg-slate-50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Date</p>
                                    <p className="text-sm font-semibold text-slate-800 flex items-center"><Calendar size={12} className="mr-1.5 text-slate-500" /> {date ? formatDate(date.toString()) : '-'}</p>
                                </div>
                                <div className="p-2.5 rounded border border-slate-100 bg-slate-50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Time</p>
                                    <p className="text-sm font-semibold text-slate-800 flex items-center"><Clock size={12} className="mr-1.5 text-slate-500" /> {time}</p>
                                </div>
                                <div className="p-2.5 rounded border border-slate-100 bg-slate-50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Category</p>
                                    <p className="text-sm font-semibold text-slate-800">{request.request_type}</p>
                                </div>
                                <div className="p-2.5 rounded border border-slate-100 bg-slate-50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vehicle Type</p>
                                    <div className="flex flex-col">
                                        <p className="text-sm font-semibold text-slate-800">{details?.vehicle_type}</p>
                                        {isShared && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-teal-600 mt-0.5">
                                                <Share2 size={10} /> Shared
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
                                <div>
                                    <span className="font-bold text-slate-500 uppercase text-[10px]">Specification:</span>
                                    <span className="font-medium text-slate-800 ml-2 block sm:inline sm:ml-2">
                                        {isPassenger ? (details as any).specification : (details as any).lorry_size || (details as any).boom_truck_size || 'N/A'}
                                    </span>
                                </div>
                                {isPassenger && (
                                    <div>
                                        <span className="font-bold text-slate-500 uppercase text-[10px]">Passengers:</span>
                                        <span className="font-medium text-slate-800 ml-2">{(details as any).no_of_passengers}</span>
                                    </div>
                                )}
                                {!isPassenger && (
                                    <div>
                                        <span className="font-bold text-slate-500 uppercase text-[10px]">Labor:</span>
                                        <span className="font-medium text-slate-800 ml-2">{(details as any).no_of_labours}</span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-blue-50/50 p-3 rounded border border-blue-100">
                                <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Reason for Request</p>
                                <p className="text-xs text-slate-700 italic leading-relaxed">"{details?.reason}"</p>
                            </div>
                        </div>
                    </div>

                    {/* Route Info */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                            <h3 className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <MapPin className="mr-1.5" size={14} />
                                Route Information
                            </h3>
                        </div>
                        <div className="p-4">
                            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                {/* Pickup */}
                                <div className="relative">
                                    <div className="absolute -left-6 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    </div>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-0.5">Pickup Location</p>
                                    <p className="text-sm font-medium text-slate-800 leading-snug">
                                        {isPassenger ? (details as any).pickup_location : (details as any).pickup_location_1}
                                    </p>
                                </div>

                                {/* Drop */}
                                <div className="relative">
                                    <div className="absolute -left-6 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                    </div>
                                    <p className="text-[10px] font-bold text-red-600 uppercase mb-0.5">Drop Location</p>
                                    <p className="text-sm font-medium text-slate-800 leading-snug">
                                        {isPassenger ? (details as any).drop_location : (details as any).drop_location_1}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Distance Box */}
                        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center">
                                <Route size={12} className="mr-1.5" /> Estimated Distance
                            </p>
                            <p className="text-sm font-bold text-slate-800">
                                {(details as any).distance ? `${(details as any).distance} km` : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Review Actions & Checklist */}
                <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden sticky top-4">
                        <div className="bg-[#005C2E] px-4 py-3 border-b border-[#004d26]">
                            <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                                <CheckCircle size={16} className="text-white/80" />
                                Coordinator Review
                            </h3>
                        </div>

                        <div className="p-4 space-y-5">
                            {/* Checklist: Mandatory checks before approval */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Checklist</p>
                                <label className="flex items-start space-x-2.5 cursor-pointer p-2 hover:bg-slate-50 rounded transition-colors group">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                                        checked={checklist.detailsComplete}
                                        onChange={e => setChecklist({ ...checklist, detailsComplete: e.target.checked })}
                                    />
                                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800 select-none">Request details are complete</span>
                                </label>
                                <label className="flex items-start space-x-2.5 cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition-colors group">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 w-4 h-4 text-[#005C2E] rounded focus:ring-[#005C2E] border-slate-300"
                                        checked={checklist.jobCodeValid}
                                        onChange={e => setChecklist({ ...checklist, jobCodeValid: e.target.checked })}
                                    />
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 select-none">WBS No / Cost Centre Valid</span>
                                </label>
                                <label className="flex items-start space-x-2.5 cursor-pointer p-2 hover:bg-slate-50 rounded transition-colors group">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                                        checked={checklist.serviceHours}
                                        onChange={e => setChecklist({ ...checklist, serviceHours: e.target.checked })}
                                    />
                                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800 select-none">Within Service Hours</span>
                                </label>
                            </div>

                            <div className="w-full h-px bg-slate-100"></div>

                            {/* Comments System: Coordinator can explain actions */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Coordinator Comments</label>
                                <textarea
                                    className="desktop-input resize-none bg-slate-50 p-2.5 text-xs"
                                    rows={3}
                                    placeholder="Add notes for approval or reason for return..."
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                ></textarea>
                            </div>
                             {/* Action Buttons: Approve, Return, or Reject */}
                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={handleApprove}
                                    disabled={!allChecked || submitting}
                                    className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg 
                                        ${allChecked 
                                            ? 'bg-[#005C2E] text-white shadow-green-900/10 hover:bg-[#004d26] scale-[1.02]' 
                                            : 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed'
                                        }`}
                                >
                                    {submitting ? 'Processing...' : 'Approve & Submit to HOD'}
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={handleReturn}
                                        disabled={submitting}
                                        className="py-3 px-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-100 transition-all"
                                    >
                                        Return for Fix
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={submitting}
                                        className="py-3 px-2 bg-red-50 text-red-700 border border-red-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoordinatorRequestReview;
