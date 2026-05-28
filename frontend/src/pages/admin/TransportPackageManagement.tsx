import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    Filter,
    Clock,
    Edit2,
    Trash2,
    Calendar,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronLeft,
    TrendingUp,
    Gauge,
    Maximize2,
    Fuel,
    Car,
    Layers,
    Info,
    FileText
} from 'lucide-react';
import {
    getTransportPackages,
    createTransportPackage,
    updateTransportPackage,
    updateTransportPackageStatus,
    deleteTransportPackage,
    getPackageHistory,
    getFuelTypes,
    createFuelType,
    updateFuelType,
    deleteFuelType
} from '../../services/packageService';
import { getVehicleTypes } from '../../services/vehicleService';
import type { TransportPackage, FuelType, VehicleType } from '../../types';
import type { PackageFilters } from '../../services/packageService';

const TransportPackageManagement: React.FC = () => {
    const navigate = useNavigate();

    // Tabs: 'packages' | 'fuels'
    const [activeTab, setActiveTab] = useState<'packages' | 'fuels'>('packages');

    // Resources
    const [packages, setPackages] = useState<TransportPackage[]>([]);
    const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filters, setFilters] = useState<PackageFilters>({
        vehicle_type_id: '',
        fuel_type_id: '',
        ac_type: '',
        package_category: '',
        status: '',
        search: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    // Modals
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<TransportPackage | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const [showFuelModal, setShowFuelModal] = useState(false);
    const [selectedFuel, setSelectedFuel] = useState<FuelType | null>(null);

    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [packageHistoryList, setPackageHistoryList] = useState<TransportPackage[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    // Package Form state
    const [pkgForm, setPkgForm] = useState({
        package_name: '',
        vehicle_type_id: '',
        fuel_type_id: '',
        ac_type: 'AC' as 'AC' | 'NON_AC',
        package_category: 'MONTHLY' as 'MONTHLY' | 'PER_KM' | 'DAILY',
        km_limit: '',
        day_limit: '',
        base_amount: '',
        extra_km_rate: '',
        additional_day_rate: '',
        additional_day_km_limit: '',
        ot_rate: '',
        night_out_rate: '',
        effective_date: new Date().toISOString().split('T')[0],
        status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
    });

    // Fuel Form state
    const [fuelForm, setFuelForm] = useState<{
        name: string;
        current_price: string;
        new_price: string;
        effective_date: string;
        status: 'ACTIVE' | 'INACTIVE';
        document: File | null;
    }>({
        name: '',
        current_price: '',
        new_price: '',
        effective_date: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        document: null
    });

    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        try {
            setLoading(true);
            const [pkgsData, fuelsData, typesData] = await Promise.all([
                getTransportPackages(filters),
                getFuelTypes(),
                getVehicleTypes()
            ]);
            setPackages(pkgsData);
            setFuelTypes(fuelsData);
            setVehicleTypes(typesData);
        } catch (error) {
            console.error('Failed to load pricing data', error);
            showError('Failed to load system resources.');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = async () => {
        try {
            setLoading(true);
            const data = await getTransportPackages(filters);
            setPackages(data);
        } catch (error) {
            console.error(error);
            showError('Failed to filter packages.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetFilters = async () => {
        const reset = {
            vehicle_type_id: '',
            fuel_type_id: '',
            ac_type: '',
            package_category: '',
            status: '',
            search: ''
        };
        setFilters(reset);
        try {
            setLoading(true);
            const data = await getTransportPackages(reset);
            setPackages(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const showError = (msg: string) => {
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(''), 5000);
    };

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 5000);
    };

    // Open Package Modal
    const openPackageModal = (pkg: TransportPackage | null = null) => {
        setErrorMessage('');
        if (pkg) {
            setSelectedPackage(pkg);
            setIsEditMode(true);
            setPkgForm({
                package_name: pkg.package_name,
                vehicle_type_id: String(pkg.vehicle_type_id),
                fuel_type_id: String(pkg.fuel_type_id),
                ac_type: pkg.ac_type,
                package_category: pkg.package_category,
                km_limit: pkg.km_limit ? String(pkg.km_limit) : '',
                day_limit: pkg.day_limit ? String(pkg.day_limit) : '',
                base_amount: pkg.base_amount ? String(pkg.base_amount) : '',
                extra_km_rate: String(pkg.extra_km_rate),
                additional_day_rate: pkg.additional_day_rate ? String(pkg.additional_day_rate) : '',
                additional_day_km_limit: pkg.additional_day_km_limit ? String(pkg.additional_day_km_limit) : '',
                ot_rate: String(pkg.ot_rate),
                night_out_rate: String(pkg.night_out_rate),
                effective_date: pkg.effective_date,
                status: pkg.status
            });
        } else {
            setSelectedPackage(null);
            setIsEditMode(false);
            setPkgForm({
                package_name: '',
                vehicle_type_id: vehicleTypes[0]?.id ? String(vehicleTypes[0].id) : '',
                fuel_type_id: fuelTypes[0]?.id ? String(fuelTypes[0].id) : '',
                ac_type: 'AC',
                package_category: 'MONTHLY',
                km_limit: '',
                day_limit: '',
                base_amount: '',
                extra_km_rate: '',
                additional_day_rate: '',
                additional_day_km_limit: '',
                ot_rate: '',
                night_out_rate: '',
                effective_date: new Date().toISOString().split('T')[0],
                status: 'ACTIVE'
            });
        }
        setShowPackageModal(true);
    };

    // Save Package
    const handleSavePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        const payload: Partial<TransportPackage> = {
            package_name: pkgForm.package_name,
            vehicle_type_id: parseInt(pkgForm.vehicle_type_id),
            fuel_type_id: parseInt(pkgForm.fuel_type_id),
            ac_type: pkgForm.ac_type,
            package_category: pkgForm.package_category,
            extra_km_rate: parseFloat(pkgForm.extra_km_rate),
            ot_rate: parseFloat(pkgForm.ot_rate),
            night_out_rate: parseFloat(pkgForm.night_out_rate),
            effective_date: pkgForm.effective_date,
            status: pkgForm.status
        };

        if (pkgForm.package_category === 'MONTHLY' || pkgForm.package_category === 'DAILY') {
            payload.base_amount = pkgForm.base_amount ? parseFloat(pkgForm.base_amount) : null;
            payload.km_limit = pkgForm.km_limit ? parseInt(pkgForm.km_limit) : null;
            payload.day_limit = pkgForm.day_limit ? parseInt(pkgForm.day_limit) : null;
            payload.additional_day_rate = pkgForm.additional_day_rate ? parseFloat(pkgForm.additional_day_rate) : null;
        } else {
            payload.base_amount = null;
            payload.km_limit = null;
            payload.day_limit = null;
            payload.additional_day_rate = null;
        }

        try {
            if (isEditMode && selectedPackage) {
                const res = await updateTransportPackage(selectedPackage.id, payload);
                if ((res as any).historyCreated) {
                    showSuccess('Rates modified. Created a new package rate version for historical logs.');
                } else {
                    showSuccess('Transport package updated successfully.');
                }
            } else {
                await createTransportPackage(payload);
                showSuccess('Transport package created successfully.');
            }
            setShowPackageModal(false);
            loadAllData();
        } catch (error: any) {
            console.error(error);
            showError(error.response?.data?.message || 'Error occurred while saving the package.');
        }
    };

    // Toggle Package Status
    const handleTogglePackageStatus = async (pkg: TransportPackage) => {
        const nextStatus = pkg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        try {
            await updateTransportPackageStatus(pkg.id, nextStatus);
            showSuccess(`Package ${pkg.package_name} is now ${nextStatus.toLowerCase()}.`);
            loadAllData();
        } catch (error: any) {
            console.error(error);
            showError(error.response?.data?.message || 'Failed to update package status.');
        }
    };

    // Delete Package
    const handleDeletePackage = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this transport package? This action cannot be undone.')) {
            return;
        }

        try {
            await deleteTransportPackage(id);
            showSuccess('Transport package deleted.');
            loadAllData();
        } catch (error: any) {
            console.error(error);
            showError('Failed to delete package.');
        }
    };

    // View Package Details & Rate History
    const viewPackageDetails = async (pkg: TransportPackage) => {
        setSelectedPackage(pkg);
        setShowDetailsModal(true);
        setLoadingHistory(true);
        try {
            const history = await getPackageHistory({
                vehicle_type_id: pkg.vehicle_type_id,
                fuel_type_id: pkg.fuel_type_id,
                ac_type: pkg.ac_type,
                package_name: pkg.package_name,
                package_category: pkg.package_category
            });
            setPackageHistoryList(history);
        } catch (error) {
            console.error('Failed to load package history', error);
            showError('Failed to load rate version timeline.');
        } finally {
            setLoadingHistory(false);
        }
    };

    // Fuel Type Modals
    const openFuelModal = (fuel: FuelType | null = null) => {
        setErrorMessage('');
        if (fuel) {
            setSelectedFuel(fuel);
            setFuelForm({
                name: fuel.name,
                current_price: String(fuel.current_price),
                new_price: String(fuel.new_price || ''),
                effective_date: fuel.effective_date,
                status: fuel.status,
                document: null
            });
        } else {
            setSelectedFuel(null);
            setFuelForm({
                name: '',
                current_price: '',
                new_price: '',
                effective_date: new Date().toISOString().split('T')[0],
                status: 'ACTIVE',
                document: null
            });
        }
        setShowFuelModal(true);
    };

    const handleSaveFuel = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        try {
            const formData = new FormData();
            formData.append('name', fuelForm.name);
            formData.append('current_price', fuelForm.current_price);
            formData.append('new_price', fuelForm.new_price);
            formData.append('effective_date', fuelForm.effective_date);
            formData.append('status', fuelForm.status);
            if (fuelForm.document) {
                formData.append('document', fuelForm.document);
            }

            if (selectedFuel) {
                await updateFuelType(selectedFuel.id, formData);
                showSuccess('Fuel price updated successfully.');
            } else {
                await createFuelType(formData);
                showSuccess('Fuel type added.');
            }
            setShowFuelModal(false);
            loadAllData();
        } catch (error: any) {
            console.error(error);
            showError(error.response?.data?.message || 'Failed to save fuel type.');
        }
    };

    const handleDeleteFuel = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this fuel index?')) return;
        try {
            await deleteFuelType(id);
            loadAllData();
        } catch (error: any) {
            if (error.response?.status !== 400) {
                console.error('Error deleting fuel type:', error);
            }
            showError(error.response?.data?.message || 'Failed to delete fuel type. Ensure it is not linked to any packages.');
        }
    };



    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = packages.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(packages.length / itemsPerPage);

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 px-4 md:px-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <button onClick={() => navigate('/transport/admin')} className="hover:text-slate-800 flex items-center gap-1">
                            <ChevronLeft size={14} /> Back to Transport Admin
                        </button>
                        <span>/</span>
                        <span className="font-semibold text-slate-800">Pricing Packages</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Gauge className="text-indigo-600" size={32} />
                        Transport Pricing Management
                    </h1>
                    <p className="text-slate-500 mt-1">Configure pricing templates, package KM limits, fuel rate indexes, and driver KM rate cards.</p>
                </div>

                <div className="flex gap-3">
                    {activeTab === 'packages' ? (
                        <button
                            onClick={() => openPackageModal()}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-md transition-colors"
                        >
                            <Plus size={18} /> Create Package
                        </button>
                    ) : (
                        <button
                            onClick={() => openFuelModal()}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-md transition-colors"
                        >
                            <Plus size={18} /> Add Fuel Type
                        </button>
                    )}
                </div>
            </div>

            {/* Error / Success Alerts */}
            <AnimatePresence>
                {errorMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3"
                    >
                        <AlertCircle size={20} className="mt-0.5 shrink-0" />
                        <div>
                            <p className="font-semibold">Operation Error</p>
                            <p className="text-sm">{errorMessage}</p>
                        </div>
                    </motion.div>
                )}

                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-start gap-3"
                    >
                        <CheckCircle size={20} className="mt-0.5 shrink-0" />
                        <div>
                            <p className="font-semibold">Success</p>
                            <p className="text-sm">{successMessage}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('packages')}
                    className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'packages' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <Layers size={16} /> Transport Packages
                </button>
                <button
                    onClick={() => setActiveTab('fuels')}
                    className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'fuels' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <Fuel size={16} /> Fuel Price Master
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-950 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-500">Loading pricing setup...</p>
                </div>
            ) : activeTab === 'packages' ? (
                <div className="space-y-6">
                    {/* Search & Filter Panel */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search packages by name..."
                                    value={filters.search}
                                    onChange={e => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 text-sm transition-all placeholder:text-slate-400"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`px-4 py-2.5 border rounded-xl flex items-center gap-2 text-sm font-medium transition-colors ${showFilters ? 'bg-slate-50 border-slate-900 text-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Filter size={16} />
                                    <span>Filters</span>
                                </button>
                                <button
                                    onClick={handleApplyFilters}
                                    className="bg-slate-950 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={handleResetFilters}
                                    className="border border-slate-200 text-slate-500 hover:text-slate-800 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Expandable filters */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
                                >
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Vehicle Type</label>
                                        <select
                                            value={filters.vehicle_type_id}
                                            onChange={e => setFilters({ ...filters, vehicle_type_id: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-xl text-sm outline-none bg-white"
                                        >
                                            <option value="">All Types</option>
                                            {vehicleTypes.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Fuel Type</label>
                                        <select
                                            value={filters.fuel_type_id}
                                            onChange={e => setFilters({ ...filters, fuel_type_id: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-xl text-sm outline-none bg-white"
                                        >
                                            <option value="">All Fuel Types</option>
                                            {fuelTypes.map(f => (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">AC/Non-AC</label>
                                        <select
                                            value={filters.ac_type}
                                            onChange={e => setFilters({ ...filters, ac_type: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-xl text-sm outline-none bg-white"
                                        >
                                            <option value="">All Options</option>
                                            <option value="AC">A/C Vehicles</option>
                                            <option value="NON_AC">Non-A/C Vehicles</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Category</label>
                                        <select
                                            value={filters.package_category}
                                            onChange={e => setFilters({ ...filters, package_category: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-xl text-sm outline-none bg-white"
                                        >
                                            <option value="">All Categories</option>
                                            <option value="MONTHLY">Monthly Package</option>
                                            <option value="PER_KM">Per KM pricing</option>
                                        </select>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Packages Table / Cards */}
                    {packages.length === 0 ? (
                        <div className="bg-slate-50 text-center py-16 rounded-2xl border border-dashed border-slate-200">
                            <Info size={36} className="mx-auto text-slate-400 mb-3" />
                            <p className="text-slate-600 font-semibold text-lg">No Pricing Packages Configured</p>
                            <p className="text-slate-400 text-sm mt-1 mb-6">Create your first transport pricing package template to begin calculations.</p>
                            <button
                                onClick={() => openPackageModal()}
                                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
                            >
                                Get Started
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Package details</th>
                                            <th className="px-6 py-4">Vehicle & Fuel</th>
                                            <th className="px-6 py-4">Limits</th>
                                            <th className="px-6 py-4">Pricing Rates (LKR)</th>
                                            <th className="px-6 py-4 text-center">Effective Date</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                                        {currentItems.map(pkg => (
                                            <tr key={pkg.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{pkg.package_name}</div>
                                                    <div className="flex gap-1.5 mt-1">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                            pkg.package_category === 'MONTHLY' ? 'bg-indigo-50 text-indigo-700' : 
                                                            pkg.package_category === 'DAILY' ? 'bg-emerald-50 text-emerald-700' : 
                                                            'bg-amber-50 text-amber-700'
                                                        }`}>
                                                            {pkg.package_category === 'MONTHLY' ? 'Monthly' : 
                                                             pkg.package_category === 'DAILY' ? 'Daily' : 
                                                             'Per KM'}
                                                        </span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${pkg.ac_type === 'AC' ? 'bg-sky-50 text-sky-700' : 'bg-orange-50 text-orange-700'}`}>
                                                            {pkg.ac_type === 'AC' ? 'A/C' : 'Non-A/C'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900 flex items-center gap-1">
                                                        <Car size={14} className="text-slate-400" />
                                                        {pkg.vehicleType?.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Fuel size={12} className="text-slate-400" />
                                                        {pkg.fuelType?.name} index
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {(pkg.package_category === 'MONTHLY' || pkg.package_category === 'DAILY') ? (
                                                        <div className="space-y-0.5">
                                                            <div className="text-xs font-medium text-slate-900">{pkg.km_limit?.toLocaleString()} KM limit</div>
                                                            <div className="text-[11px] text-slate-500">{pkg.day_limit} Day limit</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">N/A (Unlimited)</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        {(pkg.package_category === 'MONTHLY' || pkg.package_category === 'DAILY') && (
                                                            <div className="text-xs flex justify-between gap-4">
                                                                <span className="text-slate-400">Base Amount:</span>
                                                                <span className="font-semibold text-slate-900">LKR {pkg.base_amount?.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        <div className="text-xs flex justify-between gap-4">
                                                            <span className="text-slate-400">Extra KM Rate:</span>
                                                            <span className="font-bold text-indigo-600">LKR {pkg.extra_km_rate}</span>
                                                        </div>
                                                        {(pkg.package_category === 'MONTHLY' || pkg.package_category === 'DAILY') && pkg.additional_day_rate && (
                                                            <div className="text-xs flex justify-between gap-4">
                                                                <span className="text-slate-400">Addl Day Rate:</span>
                                                                <span className="font-semibold text-slate-900">LKR {pkg.additional_day_rate}</span>
                                                            </div>
                                                        )}
                                                        <div className="text-xs flex justify-between gap-4 border-t border-slate-50 pt-1">
                                                            <span className="text-slate-400">OT / Night Out:</span>
                                                            <span className="text-[11px] font-semibold text-slate-500">LKR {pkg.ot_rate} / {pkg.night_out_rate}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                                                        <Calendar size={12} />
                                                        {pkg.effective_date}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleTogglePackageStatus(pkg)}
                                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${pkg.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                                    >
                                                        {pkg.status === 'ACTIVE' ? (
                                                            <>
                                                                <CheckCircle size={12} /> Active
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle size={12} /> Inactive
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => viewPackageDetails(pkg)}
                                                            title="View details & historical rate timeline"
                                                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                                        >
                                                            <Clock size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => openPackageModal(pkg)}
                                                            title="Edit package settings"
                                                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePackage(pkg.id)}
                                                            title="Delete package permanent"
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                    <div className="text-xs text-slate-500">
                                        Showing <span className="font-semibold text-slate-700">{indexOfFirstItem + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(indexOfLastItem, packages.length)}</span> of <span className="font-semibold text-slate-700">{packages.length}</span> packages
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-semibold flex items-center gap-1"
                                        >
                                            <ChevronLeft size={14} /> Previous
                                        </button>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${currentPage === page ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-semibold flex items-center gap-1"
                                        >
                                            Next <motion.span animate={{ x: currentPage === totalPages ? 0 : [0, 2, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="inline-block">→</motion.span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Fuel Prices Master List */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md relative overflow-hidden flex flex-col justify-between h-44">
                            <div>
                                <TrendingUp className="text-indigo-400 mb-2" size={24} />
                                <h3 className="text-lg font-bold">Standard Fuel Index</h3>
                                <p className="text-xs text-indigo-300">Synchronized price calculations for company/vendor vehicle driver KM pricing payouts.</p>
                            </div>
                            <div className="flex justify-between items-end border-t border-indigo-800/40 pt-3">
                                <div>
                                    <span className="text-3xl font-extrabold">{fuelTypes.filter(f => f.status === 'ACTIVE').length}</span>
                                    <span className="text-xs text-indigo-300 ml-1.5">Active indexes</span>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[70px] opacity-20 transform translate-x-1/3 -translate-y-1/3"></div>
                        </div>

                        {fuelTypes.map(fuel => (
                            <div key={fuel.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-44 hover:shadow-md transition-shadow relative">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-slate-50 text-slate-700 rounded-lg">
                                                <Fuel size={18} />
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-base">{fuel.name}</h4>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${fuel.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {fuel.status}
                                        </span>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-extrabold text-slate-900">LKR {fuel.current_price}</span>
                                            {fuel.previous_price && (
                                                <span className="text-xs text-slate-400 line-through">
                                                    LKR {fuel.previous_price}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1 mt-1">
                                            <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">previous price</span>
                                                <span className="text-xs font-bold text-slate-700">LKR {fuel.new_price || '0.00'}</span>
                                            </div>
                                            {fuel.document_path && (
                                                <a 
                                                    href={`${import.meta.env.VITE_API_BASE_URL}/${fuel.document_path}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-0.5 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 w-fit"
                                                >
                                                    <FileText size={10} /> View HOD Signature
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-slate-500 text-xs mt-2 flex items-center gap-1">
                                        <Calendar size={11} />
                                        Effective: {fuel.effective_date}
                                    </p>
                                </div>

                                <div className="flex justify-between gap-2 border-t border-slate-100 pt-3">
                                    <div className="flex gap-2">
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openFuelModal(fuel)}
                                            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors text-slate-500 hover:text-slate-950 hover:bg-slate-50 border-slate-200"
                                        >
                                            Update Price
                                        </button>
                                        <button
                                            onClick={() => handleDeleteFuel(fuel.id)}
                                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PACKAGE CREATION/EDIT DIALOG (MODAL) */}
            <AnimatePresence>
                {showPackageModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl relative"
                        >
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700" />

                            <div className="px-8 pt-8 pb-4 border-b border-slate-100">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {isEditMode ? 'Modify Transport Package' : 'Create Pricing Package Template'}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {isEditMode 
                                        ? 'If you modify rates, a new historical rate log version will be created automatically under the specified effective date.'
                                        : 'Configure pricing templates exactly like corporate transport memos.'}
                                </p>
                            </div>

                            <form onSubmit={handleSavePackage}>
                                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                                    {/* Package Name */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Package Name *</label>
                                        <input
                                            required
                                            type="text"
                                            value={pkgForm.package_name}
                                            onChange={e => setPkgForm({ ...pkgForm, package_name: e.target.value })}
                                            placeholder="e.g. Executive Car Monthly Package A"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm transition-all"
                                        />
                                    </div>

                                    {/* Category & Types */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Vehicle Type *</label>
                                            <select
                                                required
                                                value={pkgForm.vehicle_type_id}
                                                onChange={e => setPkgForm({ ...pkgForm, vehicle_type_id: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white"
                                            >
                                                {vehicleTypes.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Fuel Type Index *</label>
                                            <select
                                                required
                                                value={pkgForm.fuel_type_id}
                                                onChange={e => setPkgForm({ ...pkgForm, fuel_type_id: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white"
                                            >
                                                {fuelTypes.map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* AC status and Category */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">AC / Non AC Type *</label>
                                            <select
                                                required
                                                value={pkgForm.ac_type}
                                                onChange={e => setPkgForm({ ...pkgForm, ac_type: e.target.value as any })}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white"
                                            >
                                                <option value="AC">A/C Vehicle pricing</option>
                                                <option value="NON_AC">Non-A/C Vehicle pricing</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Package Category *</label>
                                            <select
                                                required
                                                value={pkgForm.package_category}
                                                onChange={e => setPkgForm({ ...pkgForm, package_category: e.target.value as any })}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white"
                                            >
                                                <option value="MONTHLY">Monthly Package</option>
                                                <option value="DAILY">Daily Package</option>
                                                <option value="PER_KM">Per KM pricing</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Monthly limit and base configuration */}
                                    {(pkgForm.package_category === 'MONTHLY' || pkgForm.package_category === 'DAILY') && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-5 border border-slate-200 rounded-2xl bg-slate-50 space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4"
                                        >
                                            <h3 className="col-span-full font-bold text-slate-900 text-xs uppercase tracking-wider">
                                                {pkgForm.package_category === 'MONTHLY' ? 'Monthly' : 'Daily'} Package Configurations
                                            </h3>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-2">Base Package Amount (LKR) *</label>
                                                <input
                                                    required
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={pkgForm.base_amount}
                                                    onChange={e => setPkgForm({ ...pkgForm, base_amount: e.target.value })}
                                                    placeholder="e.g. 180000.00"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-2">Package KM Limit *</label>
                                                <input
                                                    required
                                                    type="number"
                                                    min="0"
                                                    value={pkgForm.km_limit}
                                                    onChange={e => setPkgForm({ ...pkgForm, km_limit: e.target.value })}
                                                    placeholder="e.g. 3000"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-2">Package Day Limit *</label>
                                                <input
                                                    required
                                                    type="number"
                                                    min="0"
                                                    value={pkgForm.day_limit}
                                                    onChange={e => setPkgForm({ ...pkgForm, day_limit: e.target.value })}
                                                    placeholder="e.g. 30"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-2">Additional Day Package Rate (LKR)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={pkgForm.additional_day_rate}
                                                    onChange={e => setPkgForm({ ...pkgForm, additional_day_rate: e.target.value })}
                                                    placeholder="e.g. 6000.00"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-2">Additional Day KM Limit</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={pkgForm.additional_day_km_limit}
                                                    onChange={e => setPkgForm({ ...pkgForm, additional_day_km_limit: e.target.value })}
                                                    placeholder="e.g. 100"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white"
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Operational pricing rates */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Extra KM Rate (LKR) *</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={pkgForm.extra_km_rate}
                                                onChange={e => setPkgForm({ ...pkgForm, extra_km_rate: e.target.value })}
                                                placeholder="e.g. 60.00"
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">OT Charges/hr (LKR) *</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={pkgForm.ot_rate}
                                                onChange={e => setPkgForm({ ...pkgForm, ot_rate: e.target.value })}
                                                placeholder="e.g. 500.00"
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Night Out rate (LKR) *</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={pkgForm.night_out_rate}
                                                onChange={e => setPkgForm({ ...pkgForm, night_out_rate: e.target.value })}
                                                placeholder="e.g. 1500.00"
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Effective date & Initial status */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Effective Date *</label>
                                            <input
                                                required
                                                type="date"
                                                value={pkgForm.effective_date}
                                                onChange={e => setPkgForm({ ...pkgForm, effective_date: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Active Status *</label>
                                            <select
                                                required
                                                value={pkgForm.status}
                                                onChange={e => setPkgForm({ ...pkgForm, status: e.target.value as any })}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white"
                                            >
                                                <option value="ACTIVE">Active (available for Calculations)</option>
                                                <option value="INACTIVE">Inactive (disabled)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-3xl">
                                    <button
                                        type="button"
                                        onClick={() => setShowPackageModal(false)}
                                        className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-slate-950 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                                    >
                                        {isEditMode ? 'Update Details' : 'Publish Package'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* FUEL TYPE CREATE/EDIT MODAL */}
            <AnimatePresence>
                {showFuelModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl relative"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900" />
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900">
                                    {selectedFuel ? 'Update Fuel Rate Index' : 'Add New Fuel Type Index'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Configure baseline fuel rates to adjust driver transport payouts.</p>
                            </div>
                            <form onSubmit={handleSaveFuel}>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Fuel Name *</label>
                                        <input
                                            required
                                            type="text"
                                            disabled={!!selectedFuel}
                                            value={fuelForm.name}
                                            onChange={e => setFuelForm({ ...fuelForm, name: e.target.value })}
                                            placeholder="e.g. Diesel Auto / Petrol 95"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm disabled:bg-slate-50 text-slate-800 font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">New Price *</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={fuelForm.current_price}
                                            onChange={e => setFuelForm({ ...fuelForm, current_price: e.target.value })}
                                            placeholder="e.g. 340.00"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm text-slate-800 font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">previous price *</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={fuelForm.new_price}
                                            onChange={e => setFuelForm({ ...fuelForm, new_price: e.target.value })}
                                            placeholder="e.g. 300.00"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm text-slate-800 font-medium"
                                        />
                                    </div>
                                    {selectedFuel && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">HOD Approval Signature (PDF)</label>
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                onChange={e => setFuelForm({ ...fuelForm, document: e.target.files ? e.target.files[0] : null })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm text-slate-800"
                                            />
                                            {selectedFuel?.document_path && (
                                                <p className="text-[10px] text-blue-600 mt-1">
                                                    <a href={`${import.meta.env.VITE_API_BASE_URL}/${selectedFuel.document_path}`} target="_blank" rel="noopener noreferrer">
                                                        View existing signature
                                                    </a>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Price Effective Date *</label>
                                        <input
                                            required
                                            type="date"
                                            value={fuelForm.effective_date}
                                            onChange={e => setFuelForm({ ...fuelForm, effective_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm text-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Index Status</label>
                                        <select
                                            value={fuelForm.status}
                                            onChange={e => setFuelForm({ ...fuelForm, status: e.target.value as any })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white text-slate-800"
                                        >
                                            <option value="ACTIVE">Active Index</option>
                                            <option value="INACTIVE">Inactive Index</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 rounded-b-3xl">
                                    <button
                                        type="button"
                                        onClick={() => setShowFuelModal(false)}
                                        className="px-4 py-2 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-slate-950 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Save
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* PACKAGE DETAILS & HISTORICAL RATE VERSIONS DIALOG (TIMELINE) */}
            <AnimatePresence>
                {showDetailsModal && selectedPackage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl border border-slate-200 w-full max-w-3xl overflow-hidden shadow-2xl relative"
                        >
                            <div className="absolute top-0 left-0 right-0 h-2 bg-slate-900" />
                            <div className="px-8 pt-8 pb-4 border-b border-slate-100 flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        <Maximize2 className="text-slate-400" size={20} />
                                        {selectedPackage.package_name} details
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        Category: <span className="font-semibold">{selectedPackage.package_category}</span> | AC Status: <span className="font-semibold">{selectedPackage.ac_type}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="p-1 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                                {/* Current config */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase font-bold">Vehicle Type</div>
                                        <div className="font-bold text-slate-900 text-sm mt-1">{selectedPackage.vehicleType?.name}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase font-bold">Fuel Type Index</div>
                                        <div className="font-bold text-slate-900 text-sm mt-1">{selectedPackage.fuelType?.name}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase font-bold">Category</div>
                                        <div className="font-bold text-slate-900 text-sm mt-1">{selectedPackage.package_category}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase font-bold">AC / Non AC</div>
                                        <div className="font-bold text-slate-900 text-sm mt-1">{selectedPackage.ac_type}</div>
                                    </div>
                                </div>

                                {/* Historical Rate Versions Timeline */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                                        <Clock size={16} /> Rate Change History (Version Log)
                                    </h3>

                                    {loadingHistory ? (
                                        <div className="flex justify-center py-6">
                                            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
                                        </div>
                                    ) : packageHistoryList.length === 0 ? (
                                        <p className="text-slate-500 text-xs italic">No historical rates found.</p>
                                    ) : (
                                        <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-6">
                                            {packageHistoryList.map((version, index) => (
                                                <div key={version.id} className="relative">
                                                    {/* Timeline node */}
                                                    <span className={`absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-4 border-white ${version.status === 'ACTIVE' ? 'bg-indigo-600' : 'bg-slate-400'}`}></span>
                                                    
                                                    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                                    Effective: {version.effective_date}
                                                                </span>
                                                                {index === 0 && version.status === 'ACTIVE' && (
                                                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                                                                        CURRENT RATES
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${version.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                                {version.status}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                            {(version.package_category === 'MONTHLY' || version.package_category === 'DAILY') && (
                                                                <>
                                                                    <div>
                                                                        <span className="text-slate-400">Base Amount:</span>
                                                                        <div className="font-semibold text-slate-800">LKR {version.base_amount?.toLocaleString()}</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-slate-400">KM Limit:</span>
                                                                        <div className="font-semibold text-slate-800">{version.km_limit} KM</div>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div>
                                                                <span className="text-slate-400">Extra KM Rate:</span>
                                                                <div className="font-bold text-indigo-600">LKR {version.extra_km_rate}</div>
                                                            </div>
                                                            {(version.package_category === 'MONTHLY' || version.package_category === 'DAILY') && version.additional_day_rate && (
                                                                <div>
                                                                    <span className="text-slate-400">Addl Day Rate:</span>
                                                                    <div className="font-semibold text-slate-800">LKR {version.additional_day_rate}</div>
                                                                </div>
                                                            )}
                                                            {(version.package_category === 'MONTHLY' || version.package_category === 'DAILY') && version.additional_day_km_limit !== null && version.additional_day_km_limit !== undefined && (
                                                                <div>
                                                                    <span className="text-slate-400">Addl Day KM:</span>
                                                                    <div className="font-semibold text-slate-800">{version.additional_day_km_limit} KM</div>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <span className="text-slate-400">OT Hourly:</span>
                                                                <div className="font-semibold text-slate-800">LKR {version.ot_rate}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-400">Night Out:</span>
                                                                <div className="font-semibold text-slate-800">LKR {version.night_out_rate}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end rounded-b-3xl">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-850 transition-colors"
                                >
                                    Close Details
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TransportPackageManagement;
