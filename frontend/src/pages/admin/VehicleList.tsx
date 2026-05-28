import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus, Search, Truck, User as UserIcon, Trash2, X, Edit2,
    Settings, Building2, Briefcase, LayoutGrid, Rows3
} from 'lucide-react';
import { getAllVehicles, getAllDrivers, assignDriverToVehicle, deleteVehicle } from '../../services/vehicleService';
import type { Vehicle } from '../../types';

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        'AVAILABLE': 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-emerald-500/10',
        'MAINTENANCE': 'bg-amber-50 text-amber-700 border-amber-100 ring-amber-500/10',
        'ALLOCATED': 'bg-indigo-50 text-indigo-700 border-indigo-100 ring-indigo-500/10',
        'ON_TRIP': 'bg-violet-50 text-violet-700 border-violet-100 ring-violet-500/10',
    };

    const style = styles[status] || 'bg-slate-50 text-slate-600 border-slate-100 ring-slate-500/10';

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ring-1 ring-inset ${style}`}>
            {status.replace(/_/g, ' ')}
        </span>
    );
};

const VehicleList: React.FC = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
        const savedView = localStorage.getItem('vehicle-fleet-view-mode');
        return savedView === 'table' ? 'table' : 'cards';
    });

    // Stats
    const stats = useMemo(() => ({
        total: vehicles.length,
        available: vehicles.filter(v => v.availability_status === 'AVAILABLE').length,
        active: vehicles.filter(v => ['ALLOCATED', 'ON_TRIP'].includes(v.availability_status)).length,
        maintenance: vehicles.filter(v => v.availability_status === 'MAINTENANCE').length
    }), [vehicles]);

    // Modal State
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        localStorage.setItem('vehicle-fleet-view-mode', viewMode);
    }, [viewMode]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAllVehicles();
            setVehicles(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v => {
            const matchesSearch = v.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (v.vehicleType?.name || v.vehicle_type || '').toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;
            if (filterStatus === 'ALL') return true;
            if (filterStatus === 'ACTIVE') return ['ALLOCATED', 'ON_TRIP'].includes(v.availability_status);
            return v.availability_status === filterStatus;
        });
    }, [vehicles, searchTerm, filterStatus]);

    const handleAssignClick = async (vehicle: Vehicle) => {
        try {
            const driversData = await getAllDrivers();
            setDrivers(driversData);
            setSelectedVehicle(vehicle);
            setSelectedDriverId(vehicle.assigned_driver_id ? vehicle.assigned_driver_id.toString() : '');
            setAssignModalOpen(true);
        } catch (error) {
            alert('Failed to load drivers');
        }
    };

    const handleAssignSubmit = async () => {
        if (!selectedVehicle) return;
        try {
            await assignDriverToVehicle(selectedVehicle.id, selectedDriverId ? parseInt(selectedDriverId) : null);
            setAssignModalOpen(false);
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to assign driver');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this vehicle?')) return;
        try {
            await deleteVehicle(id);
            fetchData();
        } catch (error) {
            alert('Failed to delete vehicle');
        }
    };

    const viewOptions = [
        { id: 'cards' as const, label: 'Cards', icon: LayoutGrid },
        { id: 'table' as const, label: 'Table', icon: Rows3 },
    ];

    return (
        <div className="p-3 space-y-3 font-inter text-slate-900 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Vehicle Fleet</h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-sm">
                            <Truck size={12} />
                            <span className="font-semibold text-slate-700">{stats.total}</span> Total
                        </div>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-emerald-600 font-medium">{stats.available} Available</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-indigo-600 font-medium">{stats.active} Active</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        to="/admin/vendors"
                        className="desktop-btn desktop-btn-secondary min-w-0"
                    >
                        <Briefcase size={14} /> Vendors
                    </Link>
                    <Link
                        to="/admin/vehicle-categories"
                        className="desktop-btn desktop-btn-secondary min-w-0"
                    >
                        <Settings size={14} /> Categories
                    </Link>
                    <Link
                        to="/admin/vehicles/new"
                        className="desktop-btn desktop-btn-accent min-w-0"
                    >
                        <Plus size={14} /> Add Vehicle
                    </Link>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex p-0.5 bg-slate-100/50 rounded-lg w-full md:w-auto overflow-x-auto">
                    {[
                        { id: 'ALL', label: 'All Fleet' },
                        { id: 'AVAILABLE', label: 'Available' },
                        { id: 'ACTIVE', label: 'Active' },
                        { id: 'MAINTENANCE', label: 'Maintenance' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${filterStatus === tab.id
                                ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        {viewOptions.map((option) => {
                            const Icon = option.icon;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setViewMode(option.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === option.id
                                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                                        : 'text-slate-500 hover:bg-white hover:text-slate-700'
                                        }`}
                                    aria-pressed={viewMode === option.id}
                                >
                                    <Icon size={14} />
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative w-full md:w-64 mr-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search fleet number..."
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            {loading ? (
                <div className="text-center py-20 text-slate-400 text-sm">Loading fleet data...</div>
            ) : filteredVehicles.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-500 text-sm">No vehicles match your search.</p>
                </div>
            ) : viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {filteredVehicles.map(vehicle => (
                        <div
                            key={vehicle.id}
                            className="group bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:border-indigo-200 transition-all duration-200 flex flex-col relative overflow-hidden"
                        >
                            <div className="p-3 flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md bg-indigo-50/50 text-indigo-600 flex items-center justify-center border border-indigo-100/50">
                                            <Truck size={14} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm leading-none">{vehicle.vehicle_number}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[10px] text-slate-500 font-medium">{vehicle.vehicleType?.name}</p>
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${vehicle.ownership === 'VENDOR' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                    {vehicle.ownership === 'VENDOR' ? <><Briefcase size={8} /> Vendor</> : <><Building2 size={8} /> Company</>}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Action Menu Trigger - Hover Only (or Keep simple) */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex gap-1 bg-white/90 backdrop-blur rounded-lg p-0.5 border border-slate-200 shadow-sm">
                                        <button
                                            onClick={() => handleDelete(vehicle.id)}
                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        <Link
                                            to={`/admin/vehicles/${vehicle.id}/edit`}
                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
                                            title="Edit"
                                        >
                                            <Edit2 size={12} />
                                        </Link>
                                    </div>
                                </div>

                                {/* Details Blocks */}
                                <div className="space-y-2 mt-1.5">
                                    <div className="flex items-center justify-between">
                                        <StatusBadge status={vehicle.availability_status} />
                                    </div>

                                    {/* Driver Block */}
                                    <div className={`rounded-md px-2 py-1.5 border flex items-center gap-2 ${vehicle.assignedDriver
                                        ? 'bg-slate-50 border-slate-100'
                                        : 'bg-slate-50/30 border-slate-100 border-dashed'
                                        }`}>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] uppercase font-bold shrink-0 ${vehicle.assignedDriver
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'bg-slate-200 text-slate-400'
                                            }`}>
                                            {vehicle.assignedDriver ? vehicle.assignedDriver.user?.name?.charAt(0) : <UserIcon size={10} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide leading-none mb-0.5">Assigned Driver</p>
                                            <p className={`text-[11px] font-medium truncate ${vehicle.assignedDriver ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                                {vehicle.assignedDriver ? vehicle.assignedDriver.user?.name : 'Unassigned'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Action */}
                            <button
                                onClick={() => handleAssignClick(vehicle)}
                                className={`w-full py-1.5 text-[10px] font-bold uppercase tracking-wider border-t transition-colors ${vehicle.assigned_driver_id
                                    ? 'bg-white border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                    : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                                    }`}
                            >
                                {vehicle.assigned_driver_id ? 'Change' : 'Assign'}
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <th className="px-4 py-3">Vehicle</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Ownership</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Driver</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredVehicles.map(vehicle => (
                                    <tr key={vehicle.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
                                                    <Truck size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{vehicle.vehicle_number}</p>
                                                    <p className="text-xs text-slate-500">Fleet vehicle</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{vehicle.vehicleType?.name || vehicle.vehicle_type || 'Unknown'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${vehicle.ownership === 'VENDOR'
                                                ? 'border-blue-100 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 bg-slate-100 text-slate-700'
                                                }`}>
                                                {vehicle.ownership === 'VENDOR' ? <Briefcase size={12} /> : <Building2 size={12} />}
                                                {vehicle.ownership === 'VENDOR' ? 'Vendor' : 'Company'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={vehicle.availability_status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="min-w-0">
                                                <p className={`truncate font-medium ${vehicle.assignedDriver ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                                    {vehicle.assignedDriver ? vehicle.assignedDriver.user?.name : 'Unassigned'}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {vehicle.assignedDriver ? 'Assigned driver' : 'No driver linked'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAssignClick(vehicle)}
                                                    className={`desktop-btn min-w-0 px-3 py-2 text-xs ${vehicle.assigned_driver_id
                                                        ? 'desktop-btn-secondary'
                                                        : 'desktop-btn-accent'
                                                        }`}
                                                >
                                                    {vehicle.assigned_driver_id ? 'Change Driver' : 'Assign Driver'}
                                                </button>
                                                <Link
                                                    to={`/admin/vehicles/${vehicle.id}/edit`}
                                                    className="desktop-btn-icon desktop-btn-icon-primary h-9 w-9 rounded-lg"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={15} />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(vehicle.id)}
                                                    className="desktop-btn-icon desktop-btn-icon-danger h-9 w-9 rounded-lg"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {assignModalOpen && selectedVehicle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Assign Driver</h2>
                            <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                                <div className="p-2 bg-white rounded-md border border-slate-200 shadow-sm text-indigo-600">
                                    <Truck size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Target Vehicle</p>
                                    <p className="text-sm font-bold text-slate-900">{selectedVehicle.vehicle_number}</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase ml-1">Select Driver</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <select
                                        value={selectedDriverId}
                                        onChange={(e) => setSelectedDriverId(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                    >
                                        <option value="">-- No Driver (Unassigned) --</option>
                                        {drivers.map(d => (
                                            <option key={d.id} value={d.id}>
                                                {d.user?.name || `Driver ${d.id}`} - {d.user?.employee_id || 'ID'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setAssignModalOpen(false)}
                                    className="flex-1 py-2 text-sm bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssignSubmit}
                                    className="flex-1 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors shadow-sm"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehicleList;
