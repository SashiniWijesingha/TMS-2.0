import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Building2, FileText, Calendar, Upload } from 'lucide-react';
import { createVehicle, getVehicleTypes, getAllDrivers, assignDriverToVehicle } from '../../services/vehicleService';
import { VehicleAvailabilityStatus } from '../../types';

interface VehicleAttribute {
    id: number;
    key: string;
    label: string;
    type: string;
    options: string[] | null;
    unit: string | null;
    is_required: boolean;
}

interface VehicleType {
    id: number;
    name: string;
    category: string;
    attributes?: VehicleAttribute[];
}

const VehicleRegister: React.FC = () => {
    const navigate = useNavigate();
    const [types, setTypes] = useState<VehicleType[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [selectedType, setSelectedType] = useState<VehicleType | null>(null);

    const [form, setForm] = useState({
        vehicle_number: '',
        vehicle_type_id: '',
        specification: '', // Standard fallback
        availability_status: VehicleAvailabilityStatus.AVAILABLE,
        ownership: 'COMPANY',
        // ownership is always COMPANY — vendor vehicles are not registered here
        assigned_driver_id: '',
        seating_capacity: 0,
        boot_capacity: '',
        fuel_type: 'Petrol',
        attributes: {} as Record<string, any>
    });

    const [docs, setDocs] = useState({
        revenue_licence: null as File | null,
        emission_report: null as File | null,
        insurance: null as File | null,
        registration_book: null as File | null
    });

    const [expiries, setExpiries] = useState({
        revenue_licence_expiry: '',
        emission_report_expiry: '',
        insurance_expiry: '',
        registration_book_expiry: ''
    });

    useEffect(() => {
        const loadResources = async () => {
            try {
                const [typesData, driversData] = await Promise.all([
                    getVehicleTypes(),
                    getAllDrivers()
                ]);
                setTypes(typesData.map((t: any) => ({
                    ...t,
                    attributes: t.attributes?.map((attr: any) => ({
                        ...attr,
                        options: Array.isArray(attr.options)
                            ? attr.options.map((opt: string) =>
                                opt.toLowerCase() === 'alto' ? 'Sedan' : opt
                            )
                            : attr.options
                    }))
                })));
                setDrivers(driversData);
            } catch (error) {
                console.error('Failed to load resources', error);
            }
        };
        loadResources();
    }, []);

    // Handle Type Change
    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const typeId = parseInt(e.target.value);
        setForm(prev => ({ ...prev, vehicle_type_id: e.target.value, attributes: {} }));

        const type = types.find(t => t.id === typeId) || null;
        setSelectedType(type);
    };

    const handleDynamicChange = (key: string, value: any) => {
        setForm(prev => ({
            ...prev,
            attributes: { ...prev.attributes, [key]: value }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.vehicle_number || !form.vehicle_type_id) {
            alert('Please fill required fields');
            return;
        }

        try {
            setLoading(true);

            const formData = new FormData();
            formData.append('vehicle_number', form.vehicle_number);
            formData.append('vehicle_type_id', form.vehicle_type_id);
            if (form.assigned_driver_id) formData.append('assigned_driver_id', form.assigned_driver_id);
            formData.append('specification', form.specification);
            formData.append('availability_status', form.availability_status);
            formData.append('ownership', form.ownership);
            formData.append('seating_capacity', (form.seating_capacity > 0 ? form.seating_capacity : 4).toString());

            // Company specific attributes
            const finalAttributes = {
                ...form.attributes,
                boot_capacity: form.boot_capacity,
                fuel_type: form.fuel_type
            };
            formData.append('attributes', JSON.stringify(finalAttributes));

            // Append Files & Expiries
            Object.entries(docs).forEach(([key, file]) => {
                if (file) formData.append(key, file);
            });
            Object.entries(expiries).forEach(([key, value]) => {
                if (value) formData.append(key, value);
            });

            const res = await createVehicle(formData);

            if (form.assigned_driver_id && res.vehicle?.id) {
                await assignDriverToVehicle(res.vehicle.id, parseInt(form.assigned_driver_id));
            }

            navigate('/admin/vehicles');
        } catch (error) {
            console.error(error);
            alert('Failed to register vehicle');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => navigate('/admin/vehicles')} className="flex items-center text-slate-500 hover:text-slate-900 transition-colors">
                <ArrowLeft size={18} className="mr-2" /> Back to Fleet
            </button>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900" />

                <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
                    <div className="p-3 rounded-xl text-white bg-slate-900">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Company Vehicle Registration</h1>
                        <p className="text-slate-500">Add a company-owned asset to the fleet</p>
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
                                placeholder="e.g. WP CAB-1234"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle Category *</label>
                            <select
                                required
                                value={form.vehicle_type_id}
                                onChange={handleTypeChange}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white transition-all"
                            >
                                <option value="">Select Category</option>
                                {types.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Company Specific Fields */}
                    {(
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Boot Capacity</label>
                                <input
                                    type="text"
                                    value={form.boot_capacity}
                                    onChange={e => setForm({ ...form, boot_capacity: e.target.value })}
                                    placeholder="e.g. 420L"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Fuel Type</label>
                                <select
                                    value={form.fuel_type}
                                    onChange={e => setForm({ ...form, fuel_type: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white transition-all"
                                >
                                    <option value="Petrol">Petrol</option>
                                    <option value="Diesel">Diesel</option>
                                    <option value="Electric">Electric</option>
                                    <option value="Hybrid">Hybrid</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Standard Specification (Fallback if no dynamic attributes) */}
                    {(!selectedType || !selectedType.attributes || selectedType.attributes.length === 0) && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Specification</label>
                            <textarea
                                rows={3}
                                value={form.specification}
                                onChange={e => setForm({ ...form, specification: e.target.value })}
                                placeholder="e.g. Toyota Axio, 2018 Model, White"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none resize-none transition-all"
                            />
                        </div>
                    )}

                    {/* Standard Seating Capacity (For Passenger Vehicles) */}
                    {selectedType && selectedType.category === 'PASSENGER' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Seating Capacity (Standard) *</label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={form.seating_capacity}
                                onChange={e => setForm({ ...form, seating_capacity: parseInt(e.target.value) || 0 })}
                                placeholder="e.g. 4"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                            />
                            <p className="text-xs text-slate-500 mt-1">Used for Ride Sharing calculations.</p>
                        </div>
                    )}

                    {/* DYNAMIC ATTRIBUTES */}
                    {selectedType?.attributes && selectedType.attributes.length > 0 && (
                        <div className="p-5 border rounded-xl space-y-4 animate-in fade-in bg-slate-50 border-slate-200">
                            <h3 className="font-semibold text-sm border-b pb-2 text-slate-900 border-slate-200">
                                {selectedType?.category === 'PASSENGER' ? 'Passenger Comfort & Specs' : 'Material Transport Specs'}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedType?.attributes?.map(attr => (
                                    <div key={attr.id}>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {attr.label}
                                            {attr.unit && <span className="text-slate-400 text-xs ml-1">({attr.unit})</span>}
                                            {attr.is_required && <span className="text-red-500">*</span>}
                                        </label>

                                        {attr.type === 'SELECT' ? (
                                            <select
                                                required={attr.is_required}
                                                value={form.attributes[attr.key] || ''}
                                                onChange={e => handleDynamicChange(attr.key, e.target.value)}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white"
                                            >
                                                <option value="">Select...</option>
                                                {(Array.isArray(attr.options) ? attr.options : []).map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : attr.type === 'NUMBER' ? (
                                            <input
                                                type="number"
                                                required={attr.is_required}
                                                value={form.attributes[attr.key] || ''}
                                                onChange={e => handleDynamicChange(attr.key, e.target.value)}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                required={attr.is_required}
                                                value={form.attributes[attr.key] || ''}
                                                onChange={e => handleDynamicChange(attr.key, e.target.value)}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Driver Assignment */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Assign Driver (Optional)</label>
                        <p className="text-xs text-slate-500 mb-3">Permanently assign a driver to this vehicle.</p>
                        <select
                            value={form.assigned_driver_id}
                            onChange={e => setForm({ ...form, assigned_driver_id: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white transition-all"
                        >
                            <option value="">-- No Driver Assigned --</option>
                            {drivers.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.user?.name || d.name || `Driver #${d.id}`} - {d.allowed_vehicle_type_ids?.includes(parseInt(form.vehicle_type_id)) ? '✅' : '⚠️'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Document Uploads */}
                    {(
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <FileText size={18} /> Vehicle Documents & Expiries
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { id: 'revenue_licence', label: 'Revenue Licence' },
                                    { id: 'emission_report', label: 'Emission Report' },
                                    { id: 'insurance', label: 'Insurance Policy' },
                                    { id: 'registration_book', label: 'Vehicle Registration Book' }
                                ].map(doc => (
                                    <div key={doc.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{doc.label}</label>
                                        <div className="flex flex-col gap-2">
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    onChange={e => setDocs(prev => ({ ...prev, [doc.id]: e.target.files?.[0] || null }))}
                                                    className="hidden"
                                                    id={`file-${doc.id}`}
                                                    accept=".pdf,image/*"
                                                />
                                                <label
                                                    htmlFor={`file-${doc.id}`}
                                                    className={`flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-all ${docs[doc.id as keyof typeof docs] ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white hover:border-slate-900 text-slate-500'}`}
                                                >
                                                    <Upload size={14} />
                                                    <span className="text-xs font-medium truncate max-w-[150px]">
                                                        {docs[doc.id as keyof typeof docs] ? (docs[doc.id as keyof typeof docs] as File).name : 'Upload Doc'}
                                                    </span>
                                                </label>
                                            </div>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <input
                                                    type="date"
                                                    value={expiries[`${doc.id}_expiry` as keyof typeof expiries]}
                                                    onChange={e => setExpiries(prev => ({ ...prev, [`${doc.id}_expiry`]: e.target.value }))}
                                                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Initial Status</label>
                        <select
                            value={form.availability_status}
                            onChange={e => setForm({ ...form, availability_status: e.target.value as any })}
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
                            className="text-white px-8 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg bg-slate-900 hover:bg-slate-800 shadow-slate-900/20"
                        >
                            {loading ? 'Saving...' : <><Save size={18} /> Register Vehicle</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VehicleRegister;
