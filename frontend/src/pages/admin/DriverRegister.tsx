import React, { useState, useEffect } from 'react';
import {
    User, Mail, Lock, Phone, CreditCard, Truck, ChevronRight, AlertCircle, Calendar, FileText,
    Upload, Check, Car, Bus, Package, Layers, Plus, Trash2, Key, Ban, PenLine, Construction,
    List, UserPlus, Search, Edit2, ExternalLink, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import api from '../../services/api';

// Define Driver Interface
interface DriverData {
    id: number;
    user_id: number;
    nic_no: string;
    license_no: string;
    license_expiry: string;
    work_experience: string;
    license_photo: string;
    grama_niladhari_cert: string;
    police_report: string;
    allowed_vehicle_type_ids: string[] | string; // Can be array or stringified JSON
    other_vehicle_types: string;
    vehicle_arrangement?: string;
    company_vehicle_numbers?: string[] | string;
    user: {
        name: string;
        email: string;
        employee_id: string;
        mobile: string;
        account_type: string;
    };
    // Helper fields from backend
    contact_no: string;
    license_photo_url: string;
    grama_niladhari_cert_url: string;
    police_report_url: string;
}

const DriverRegister: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'register' | 'list'>('list');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Editing State
    const [editingDriverId, setEditingDriverId] = useState<number | null>(null);
    const [viewingDriver, setViewingDriver] = useState<DriverData | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        employee_id: '',
        email: '',
        password: '',
        contact_no: '',
        nic_no: '',
        license_no: '',
        license_expiry: '',
        work_experience: ''
    });

    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        license_photo: null,
        grama_niladhari_cert: null,
        police_report: null
    });

    // Existing file URLs for display during edit
    const [existingFiles, setExistingFiles] = useState<{ [key: string]: string | null }>({
        license_photo: null,
        grama_niladhari_cert: null,
        police_report: null
    });

    // Vehicle types the driver can operate
    const VEHICLE_TYPES = [
        { id: 'car', label: 'Car', icon: Car, desc: 'Sedan, SUV, Hatchback, Crossover' },
        { id: 'van', label: 'Van', icon: Bus, desc: 'Mini Van, 12–15 Seater, High Roof' },
        { id: 'bus', label: 'Bus', icon: Bus, desc: 'AC / Non-AC, 29–40 Seater, Luxury' },
        { id: 'double_cab', label: 'Double Cab', icon: Truck, desc: '4WD / 2WD, Standard or Luxury' },
        { id: 'lorry', label: 'Lorry', icon: Truck, desc: 'Light / Heavy Body, Full or Open' },
        { id: 'boom_truck', label: 'Boom Truck', icon: Layers, desc: 'Hydraulic boom arm, heavy lift' },
        { id: 'crane', label: 'Crane', icon: Construction, desc: 'Tower / mobile crane operations' },
        { id: 'man_bucket', label: 'Man Bucket', icon: Package, desc: 'Aerial work platform / elevated lift' },
        { id: 'forklift', label: 'Forklift', icon: Package, desc: 'Counterbalance, reach, pallet truck' },
        { id: 'crew_cab', label: 'Crew Cab', icon: Car, desc: '4-door pickup, field crew transport' },
    ];

    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

    const toggleType = (id: string) => {
        setSelectedTypes(prev =>
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        );
    };

    const selectAll = () => setSelectedTypes(VEHICLE_TYPES.map(v => v.id));
    const clearAll = () => setSelectedTypes([]);

    const [otherVehicleType, setOtherVehicleType] = useState('');

    // Company vehicle assignment
    const [hasCompanyVehicle, setHasCompanyVehicle] = useState<'rent' | 'own' | 'none' | null>(null);
    const [companyVehicles, setCompanyVehicles] = useState<string[]>(['']);

    const addVehicleRow = () => setCompanyVehicles(prev => [...prev, '']);
    const removeVehicleRow = (i: number) => setCompanyVehicles(prev => prev.filter((_, idx) => idx !== i));
    const updateVehicleNo = (i: number, val: string) =>
        setCompanyVehicles(prev => prev.map((v, idx) => idx === i ? val : v));

    // Drivers List State
    const [drivers, setDrivers] = useState<DriverData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (activeTab === 'list') {
            fetchDrivers();
        }
    }, [activeTab]);

    const fetchDrivers = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/admin/drivers');
            setDrivers(response.data);
        } catch (err: any) {
            console.error('Failed to fetch drivers', err);
            setError(err.response?.data?.message || 'Failed to load drivers list');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            employee_id: '',
            email: '',
            password: '',
            contact_no: '',
            nic_no: '',
            license_no: '',
            license_expiry: '',
            work_experience: ''
        });
        setFiles({
            license_photo: null,
            grama_niladhari_cert: null,
            police_report: null
        });
        setExistingFiles({
            license_photo: null,
            grama_niladhari_cert: null,
            police_report: null
        });
        setSelectedTypes([]);
        setOtherVehicleType('');
        setHasCompanyVehicle(null);
        setCompanyVehicles(['']);
        setEditingDriverId(null);
        setError('');
        setSuccessMessage('');
    };

    const handleEditClick = (driver: DriverData) => {
        resetForm();
        setEditingDriverId(driver.id);
        
        // Parse vehicle types
        let types: string[] = [];
        if (typeof driver.allowed_vehicle_type_ids === 'string') {
            try {
                types = JSON.parse(driver.allowed_vehicle_type_ids);
            } catch (e) {
                types = [];
            }
        } else if (Array.isArray(driver.allowed_vehicle_type_ids)) {
            types = driver.allowed_vehicle_type_ids;
        }

        // Separate 'other' types
        const stringTypes = types.map(t => String(t));
        const standardTypes = stringTypes.filter(t => !t.startsWith('other:'));
        const otherType = stringTypes.find(t => t.startsWith('other:'));
        
        setSelectedTypes(standardTypes);
        if (otherType) {
            setSelectedTypes(prev => [...prev, 'other']);
            setOtherVehicleType(otherType.replace('other:', ''));
        }

        // Parse company vehicles
        let vehicles: string[] = [];
        if (typeof driver.company_vehicle_numbers === 'string') {
            try {
                vehicles = JSON.parse(driver.company_vehicle_numbers);
            } catch (e) {
                vehicles = [];
            }
        } else if (Array.isArray(driver.company_vehicle_numbers)) {
            vehicles = driver.company_vehicle_numbers;
        }

        setCompanyVehicles(vehicles.length > 0 ? vehicles : ['']);
        
        // Determine vehicle arrangement
        if (driver.vehicle_arrangement) {
            setHasCompanyVehicle(driver.vehicle_arrangement as any);
        } else {
             // Fallback logic if needed, or default to none
             setHasCompanyVehicle('none');
        }

        setFormData({
            name: driver.user.name,
            employee_id: driver.user.employee_id,
            email: driver.user.email,
            password: '', // Password not editable directly here, or handled separately
            contact_no: driver.contact_no || '',
            nic_no: driver.nic_no,
            license_no: driver.license_no,
            license_expiry: driver.license_expiry ? new Date(driver.license_expiry).toISOString().split('T')[0] : '',
            work_experience: driver.work_experience || ''
        });

        setExistingFiles({
            license_photo: driver.license_photo_url,
            grama_niladhari_cert: driver.grama_niladhari_cert_url,
            police_report: driver.police_report_url
        });

        setActiveTab('register');
    };

    const handleViewClick = (driver: DriverData) => {
        setViewingDriver(driver);
        setShowViewModal(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        if (e.target.files && e.target.files[0]) {
            setFiles({ ...files, [field]: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            const data = new FormData();

            // Append textual data
            Object.keys(formData).forEach(key => {
                // Skip password if editing and empty
                if (key === 'password' && editingDriverId && !(formData as any)[key]) {
                    return;
                }
                data.append(key, (formData as any)[key]);
            });

            // Append files
            if (files.license_photo) data.append('license_photo', files.license_photo);
            if (files.grama_niladhari_cert) data.append('grama_niladhari_cert', files.grama_niladhari_cert);
            if (files.police_report) data.append('police_report', files.police_report);

            // Append array data as stringified JSON (vehicle label names)
            const allTypes = [...selectedTypes.filter(t => t !== 'other')];
            if (selectedTypes.includes('other') && otherVehicleType.trim()) {
                allTypes.push(`other:${otherVehicleType.trim()}`);
            }
            data.append('allowed_vehicle_type_ids', JSON.stringify(allTypes));

            // Vehicle arrangement
            data.append('vehicle_arrangement', hasCompanyVehicle ?? 'none');
            if (hasCompanyVehicle === 'rent' || hasCompanyVehicle === 'own') {
                const filledVehicles = companyVehicles.filter(v => v.trim());
                data.append('company_vehicle_numbers', JSON.stringify(filledVehicles));
            } else {
                data.append('company_vehicle_numbers', JSON.stringify([]));
            }

            if (editingDriverId) {
                await api.put(`/admin/drivers/${editingDriverId}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setSuccessMessage('Driver updated successfully!');
                setTimeout(() => {
                    setActiveTab('list');
                    resetForm();
                }, 1500);
            } else {
                await api.post('/admin/drivers/register', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setSuccessMessage('Driver registered successfully!');
                setTimeout(() => {
                    setActiveTab('list');
                    resetForm();
                }, 1500);
            }

        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save driver');
        } finally {
            setLoading(false);
        }
    };

    const filteredDrivers = drivers.filter(d => 
        d.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.user.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 font-inter pb-20">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Driver Management</h1>
                        <p className="text-slate-500 mt-1">Manage driver accounts, registrations, and documentation.</p>
                    </div>
                    
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                                activeTab === 'list' 
                                ? 'bg-slate-900 text-white shadow-md' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <List size={16} />
                            All Drivers
                        </button>
                        <button
                            onClick={() => { resetForm(); setActiveTab('register'); }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                                activeTab === 'register' 
                                ? 'bg-slate-900 text-white shadow-md' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <UserPlus size={16} />
                            Register New
                        </button>
                    </div>
                </div>

                {successMessage && (
                    <div className="mb-6 bg-emerald-50 text-emerald-600 p-4 rounded-xl flex items-center gap-3 border border-emerald-100 animate-fade-in">
                        <Check size={20} />
                        <span className="font-medium">{successMessage}</span>
                    </div>
                )}

                {error && (
                    <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100">
                        <AlertCircle size={20} />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {activeTab === 'list' ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search by name, ID or email..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                                />
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                                        <th className="px-6 py-4">Driver Details</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">License</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                Loading drivers...
                                            </td>
                                        </tr>
                                    ) : filteredDrivers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                No drivers found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDrivers.map(driver => (
                                            <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                                            {driver.user.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800">{driver.user.name}</div>
                                                            <div className="text-xs text-slate-500">{driver.user.employee_id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-600">{driver.user.email}</div>
                                                    <div className="text-xs text-slate-400">{driver.contact_no}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-600 font-medium">{driver.license_no}</div>
                                                    <div className="text-xs text-slate-400">Exp: {new Date(driver.license_expiry).toLocaleDateString()}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                        Active
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => handleViewClick(driver)}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors mr-2"
                                                        title="View Details"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEditClick(driver)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit Details"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                        {editingDriverId && (
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <Edit2 size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-blue-900">Editing Driver Profile</h3>
                                        <p className="text-xs text-blue-700">Updating details for {formData.name} ({formData.employee_id})</p>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => { resetForm(); setActiveTab('list'); }}
                                    className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        )}

                        {/* Account Details */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg border border-slate-200 text-blue-600 shadow-sm">
                                    <User size={18} />
                                </div>
                                <h2 className="font-bold text-slate-800">Account Information</h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Employee ID</label>
                                    <input
                                        name="employee_id"
                                        required
                                        placeholder="e.g. EMP-1001"
                                        value={formData.employee_id}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Full Name</label>
                                    <input
                                        name="name"
                                        required
                                        placeholder="Full Legal Name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            placeholder="driver@company.com"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                                        Password {editingDriverId && <span className="text-slate-400 font-normal normal-case">(Leave blank to keep current)</span>}
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input
                                            name="password"
                                            type="password"
                                            required={!editingDriverId}
                                            placeholder={editingDriverId ? "••••••••" : "Create password"}
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Driver Profile */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg border border-slate-200 text-indigo-600 shadow-sm">
                                    <Truck size={18} />
                                </div>
                                <h2 className="font-bold text-slate-800">Driver Documents & Details</h2>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Mobile Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                                            <input
                                                name="contact_no"
                                                required
                                                placeholder="07X XXX XXXX"
                                                value={formData.contact_no}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">NIC Number</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-3 top-3 text-slate-400" size={18} />
                                            <input
                                                name="nic_no"
                                                required
                                                placeholder="National ID"
                                                value={formData.nic_no}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Driving License No</label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                                            <input
                                                name="license_no"
                                                required
                                                placeholder="License Number"
                                                value={formData.license_no}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">License Expiry Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                                            <input
                                                name="license_expiry"
                                                type="date"
                                                required
                                                value={formData.license_expiry}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-6">
                                    <h3 className="text-sm font-bold text-slate-700 mb-4">Required Documents</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* License Photo */}
                                        <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 transition-colors">
                                            <label className="block cursor-pointer">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Driving License Photo</span>
                                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                                    <Upload size={16} />
                                                    <span className="truncate">{files.license_photo ? files.license_photo.name : 'Choose File...'}</span>
                                                </div>
                                                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'license_photo')} required={!editingDriverId} />
                                            </label>
                                            {existingFiles.license_photo && !files.license_photo && (
                                                <div className="mt-2 text-xs text-indigo-600 flex items-center gap-1">
                                                    <Check size={12} />
                                                    <a href={existingFiles.license_photo.startsWith('/uploads') ? existingFiles.license_photo : api.defaults.baseURL + existingFiles.license_photo} target="_blank" rel="noreferrer" className="hover:underline">View Current File</a>
                                                </div>
                                            )}
                                        </div>

                                        {/* Grama Niladhari */}
                                        <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 transition-colors">
                                            <label className="block cursor-pointer">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Grama Niladhari Cert.</span>
                                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                                    <Upload size={16} />
                                                    <span className="truncate">{files.grama_niladhari_cert ? files.grama_niladhari_cert.name : 'Choose File...'}</span>
                                                </div>
                                                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'grama_niladhari_cert')} required={!editingDriverId} />
                                            </label>
                                            {existingFiles.grama_niladhari_cert && !files.grama_niladhari_cert && (
                                                <div className="mt-2 text-xs text-indigo-600 flex items-center gap-1">
                                                    <Check size={12} />
                                                    <a href={existingFiles.grama_niladhari_cert.startsWith('/uploads') ? existingFiles.grama_niladhari_cert : api.defaults.baseURL + existingFiles.grama_niladhari_cert} target="_blank" rel="noreferrer" className="hover:underline">View Current File</a>
                                                </div>
                                            )}
                                        </div>

                                        {/* Police Report */}
                                        <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 transition-colors">
                                            <label className="block cursor-pointer">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Police Report</span>
                                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                                    <Upload size={16} />
                                                    <span className="truncate">{files.police_report ? files.police_report.name : 'Choose File...'}</span>
                                                </div>
                                                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'police_report')} required={!editingDriverId} />
                                            </label>
                                            {existingFiles.police_report && !files.police_report && (
                                                <div className="mt-2 text-xs text-indigo-600 flex items-center gap-1">
                                                    <Check size={12} />
                                                    <a href={existingFiles.police_report.startsWith('/uploads') ? existingFiles.police_report : api.defaults.baseURL + existingFiles.police_report} target="_blank" rel="noreferrer" className="hover:underline">View Current File</a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Work Experience</label>
                                    <textarea
                                        name="work_experience"
                                        rows={3}
                                        placeholder="Briefly describe past driving experience..."
                                        value={formData.work_experience}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* What can you drive? */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-emerald-600 shadow-sm">
                                        <Truck size={18} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800">What Can You Drive?</h2>
                                        <p className="text-xs text-slate-400 mt-0.5">Select all vehicle types this driver is authorised to operate</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={selectAll}
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                                        Select All
                                    </button>
                                    <button type="button" onClick={clearAll}
                                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Selection counter */}
                                <div className="mb-4 flex items-center gap-2">
                                    {selectedTypes.length === 0 ? (
                                        <p className="text-xs text-amber-600 font-semibold flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                                            No vehicle types selected yet — tick at least one
                                        </p>
                                    ) : (
                                        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                                            <Check size={12} />
                                            {selectedTypes.length} vehicle type{selectedTypes.length > 1 ? 's' : ''} selected
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {VEHICLE_TYPES.map(vt => {
                                        const isSelected = selectedTypes.includes(vt.id);
                                        return (
                                            <button
                                                key={vt.id}
                                                type="button"
                                                onClick={() => toggleType(vt.id)}
                                                className={`relative flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150 group ${isSelected
                                                    ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                {/* Icon */}
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                                                    }`}>
                                                    <vt.icon size={20} strokeWidth={1.75} />
                                                </div>

                                                {/* Text */}
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-bold ${isSelected ? 'text-indigo-800' : 'text-slate-700'
                                                        }`}>{vt.label}</div>
                                                    <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{vt.desc}</div>
                                                </div>

                                                {/* Tick box */}
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected
                                                    ? 'bg-indigo-600 border-indigo-600'
                                                    : 'bg-white border-slate-300 group-hover:border-slate-400'
                                                    }`}>
                                                    {isSelected && <Check size={13} className="text-white" strokeWidth={3} />}
                                                </div>
                                            </button>
                                        );
                                    })}

                                    {/* Other card */}
                                    {(() => {
                                        const isOtherSelected = selectedTypes.includes('other');
                                        return (
                                            <div className="sm:col-span-2 lg:col-span-3">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleType('other')}
                                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150 group ${isOtherSelected
                                                        ? 'bg-slate-800 border-slate-700 shadow-sm'
                                                        : 'bg-white border-dashed border-slate-300 hover:border-slate-400 hover:shadow-sm'
                                                        }`}
                                                >
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isOtherSelected ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                                                        }`}>
                                                        <PenLine size={18} strokeWidth={1.75} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-sm font-bold ${isOtherSelected ? 'text-white' : 'text-slate-700'
                                                            }`}>Other</div>
                                                        <div className={`text-[11px] font-medium mt-0.5 ${isOtherSelected ? 'text-slate-300' : 'text-slate-400'
                                                            }`}>Not listed above? Specify your own</div>
                                                    </div>
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${isOtherSelected
                                                        ? 'bg-white border-white'
                                                        : 'bg-white border-slate-300 group-hover:border-slate-400'
                                                        }`}>
                                                        {isOtherSelected && <Check size={13} className="text-slate-800" strokeWidth={3} />}
                                                    </div>
                                                </button>

                                                {/* Expandable text field */}
                                                {isOtherSelected && (
                                                    <div className="mt-2 pl-1">
                                                        <input
                                                            type="text"
                                                            value={otherVehicleType}
                                                            onChange={e => setOtherVehicleType(e.target.value)}
                                                            placeholder="e.g. Water Bowser, Tipper, Tractor, Ambulance..."
                                                            autoFocus
                                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-sm bg-slate-50"
                                                        />
                                                        <p className="text-[10px] text-slate-400 mt-1.5 italic pl-1">Separate multiple types with commas — e.g. Tipper, Water Bowser</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Arrangement */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg border border-slate-200 text-blue-600 shadow-sm">
                                    <Car size={18} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-800">Vehicle Arrangement</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Does the driver rent a vehicle for work, or provide their own vehicle to the company?</p>
                                </div>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* 3-option selector */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                                    {/* Rents a vehicle */}
                                    <button type="button" onClick={() => setHasCompanyVehicle('rent')}
                                        className={`flex flex-col items-center gap-2.5 py-5 px-4 rounded-xl border-2 text-sm transition-all ${hasCompanyVehicle === 'rent'
                                            ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasCompanyVehicle === 'rent' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            <Key size={20} strokeWidth={1.75} />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-[13px]">Rents a Vehicle</p>
                                            <p className="text-[11px] font-medium opacity-70 mt-0.5 leading-relaxed">Driver rents a vehicle to use for company work</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${hasCompanyVehicle === 'rent' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                                            }`}>
                                            {hasCompanyVehicle === 'rent' && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                    </button>

                                    {/* Provides own vehicle */}
                                    <button type="button" onClick={() => setHasCompanyVehicle('own')}
                                        className={`flex flex-col items-center gap-2.5 py-5 px-4 rounded-xl border-2 text-sm transition-all ${hasCompanyVehicle === 'own'
                                            ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasCompanyVehicle === 'own' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            <Car size={20} strokeWidth={1.75} />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-[13px]">Provides Own Vehicle</p>
                                            <p className="text-[11px] font-medium opacity-70 mt-0.5 leading-relaxed">Driver brings their personal vehicle for company use</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${hasCompanyVehicle === 'own' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                                            }`}>
                                            {hasCompanyVehicle === 'own' && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                    </button>

                                    {/* No vehicle */}
                                    <button type="button" onClick={() => { setHasCompanyVehicle('none'); setCompanyVehicles(['']); }}
                                        className={`flex flex-col items-center gap-2.5 py-5 px-4 rounded-xl border-2 text-sm transition-all ${hasCompanyVehicle === 'none'
                                            ? 'bg-slate-100 border-slate-400 text-slate-600 shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasCompanyVehicle === 'none' ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            <Ban size={20} strokeWidth={1.75} />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-[13px]">No Vehicle</p>
                                            <p className="text-[11px] font-medium opacity-70 mt-0.5 leading-relaxed">Driver uses only company-assigned fleet vehicles</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${hasCompanyVehicle === 'none' ? 'border-slate-500 bg-slate-500' : 'border-slate-300'
                                            }`}>
                                            {hasCompanyVehicle === 'none' && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                    </button>
                                </div>

                                {/* Vehicle number rows — only if Rent or Own */}
                                {(hasCompanyVehicle === 'rent' || hasCompanyVehicle === 'own') && (
                                    <div className="space-y-3">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Vehicle Registration Number(s)</p>

                                        {companyVehicles.map((vno, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                    {i + 1}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={vno}
                                                    onChange={e => updateVehicleNo(i, e.target.value)}
                                                    placeholder={`e.g. WP CAB-${1000 + i}`}
                                                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm bg-slate-50 focus:bg-white"
                                                />
                                                {companyVehicles.length > 1 && (
                                                    <button type="button" onClick={() => removeVehicleRow(i)}
                                                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all flex-shrink-0">
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        <button type="button" onClick={addVehicleRow}
                                            className="mt-1 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                                            <Plus size={15} />
                                            Add another vehicle
                                        </button>
                                    </div>
                                )}

                                {hasCompanyVehicle === null && (
                                    <p className="text-xs text-slate-400 italic text-center py-1">Please select an option above</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 gap-3">
                             <button
                                type="button"
                                onClick={() => {
                                    if(editingDriverId) {
                                        setActiveTab('list');
                                        resetForm();
                                    } else {
                                        navigate('/admin/users');
                                    }
                                }}
                                className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 flex items-center gap-2 transition-all disabled:opacity-70"
                            >
                                {loading ? 'Saving...' : (editingDriverId ? 'Update Driver Profile' : 'Register Driver Account')}
                                {!loading && <ChevronRight size={18} />}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* View Modal */}
            {showViewModal && viewingDriver && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg">
                                    {viewingDriver.user.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{viewingDriver.user.name}</h3>
                                    <p className="text-sm text-slate-500">{viewingDriver.user.employee_id} • {viewingDriver.user.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Contact Info */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contact Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="text-xs text-slate-500 mb-1">Mobile Number</div>
                                        <div className="font-medium text-slate-800">{viewingDriver.contact_no}</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="text-xs text-slate-500 mb-1">NIC Number</div>
                                        <div className="font-medium text-slate-800">{viewingDriver.nic_no}</div>
                                    </div>
                                </div>
                            </div>

                            {/* License Info */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">License Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="text-xs text-slate-500 mb-1">License Number</div>
                                        <div className="font-medium text-slate-800">{viewingDriver.license_no}</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="text-xs text-slate-500 mb-1">Expiry Date</div>
                                        {(() => {
                                            const expiry = new Date(viewingDriver.license_expiry);
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0); // Start of today
                                            const isExpired = expiry < today;
                                            return (
                                                <div className={`font-medium ${isExpired ? 'text-red-600' : 'text-slate-800'}`}>
                                                    {expiry.toLocaleDateString()}
                                                    {isExpired && <span className="text-xs ml-2 font-bold bg-red-100 px-2 py-0.5 rounded text-red-600">EXPIRED</span>}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Arrangement */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Vehicle Arrangement</h4>
                                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                            {viewingDriver.vehicle_arrangement === 'rent' ? <Key size={16} /> :
                                                viewingDriver.vehicle_arrangement === 'own' ? <Car size={16} /> :
                                                    <Ban size={16} />}
                                        </div>
                                        <div>
                                            <div className="font-bold text-indigo-900 capitalize">
                                                {viewingDriver.vehicle_arrangement === 'rent' ? 'Rents a Vehicle' :
                                                    viewingDriver.vehicle_arrangement === 'own' ? 'Provides Own Vehicle' :
                                                        'No Vehicle (Company Fleet)'}
                                            </div>
                                        </div>
                                    </div>
                                    {(viewingDriver.company_vehicle_numbers && viewingDriver.company_vehicle_numbers.length > 0) && (
                                        <div className="mt-3 pl-11">
                                            <div className="text-xs text-indigo-400 font-semibold mb-1">REGISTERED VEHICLES</div>
                                            <div className="flex flex-wrap gap-2">
                                                {(typeof viewingDriver.company_vehicle_numbers === 'string'
                                                    ? JSON.parse(viewingDriver.company_vehicle_numbers)
                                                    : viewingDriver.company_vehicle_numbers
                                                ).map((v: string, i: number) => (
                                                    <span key={i} className="px-2 py-1 bg-white border border-indigo-200 rounded text-xs font-mono text-indigo-700 font-bold">
                                                        {v}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Documents */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Uploaded Documents</h4>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Driving License Photo', url: viewingDriver.license_photo_url, icon: FileText },
                                        { label: 'Grama Niladhari Certificate', url: viewingDriver.grama_niladhari_cert_url, icon: FileText },
                                        { label: 'Police Report', url: viewingDriver.police_report_url, icon: FileText },
                                    ].map((doc, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-blue-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 group-hover:text-blue-500 transition-colors">
                                                    <doc.icon size={16} />
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{doc.label}</span>
                                            </div>
                                            {doc.url ? (
                                                <a
                                                    href={doc.url.startsWith('/uploads') ? doc.url : api.defaults.baseURL + doc.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                >
                                                    View / Download
                                                    <ExternalLink size={12} />
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic px-3">Not Uploaded</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverRegister;
