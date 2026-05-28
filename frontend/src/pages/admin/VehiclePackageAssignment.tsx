import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Car,
    Search,
    PackageSearch,
    CheckCircle,
    XCircle,
    AlertCircle,
    Link2,
    Link2Off,
    Tag
} from 'lucide-react';
import { getAllVehicles, assignPackageToVehicle } from '../../services/vehicleService';
import { getTransportPackages } from '../../services/packageService';
import type { Vehicle, TransportPackage } from '../../types';

const VehiclePackageAssignment: React.FC = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [packages, setPackages] = useState<TransportPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [selectedPackageId, setSelectedPackageId] = useState<number | ''>('');
    const [isAssigning, setIsAssigning] = useState(false);
    
    // Alert states
    const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [vehiclesData, packagesData] = await Promise.all([
                getAllVehicles(),
                getTransportPackages()
            ]);
            setVehicles(vehiclesData);
            // Only active packages can be assigned
            setPackages(packagesData.filter(p => p.status === 'ACTIVE'));
        } catch (error) {
            console.error('Failed to fetch data:', error);
            showAlert('error', 'Failed to load vehicles and packages');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const showAlert = (type: 'success' | 'error', message: string) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const handleOpenAssignModal = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setSelectedPackageId(vehicle.active_package_id || '');
        setShowAssignModal(true);
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVehicle) return;

        setIsAssigning(true);
        try {
            const packageToAssign = selectedPackageId === '' ? null : Number(selectedPackageId);
            await assignPackageToVehicle(selectedVehicle.id, packageToAssign);
            
            showAlert('success', packageToAssign ? 'Package assigned successfully' : 'Package unassigned successfully');
            setShowAssignModal(false);
            fetchData(); // Refresh to get the updated vehicle with its package details
        } catch (error: any) {
            showAlert('error', error.response?.data?.message || 'Failed to assign package');
        } finally {
            setIsAssigning(false);
        }
    };

    const filteredVehicles = vehicles.filter(v => 
        v.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.vehicleType?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get compatible packages for the selected vehicle
    const compatiblePackages = selectedVehicle 
        ? packages.filter(p => p.vehicle_type_id === selectedVehicle.vehicle_type_id)
        : [];

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <PackageSearch className="text-indigo-600" size={32} />
                        Package Assignment
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Link active pricing structures to your registered fleet.</p>
                </div>
            </div>

            {/* Alert */}
            <AnimatePresence>
                {alert && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-2xl flex items-center gap-3 font-semibold text-sm shadow-sm ${
                            alert.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                        }`}
                    >
                        {alert.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        {alert.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Controls */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by vehicle number or type..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-800"
                    />
                </div>
            </div>

            {/* Vehicle Grid */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
            ) : filteredVehicles.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Car className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No vehicles found</h3>
                    <p className="text-slate-500 mt-1">Try adjusting your search terms.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredVehicles.map(vehicle => (
                        <div key={vehicle.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-slate-50 text-slate-700 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <Car size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">{vehicle.vehicle_number}</h3>
                                            <p className="text-xs font-semibold text-slate-500">{vehicle.vehicleType?.name || 'Unknown Type'}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg ${
                                        vehicle.active_package_id ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                    }`}>
                                        {vehicle.active_package_id ? 'Assigned' : 'Unassigned'}
                                    </span>
                                </div>
                                
                                <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Tag size={12} /> Active Pricing Package
                                    </div>
                                    {vehicle.activePackage ? (
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm">{vehicle.activePackage.package_name}</div>
                                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                <span className="font-semibold text-indigo-600">{vehicle.activePackage.package_category}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>LKR {vehicle.activePackage.extra_km_rate}/KM</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm font-medium text-slate-400 italic">No package assigned</div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                <button
                                    onClick={() => handleOpenAssignModal(vehicle)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-sm font-semibold rounded-xl shadow-sm transition-all"
                                >
                                    {vehicle.active_package_id ? <Link2 size={16} /> : <Link2Off size={16} />}
                                    {vehicle.active_package_id ? 'Change Package' : 'Assign Package'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ASSIGN MODAL */}
            <AnimatePresence>
                {showAssignModal && selectedVehicle && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl relative"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-600" />
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Assign Package</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Vehicle: <span className="text-slate-800 font-bold">{selectedVehicle.vehicle_number}</span></p>
                                </div>
                                <button
                                    onClick={() => setShowAssignModal(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <XCircle size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleAssign}>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Select Pricing Package</label>
                                        <select
                                            value={selectedPackageId}
                                            onChange={e => setSelectedPackageId(e.target.value ? Number(e.target.value) : '')}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-800"
                                        >
                                            <option value="">-- No Package (Unassigned) --</option>
                                            {compatiblePackages.map(pkg => (
                                                <option key={pkg.id} value={pkg.id}>
                                                    {pkg.package_name} ({pkg.package_category})
                                                </option>
                                            ))}
                                        </select>
                                        
                                        {compatiblePackages.length === 0 && (
                                            <p className="text-xs text-amber-600 mt-2 font-medium flex items-start gap-1">
                                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                                No active packages found matching this vehicle's type ({selectedVehicle.vehicleType?.name}). You need to create a compatible package first.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-3xl">
                                    <button
                                        type="button"
                                        onClick={() => setShowAssignModal(false)}
                                        className="px-5 py-2 text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-xl text-sm font-bold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isAssigning || (compatiblePackages.length === 0 && selectedPackageId !== '')}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isAssigning && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                        Apply Assignment
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VehiclePackageAssignment;
