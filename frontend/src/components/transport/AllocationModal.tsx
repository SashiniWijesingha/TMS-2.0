import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle, Truck, User, Calendar, AlertCircle } from 'lucide-react';
import { getVehicleTypes, getAllVehicles } from '../../services/vehicleService';
import { getAllocationResources, mergeRequests, updateAllocation } from '../../services/requestService';
import type { Vehicle, VehicleType, Driver, VehicleRequest } from '../../types';
import ComboSelect from '../common/ComboSelect';

interface AllocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    requests: VehicleRequest[];
    onSuccess: () => void;
    isEditMode?: boolean;
    initialVehicleTypeId?: number;
    initialVehicleId?: number;
    initialDriverId?: number;
}

type BlockedDriver = {
    driverId: number;
    name: string;
    startAt: string;
    endAt: string;
};

type BlockedVehicle = {
    vehicleId: number;
    vehicleNumber: string;
    startAt: string;
    endAt: string;
};

const AllocationModal: React.FC<AllocationModalProps> = ({
    isOpen,
    onClose,
    requests,
    onSuccess,
    isEditMode = false,
    initialVehicleTypeId,
    initialVehicleId,
    initialDriverId
}) => {
    // const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Resources
    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [blockedDrivers, setBlockedDrivers] = useState<BlockedDriver[]>([]);
    const [blockedVehicles, setBlockedVehicles] = useState<BlockedVehicle[]>([]);

    // Selection
    const [selectedTypeId, setSelectedTypeId] = useState<number | ''>('');
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
    const [selectedDriverId, setSelectedDriverId] = useState<number | ''>('');
    const [overrideAvailability, setOverrideAvailability] = useState(false);

    // Derived info
    const totalPassengers = useMemo(() => {
        return requests.reduce((sum, r) => sum + (r.passengerDetails?.no_of_passengers || 0), 0);
    }, [requests]);

    const reqDate = useMemo(() => {
        if (requests.length === 0) return '';
        return requests[0].passengerDetails?.date || requests[0].materialDetails?.date || '';
    }, [requests]);

    const isMergedGroup = requests.length > 1;

    const formatWindow = (startAt: string, endAt: string) => {
        const start = new Date(startAt);
        const end = new Date(endAt);
        const dateLabel = start.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
        const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${dateLabel} ${startTime} - ${endTime}`;
    };

    useEffect(() => {
        if (isOpen) {
            fetchResources();
            if (isEditMode) {
                setSelectedTypeId(initialVehicleTypeId || '');
                setSelectedVehicleId(initialVehicleId || '');
                setSelectedDriverId(initialDriverId || '');
                // Auto-enable override if editing (optional, but helpful if vehicle is technically busy)
                // setOverrideAvailability(true); 
            } else {
                setSelectedTypeId('');
                setSelectedVehicleId('');
                setSelectedDriverId('');
                setOverrideAvailability(false);
            }
        }
    }, [isOpen, isEditMode, initialVehicleTypeId, initialVehicleId, initialDriverId]);

    const fetchResources = async () => {
        setLoading(true);
        try {
            const [typesData, vehiclesData] = await Promise.all([
                getVehicleTypes(),
                getAllVehicles()
            ]);
            setVehicleTypes(typesData);
            setVehicles(vehiclesData);
            setDrivers([]);
            setBlockedDrivers([]);
            setBlockedVehicles([]);
        } catch (error) {
            console.error(error);
            alert('Failed to load resources');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedTypeId) {
            setDrivers([]);
            setBlockedDrivers([]);
            return;
        }

        const typeName = vehicleTypes.find(t => t.id === selectedTypeId)?.name;
        if (!typeName) return;

        let active = true;
        (async () => {
            try {
                const resource = await getAllocationResources(
                    typeName,
                    requests.map(r => r.id)
                );
                if (active) {
                    setDrivers(resource?.drivers || []);
                    setBlockedDrivers(resource?.blockedDrivers || []);
                    setBlockedVehicles(resource?.blockedVehicles || []);
                }
            } catch (error) {
                console.error(error);
            }
        })();

        return () => {
            active = false;
        };
    }, [selectedTypeId, vehicleTypes, requests]);

    useEffect(() => {
        if (!selectedDriverId || drivers.length === 0) return;
        const exists = drivers.some(d => d.id === selectedDriverId);
        if (!exists) {
            setSelectedDriverId('');
        }
    }, [drivers, selectedDriverId]);

    // Filtered Lists
    const availableVehicles = useMemo(() => {
        if (!selectedTypeId) return [];
        const blockedVehicleIds = new Set(blockedVehicles.map((v) => v.vehicleId));
        return vehicles.filter(v => v.vehicle_type_id === selectedTypeId);
    }, [vehicles, selectedTypeId]);

    const availableDrivers = useMemo(() => {
        if (!selectedTypeId) return [];
        return drivers.filter(d => {
            // Check allowed vehicle types (could be string or array)
            let allowed: any = d.allowed_vehicle_type_ids;
            if (typeof allowed === 'string') {
                try { allowed = JSON.parse(allowed); } catch { allowed = []; }
            }
            if (!Array.isArray(allowed)) return false;
            return allowed.includes(selectedTypeId);
        });
    }, [drivers, selectedTypeId]);

    const blockedVehicleIds = useMemo(() => new Set(blockedVehicles.map(v => v.vehicleId)), [blockedVehicles]);
    const blockedDriverIds = useMemo(() => new Set(blockedDrivers.map(d => d.driverId)), [blockedDrivers]);

    const vehicleOptions = useMemo(() => {
        return availableVehicles.map(v => {
            const isUnavailable = (!overrideAvailability && v.availability_status !== 'AVAILABLE' && !(isEditMode && v.id === initialVehicleId)) || blockedVehicleIds.has(v.id);
            return {
                value: v.id,
                label: v.vehicle_number,
                sub: `${v.seating_capacity} seats · ${isUnavailable ? 'Unavailable' : 'Available'}`,
                badge: isEditMode && v.id === initialVehicleId ? 'Current' : (isUnavailable ? 'Unavailable' : undefined),
                badgeVariant: isUnavailable ? 'danger' as const : 'success' as const,
                disabled: isUnavailable && !(isEditMode && v.id === initialVehicleId),
            };
        });
    }, [availableVehicles, overrideAvailability, blockedVehicleIds, isEditMode, initialVehicleId]);

    const driverOptions = useMemo(() => {
        return availableDrivers.map(d => {
            const isUnavailable = blockedDriverIds.has(d.id);
            return {
                value: d.id,
                label: d.user?.name || d.name || `Driver #${d.id}`,
                sub: isUnavailable ? 'Unavailable' : (d.contact_no || undefined),
                badge: isUnavailable ? 'Unavailable' : undefined,
                badgeVariant: isUnavailable ? 'danger' as const : 'success' as const,
                disabled: isUnavailable,
            };
        });
    }, [availableDrivers, blockedDriverIds]);

    const handleConfirm = async () => {
        if (!selectedVehicleId || !selectedDriverId) return;

        setProcessing(true);
        try {
            if (isEditMode) {
                // Update existing allocation
                // We use the first request ID as the handle (Backend resolves Trip or Allocation from it)
                const requestId = requests[0].id.toString();
                await updateAllocation(requestId, Number(selectedVehicleId), Number(selectedDriverId));
                // show success message?
            } else {
                // Create new allocation
                await mergeRequests(
                    requests.map(r => r.id),
                    Number(selectedTypeId),
                    undefined, // Start Time
                    undefined, // Attributes
                    Number(selectedVehicleId),
                    Number(selectedDriverId)
                );
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Operation Failed');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] animate-in zoom-in-95">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start gap-3 sm:items-center">
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                            {isEditMode ? 'Edit Allocation' : (isMergedGroup ? 'Allocate Merged Trip' : 'Allocate Request')}
                        </h3>
                        <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                            <Calendar size={14} /> {reqDate} • {requests.length} Request(s)
                        </p>
                    </div>
                    <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

                    {/* Summary Card */}
                    {isMergedGroup && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                            <h4 className="font-bold text-indigo-900 text-sm mb-2 flex items-center gap-2">
                                <CheckCircle size={16} /> Merged Trip Summary
                            </h4>
                            <ul className="space-y-1">
                                {requests.map(r => (
                                    <li key={r.id} className="text-xs text-indigo-800 ml-6 list-disc">
                                        #{r.id} - {r.project_name} ({r.passengerDetails?.no_of_passengers || 0} pax)
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-2 pt-2 border-t border-indigo-200/50 flex justify-between items-center text-sm font-semibold text-indigo-900">
                                <span>Total Passengers</span>
                                <span>{totalPassengers}</span>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="py-12 text-center text-slate-400">Loading resources...</div>
                    ) : (
                        <div className="space-y-6">
                            {/* Step 1: Vehicle Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">1. Select Vehicle Type</label>
                                <select
                                    value={selectedTypeId}
                                    onChange={(e) => {
                                        setSelectedTypeId(Number(e.target.value));
                                        setSelectedVehicleId('');
                                        setSelectedDriverId('');
                                    }}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                                >
                                    <option value="">-- Choose Category --</option>
                                    {vehicleTypes.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Step 2: Vehicle & Driver */}
                            {selectedTypeId && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">2. Select Vehicle</label>
                                        <ComboSelect
                                            value={selectedVehicleId}
                                            onChange={(v) => setSelectedVehicleId(v)}
                                            icon={<Truck size={16} />}
                                            placeholder="Search by plate or capacity…"
                                            emptyMessage="No vehicles match. Try 'Show unavailable'."
                                            options={vehicleOptions}
                                        />
                                        {availableVehicles.length === 0 && (
                                            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                                <AlertCircle size={12} /> No available vehicles found.
                                            </p>
                                        )}
                                        <div className="mt-2 text-xs">
                                            <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={overrideAvailability}
                                                    onChange={(e) => setOverrideAvailability(e.target.checked)}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                Show unavailable vehicles
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">3. Select Driver</label>
                                        <ComboSelect
                                            value={selectedDriverId}
                                            onChange={(v) => setSelectedDriverId(v)}
                                            icon={<User size={16} />}
                                            placeholder="Search by name or contact…"
                                            emptyMessage="No eligible drivers for this vehicle type."
                                            options={driverOptions}
                                        />
                                        {availableDrivers.length === 0 && (
                                            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                                <AlertCircle size={12} /> No eligible drivers found.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 transition-all">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 font-medium hover:bg-white rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedVehicleId || !selectedDriverId || processing}
                        className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {processing ? 'Saving...' : (isEditMode ? 'Update Allocation' : 'Confirm Allocation')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AllocationModal;

