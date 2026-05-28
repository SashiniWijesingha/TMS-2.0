import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import PassengerForm from './forms/PassengerForm';
import MaterialForm from './forms/MaterialForm';
import { RequestType, RequestStatus } from '../types';
import { ArrowLeft, Edit } from 'lucide-react';

const EditRequest = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const fetchRequest = async () => {
            try {
                const res = await api.get(`/requests/${id}`);
                setRequest(res.data);
            } catch (error: any) {
                console.error(error);
                if (error.response && error.response.status === 401) {
                    // Let interceptor handle it
                } else {
                    alert('Failed to load request');
                    navigate('/my-requests');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchRequest();
    }, [id, navigate]);

    const handleUpdate = async (formData: any) => {
        try {
            await api.put(`/requests/${id}`, {
                ...request,
                requestType: request.request_type,
                jobNo: formData.job_number,
                projectName: formData.project_name,
                passengerDetails: request.request_type === RequestType.PASSENGER ? formData : undefined,
                materialDetails: request.request_type === RequestType.MATERIAL ? formData : undefined
            });
            alert('Request updated successfully');
            navigate(`/requests/${id}`);
        } catch (error) {
            console.error('Update failed:', error);
            alert('Failed to update request');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!request) return <div className="p-8 text-center text-slate-500">Request not found</div>;

    // Merge core fields into formatting expected by forms
    const initialData = request.request_type === RequestType.PASSENGER ? {
        ...(request.passengerDetails || {}),
        job_number: request.job_number,
        project_name: request.project_name,
        main_division: request.division?.name,
        sub_division: request.sub_division
    } : {
        ...(request.materialDetails || {}),
        job_number: request.job_number,
        project_name: request.project_name,
        main_division: request.division?.name,
        sub_division: request.sub_division
    };

    // Ensure status is valid for editing
    if (request.status !== RequestStatus.PENDING_COORDINATOR) {
        return (
            <div className="max-w-lg mx-auto mt-12 p-6 bg-red-50 rounded-lg border border-red-100 text-center">
                <h2 className="text-lg font-bold text-red-700 mb-2">Cannot Edit Request</h2>
                <p className="text-sm text-red-600 mb-4">This request has already been processed or is not in a pending state.</p>
                <button
                    onClick={() => navigate('/my-requests')}
                    className="px-4 py-2 bg-white border border-red-200 text-red-700 text-xs font-bold rounded hover:bg-red-50 transition-colors"
                >
                    Back to My Requests
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate('/my-requests')}
                    className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Edit size={18} className="text-blue-500" />
                        Edit Request
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">Update details for Request #{id}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 md:p-6">
                {request.request_type === RequestType.PASSENGER ? (
                    <PassengerForm
                        initialData={initialData}
                        isEditMode={true}
                        subType={request.is_adhoc ? 'ADHOC' : request.is_special ? 'SPECIAL' : 'NORMAL'}
                        serviceCategory={initialData.service_category}
                        onSubmit={handleUpdate}
                    />
                ) : (
                    <MaterialForm
                        initialData={initialData}
                        isEditMode={true}
                        onSubmit={handleUpdate}
                    />
                )}
            </div>
        </div>
    );
};

export default EditRequest;
