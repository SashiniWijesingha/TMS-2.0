import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Truck, ArrowLeft } from 'lucide-react';
import { updateVehicle, getVehicleTypes, getAllVehicles } from '../../services/vehicleService';
import { VehicleAvailabilityStatus } from '../../types';
import type { Vehicle } from '../../types';

interface VehicleForm {
    vehicle_number: string;
    vehicle_type_id: string;
    specification: string;
    availability_status: VehicleAvailabilityStatus;
}

const VehicleEdit: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [types, setTypes] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState<VehicleForm>({
        vehicle_number: '',
        vehicle_type_id: '',
        specification: '',
        availability_status: VehicleAvailabilityStatus.AVAILABLE
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [typesData, vehiclesData] = await Promise.all([
                    getVehicleTypes(),
                    getAllVehicles()
                ]);

                setTypes(typesData);

                const vehicle = vehiclesData.find((v: Vehicle) => v.id === parseInt(id || '0'));
                if (vehicle) {
                    setForm({
                        vehicle_number: vehicle.vehicle_number,
                        vehicle_type_id: vehicle.vehicle_type_id ? vehicle.vehicle_type_id.toString() : '',
                        specification: vehicle.specification || '',
                        availability_status: vehicle.availability_status
                    });
                } else {
                    alert('Vehicle not found');
                    navigate('/admin/vehicles');
                }
            } catch (error) {
                console.error('Failed to load data', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const payload = {
                ...form,
                vehicle_type_id: parseInt(form.vehicle_type_id)
            };

            await updateVehicle(parseInt(id!), payload);
            navigate('/admin/vehicles');
        } catch (error) {
            alert('Failed to update vehicle');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading vehicle details...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => navigate('/admin/vehicles')} className="flex items-center text-slate-500 hover:text-slate-900 transition-colors">
                <ArrowLeft size={18} className="mr-2" /> Back to Fleet
            </button>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
                    <div className="p-3 bg-slate-900 rounded-xl text-white">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Edit Vehicle</h1>
                        <p className="text-slate-500">Update vehicle details</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle Number *</label>
                            <input
                                required
                                type="text"
                                value={form.vehicle_number}
                                onChange={e => setForm({ ...form, vehicle_number: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle Category *</label>
                            <select
                                required
                                value={form.vehicle_type_id}
                                onChange={e => setForm({ ...form, vehicle_type_id: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white transition-all"
                            >
                                <option value="">Select Category</option>
                                {types.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Specification */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Specification</label>
                        <textarea
                            rows={3}
                            value={form.specification}
                            onChange={e => setForm({ ...form, specification: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none resize-none transition-all"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Current Status</label>
                        <select
                            value={form.availability_status}
                            onChange={e => setForm({ ...form, availability_status: e.target.value as VehicleAvailabilityStatus })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white"
                        >
                            {Object.values(VehicleAvailabilityStatus).map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/vehicles')}
                            className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-slate-900 text-white px-8 py-2.5 rounded-xl hover:bg-slate-800 transition-all font-medium flex items-center gap-2 shadow-lg shadow-slate-900/20"
                        >
                            {loading ? 'Saving...' : <><Save size={18} /> Update Vehicle</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VehicleEdit;
