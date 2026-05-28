import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Truck, User, Search, CheckCircle, GitMerge,
    Users, MapPin, Calendar, Clock, AlertCircle, Zap, Filter,
    Building2, Phone, X, CheckCheck
} from 'lucide-react';
import { getAllVehicles, getAllDrivers } from '../services/vehicleService';
import { getAllocationResources, mergeRequests } from '../services/requestService';
import api from '../services/api';
import type { Vehicle, Driver, Vendor } from '../types';

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

/* ─────────────────── helpers ─────────────────── */
function timeOf(r: any): string {
    return r.passengerDetails?.time ?? r.materialDetails?.time ?? '';
}

/* ─────────────────── sub-components ─────────────────── */

const TripSummaryPanel: React.FC<{ group: any }> = ({ group }) => {
    const sorted = [...group.requests].sort((a: any, b: any) =>
        timeOf(a).localeCompare(timeOf(b))
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
            {/* header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                    <GitMerge size={18} />
                </div>
                <div>
                    <h2 className="font-bold text-slate-900 text-base leading-tight">
                        Merged Trip Group
                    </h2>
                    <p className="text-xs text-slate-500">
                        {group.requests.length} requests · {group.totalPassengers} passengers
                    </p>
                </div>
            </div>

            {/* requests */}
            <div className="space-y-2">
                {sorted.map((req: any, idx: number) => (
                    <div key={req.id} className="relative pl-6">
                        {/* timeline line */}
                        {idx < sorted.length - 1 && (
                            <span className="absolute left-[7px] top-5 bottom-0 w-px bg-slate-200" />
                        )}
                        {/* dot */}
                        <span className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${idx === 0 ? 'bg-green-500 border-green-200' : idx === sorted.length - 1 ? 'bg-red-400 border-red-200' : 'bg-indigo-400 border-indigo-200'}`} />
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold text-slate-800">#{req.id} — {req.requester?.name || req.project_name}</span>
                                <span className="font-mono text-xs text-slate-500">{timeOf(req).slice(0, 5)}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <MapPin size={10} />
                                {req.passengerDetails?.pickup_location} → {req.passengerDetails?.drop_location}
                            </div>
                            <div className="flex gap-2 mt-1.5">
                                <span className="text-[10px] bg-white text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-full font-medium">
                                    {req.passengerDetails?.no_of_passengers} pax
                                </span>
                                {(req.passengerDetails?.vehicle_type || req.materialDetails?.vehicle_type) && (
                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-full font-medium">
                                        {req.passengerDetails?.vehicle_type || req.materialDetails?.vehicle_type}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* totals */}
            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 flex justify-between items-center">
                <span className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
                    <Users size={15} /> Total Passengers
                </span>
                <span className="text-lg font-bold text-indigo-700">{group.totalPassengers}</span>
            </div>

            {/* date / time */}
            {sorted[0] && (
                <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {sorted[0].passengerDetails?.date}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> Depart {timeOf(sorted[0]).slice(0, 5)}</span>
                </div>
            )}
        </div>
    );
};

/* Vehicle card */
const VehicleCard: React.FC<{
    vehicle: Vehicle;
    selected: boolean;
    onSelect: () => void;
    recommended?: boolean;
}> = ({ vehicle, selected, onSelect, recommended }) => {
    const isAvailable = vehicle.availability_status === 'AVAILABLE';
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full text-left rounded-2xl border-2 p-4 transition-all focus:outline-none ${selected
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100 shadow-md'
                : isAvailable
                    ? 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                    : 'border-slate-100 bg-slate-50 opacity-60'
                }`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-bold text-slate-900 text-sm tracking-wide">{vehicle.vehicle_number}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                    {recommended && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
                            <Zap size={8} /> Recommended
                        </span>
                    )}
                    {selected && (
                        <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                            <CheckCircle size={12} className="text-white" />
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                    {vehicle.vehicleType?.name || vehicle.vehicle_type || '—'}
                </span>
                <span className="text-[11px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    {vehicle.seating_capacity} seats
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${isAvailable
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                    {isAvailable ? 'Available' : vehicle.availability_status?.replace('_', ' ')}
                </span>
            </div>
        </button>
    );
};

/* Driver card */
const DriverCard: React.FC<{
    driver: Driver;
    selected: boolean;
    onSelect: () => void;
}> = ({ driver, selected, onSelect }) => {
    const name = driver.user?.name || driver.name || `Driver #${driver.id}`;
    const initials = name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full text-left rounded-2xl border-2 p-4 transition-all focus:outline-none flex items-center gap-3 ${selected
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100 shadow-md'
                : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                }`}
        >
            <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-sm ${selected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {initials || <User size={16} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{name}</p>
                {driver.contact_no && <p className="text-[11px] text-slate-500 mt-0.5">{driver.contact_no}</p>}
            </div>
            {selected && (
                <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                    <CheckCircle size={12} className="text-white" />
                </span>
            )}
        </button>
    );
};

/* ─────────────────── main page ─────────────────── */
const FinalizeAllocationPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const group = (location.state as any)?.group;
    const returnTo = (location.state as any)?.returnTo || '/transport/route-optimization';

    // allocation mode
    const [mode, setMode] = useState<'company' | 'vendor'>('company');

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
    const [blockedDrivers, setBlockedDrivers] = useState<BlockedDriver[]>([]);
    const [blockedVehicles, setBlockedVehicles] = useState<BlockedVehicle[]>([]);
    const [loadingResources, setLoadingResources] = useState(true);

    // vehicle picker state
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [showUnavailable, setShowUnavailable] = useState(false);
    const [ignoreCapacity, setIgnoreCapacity] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

    // driver picker state
    const [driverSearch, setDriverSearch] = useState('');
    const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);

    // vendor picker state
    const [vendorQuery, setVendorQuery] = useState('');
    const [vendorResults, setVendorResults] = useState<Vendor[]>([]);
    const [vendorLoading, setVendorLoading] = useState(false);
    const [vendorError, setVendorError] = useState<string | null>(null);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [processing, setProcessing] = useState(false);

    const formatWindow = (startAt: string, endAt: string) => {
        const start = new Date(startAt);
        const end = new Date(endAt);
        const dateLabel = start.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
        const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${dateLabel} ${startTime} - ${endTime}`;
    };

    // ── vendor helpers ────────────────────────────────────────────────────────
    const searchVendors = async (q: string) => {
        setVendorLoading(true);
        setVendorError(null);
        try {
            const res = await api.get('/vendors', { params: q ? { q } : {} });
            setVendorResults(res.data);
        } catch {
            setVendorError('Failed to load vendors.');
            setVendorResults([]);
        } finally {
            setVendorLoading(false);
        }
    };

    useEffect(() => {
        if (mode === 'vendor' && vendorResults.length === 0 && !vendorLoading) {
            searchVendors('');
        }
    }, [mode]); // eslint-disable-line

    const handleVendorSearch = (value: string) => {
        setVendorQuery(value);
        setSelectedVendor(null);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => searchVendors(value), 400);
    };

    const handleVendorConfirm = async () => {
        if (!selectedVendor || !group) return;
        setProcessing(true);
        try {
            const requestIds: number[] = group.requests.map((r: any) => r.id);
            await Promise.all(
                requestIds.map((rid: number) =>
                    api.put(`/requests/${rid}/assign-vendor`, {
                        vendor_code: selectedVendor.VENDOR_CODE,
                        vendor_name: selectedVendor.NAME,
                        vendor_mobile: selectedVendor.MOBILE_NUMBER,
                    })
                )
            );
            alert(`Vendor "${selectedVendor.NAME}" assigned. All requesters will be notified.`);
            navigate(returnTo);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to assign vendor.');
        } finally {
            setProcessing(false);
        }
    };

    // If no group data was passed, redirect back
    useEffect(() => {
        if (!group) {
            navigate(returnTo, { replace: true });
            return;
        }
        (async () => {
            setLoadingResources(true);
            try {
                const [v, d] = await Promise.all([getAllVehicles(), getAllDrivers()]);
                setVehicles(v);
                setDrivers(d);
                setAllDrivers(d);

                // Pre-select proposed vehicle if set
                if (group.proposedVehicleId && v.some((x: Vehicle) => x.id === group.proposedVehicleId)) {
                    setSelectedVehicleId(group.proposedVehicleId);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingResources(false);
            }
        })();
    }, []);  // eslint-disable-line

    useEffect(() => {
        if (!group) return;
        if (!selectedVehicleId) {
            setDrivers(allDrivers);
            setBlockedDrivers([]);
            setBlockedVehicles([]);
            return;
        }

        const vehicle = vehicles.find(v => v.id === selectedVehicleId);
        const typeName = vehicle?.vehicleType?.name || vehicle?.vehicle_type;
        if (!typeName) {
            setDrivers(allDrivers);
            setBlockedDrivers([]);
            return;
        }

        let active = true;
        (async () => {
            try {
                const resource = await getAllocationResources(
                    typeName,
                    group.requests.map((r: any) => r.id)
                );
                if (active) {
                    setDrivers(resource?.drivers || []);
                    setBlockedDrivers(resource?.blockedDrivers || []);
                    setBlockedVehicles(resource?.blockedVehicles || []);
                }
            } catch (error) {
                console.error(error);
                if (active) {
                    setDrivers(allDrivers);
                    setBlockedDrivers([]);
                    setBlockedVehicles([]);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [selectedVehicleId, vehicles, group, allDrivers]);

    useEffect(() => {
        if (!selectedDriverId || drivers.length === 0) return;
        const exists = drivers.some(d => d.id === selectedDriverId);
        if (!exists) {
            setSelectedDriverId(null);
        }
    }, [drivers, selectedDriverId]);

    const totalPax: number = group?.totalPassengers ?? 0;

    /* filtered vehicles */
    const filteredVehicles = useMemo(() => {
        const blockedVehicleIds = new Set(blockedVehicles.map((v) => v.vehicleId));
        return vehicles.filter(v => {
            if (!showUnavailable && v.availability_status !== 'AVAILABLE') return false;
            if (!ignoreCapacity && v.seating_capacity < totalPax) return false;
            if (blockedVehicleIds.has(v.id)) return false;
            if (vehicleSearch.trim()) {
                const q = vehicleSearch.toLowerCase();
                return (
                    v.vehicle_number.toLowerCase().includes(q) ||
                    (v.vehicleType?.name ?? v.vehicle_type ?? '').toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [vehicles, showUnavailable, ignoreCapacity, vehicleSearch, totalPax, blockedVehicles]);

    /* filtered drivers */
    const filteredDrivers = useMemo(() => {
        const q = driverSearch.trim().toLowerCase();
        if (!q) return drivers;
        return drivers.filter(d => {
            const name = (d.user?.name || d.name || '').toLowerCase();
            const contact = (d.contact_no || '').toLowerCase();
            return name.includes(q) || contact.includes(q);
        });
    }, [drivers, driverSearch]);

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) ?? null;
    const selectedDriver = drivers.find(d => d.id === selectedDriverId) ?? null;
    const canConfirm = mode === 'company'
        ? (!!selectedVehicleId && !!selectedDriverId && !processing)
        : (!!selectedVendor && !processing);

    const handleConfirm = async () => {
        if (!selectedVehicleId || !selectedDriverId || !group) return;
        setProcessing(true);
        try {
            const requestIds: number[] = group.requests.map((r: any) => r.id);
            const vTypeId: number = selectedVehicle?.vehicle_type_id ?? 0;
            await mergeRequests(requestIds, vTypeId, undefined, undefined, selectedVehicleId, selectedDriverId);
            alert('Allocation confirmed! Trip created successfully.');
            navigate(returnTo);
        } catch (err: any) {
            console.error(err);
            const apiMessage = err.response?.data?.message;
            const apiDetail = err.response?.data?.error;
            alert(apiDetail ? `${apiMessage}: ${apiDetail}` : (apiMessage || 'Allocation failed. Please try again.'));
        } finally {
            setProcessing(false);
        }
    };

    if (!group) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* sticky top bar */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(returnTo)}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                        <span className="h-5 w-px bg-slate-200" />
                        <h1 className="font-bold text-slate-900 text-base">Finalize Trip Allocation</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {mode === 'company' && selectedVehicle && (
                            <span className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full font-semibold">
                                <Truck size={12} /> {selectedVehicle.vehicle_number}
                            </span>
                        )}
                        {mode === 'company' && selectedDriver && (
                            <span className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full font-semibold">
                                <User size={12} /> {selectedDriver.user?.name || selectedDriver.name}
                            </span>
                        )}
                        {mode === 'vendor' && selectedVendor && (
                            <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full font-semibold">
                                <Building2 size={12} /> {selectedVendor.NAME}
                            </span>
                        )}
                        <button
                            onClick={mode === 'company' ? handleConfirm : handleVendorConfirm}
                            disabled={!canConfirm}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${canConfirm
                                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {processing ? (
                                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</span>
                            ) : (
                                <><CheckCircle size={16} /> Confirm & Allocate</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-[1400px] mx-auto px-6 py-3 flex gap-2">
                    <button
                        type="button"
                        onClick={() => setMode('company')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            mode === 'company'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Truck size={14} /> Company Vehicle
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('vendor')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            mode === 'vendor'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Building2 size={14} /> Assign Vendor
                    </button>
                </div>
            </div>

            {/* page body */}
            <div className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
                {/* ── left: trip summary (sticky on xl) ── */}
                <div className="xl:sticky xl:top-[69px] xl:self-start space-y-4">
                    <TripSummaryPanel group={group} />

                    {/* validation band */}
                    {!canConfirm && !processing && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex gap-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>
                                {mode === 'vendor'
                                    ? 'Select a vendor to continue.'
                                    : !selectedVehicleId && !selectedDriverId
                                        ? 'Select a vehicle and a driver to continue.'
                                        : !selectedVehicleId
                                            ? 'Select a vehicle to continue.'
                                            : 'Select a driver to continue.'}
                            </span>
                        </div>
                    )}
                    {selectedVehicleId && selectedVehicle && selectedVehicle.seating_capacity < totalPax && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 flex gap-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>
                                <strong>Capacity warning:</strong> {selectedVehicle.vehicle_number} holds {selectedVehicle.seating_capacity} seats but this group needs {totalPax}.
                            </span>
                        </div>
                    )}
                </div>

                {/* ── right: pickers ── */}
                <div className="space-y-8">

                    {mode === 'vendor' ? (
                        /* ── VENDOR ASSIGNMENT PANEL ── */
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Building2 size={18} className="text-amber-500" />
                                <h2 className="font-bold text-slate-900">Select Vendor Company</h2>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                {/* search */}
                                <div className="p-4 border-b border-slate-100">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            value={vendorQuery}
                                            onChange={e => handleVendorSearch(e.target.value)}
                                            placeholder="Search vendor by name or code…"
                                            className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-400"
                                        />
                                        {vendorQuery && (
                                            <button
                                                onClick={() => handleVendorSearch('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* list */}
                                <div className="max-h-96 overflow-y-auto">
                                    {vendorLoading && (
                                        <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                                            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm">Loading vendors…</span>
                                        </div>
                                    )}
                                    {!vendorLoading && vendorError && (
                                        <div className="text-center py-10 text-red-500 text-sm">{vendorError}</div>
                                    )}
                                    {!vendorLoading && !vendorError && vendorResults.length === 0 && (
                                        <div className="text-center py-12 text-slate-400 text-sm">
                                            No vendors found{vendorQuery ? ` for "${vendorQuery}"` : ''}.
                                        </div>
                                    )}
                                    {!vendorLoading && !vendorError && vendorResults.map((vendor, idx) => {
                                        const isSelected = selectedVendor?.VENDOR_CODE === vendor.VENDOR_CODE;
                                        return (
                                            <button
                                                key={`${vendor.VENDOR_CODE}-${idx}`}
                                                type="button"
                                                onClick={() => setSelectedVendor(isSelected ? null : vendor)}
                                                className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors border-b border-slate-50 last:border-0 ${
                                                    isSelected ? 'bg-amber-50' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <Building2 size={15} className={isSelected ? 'text-amber-500' : 'text-slate-300'} />
                                                    <div className="min-w-0">
                                                        <p className={`text-sm font-semibold leading-tight truncate ${
                                                            isSelected ? 'text-amber-800' : 'text-slate-800'
                                                        }`}>{vendor.NAME}</p>
                                                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{vendor.VENDOR_CODE}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Phone size={11} className="text-slate-400" />
                                                    <span className="text-xs font-mono text-slate-600">{vendor.MOBILE_NUMBER}</span>
                                                    {isSelected && <CheckCheck size={14} className="text-amber-500" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* selected vendor confirmation */}
                            {selectedVendor && (
                                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">Selected Vendor</p>
                                    <p className="text-base font-bold text-amber-900">{selectedVendor.NAME}</p>
                                    <p className="text-xs text-amber-700 font-mono mt-0.5">Code: {selectedVendor.VENDOR_CODE}</p>
                                    <p className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                                        <Phone size={11} /> {selectedVendor.MOBILE_NUMBER}
                                    </p>
                                </div>
                            )}

                            <div className="mt-4 flex items-start gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                                <p className="text-xs leading-relaxed">
                                    Assigning a vendor marks the trip as externally contracted. All requesters are automatically notified with the vendor's name and contact number. Once the assignment is completed, The transport officer is responsible for communicating trip details directly to the vendor.
                                </p>
                            </div>
                        </section>
                    ) : loadingResources ? (
                        <div className="py-24 text-center text-slate-400 text-sm">Loading fleet data…</div>
                    ) : (
                        <>
                            {/* ── VEHICLE PICKER ── */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                                        <Truck size={18} className="text-indigo-500" />
                                        1. Select Vehicle
                                        <span className="text-xs font-normal text-slate-400">({filteredVehicles.length} shown)</span>
                                    </h2>
                                </div>

                                {/* search + filters row */}
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                        <input
                                            type="text"
                                            value={vehicleSearch}
                                            onChange={e => setVehicleSearch(e.target.value)}
                                            placeholder="Search plate number or type…"
                                            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
                                        <Filter size={14} className="text-slate-400" />
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={showUnavailable}
                                                onChange={e => setShowUnavailable(e.target.checked)}
                                                className="rounded text-indigo-600 focus:ring-indigo-400"
                                            />
                                            Show unavailable
                                        </label>
                                        <span className="w-px h-4 bg-slate-200" />
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={ignoreCapacity}
                                                onChange={e => setIgnoreCapacity(e.target.checked)}
                                                className="rounded text-indigo-600 focus:ring-indigo-400"
                                            />
                                            Ignore capacity ({totalPax} pax)
                                        </label>
                                    </div>
                                </div>

                                {blockedVehicles.length > 0 && (
                                    <div className="mb-4 text-xs text-amber-700 flex items-start gap-2">
                                        <AlertCircle size={12} className="mt-0.5" />
                                        <span>
                                            {blockedVehicles.length} vehicle(s) hidden due to schedule conflicts.
                                            {blockedVehicles[0]
                                                ? ` Example: ${blockedVehicles[0].vehicleNumber} busy ${formatWindow(blockedVehicles[0].startAt, blockedVehicles[0].endAt)}.`
                                                : ''}
                                        </span>
                                    </div>
                                )}

                                {filteredVehicles.length === 0 ? (
                                    <div className="py-10 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
                                        <Truck size={32} className="mx-auto mb-2 opacity-20" />
                                        No vehicles match the current filters.
                                        <br />
                                        <span className="text-xs">Try enabling "Show unavailable" or "Ignore capacity".</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
                                        {filteredVehicles.map(v => (
                                            <VehicleCard
                                                key={v.id}
                                                vehicle={v}
                                                selected={selectedVehicleId === v.id}
                                                onSelect={() => setSelectedVehicleId(v.id)}
                                                recommended={group.proposedVehicleId === v.id}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* ── DRIVER PICKER ── */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                                        <User size={18} className="text-indigo-500" />
                                        2. Select Driver
                                        <span className="text-xs font-normal text-slate-400">({filteredDrivers.length} shown)</span>
                                    </h2>
                                </div>

                                <div className="relative mb-4 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                    <input
                                        type="text"
                                        value={driverSearch}
                                        onChange={e => setDriverSearch(e.target.value)}
                                        placeholder="Search by name or contact number…"
                                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                </div>
                                {blockedDrivers.length > 0 && (
                                    <div className="mb-4 text-xs text-amber-700 flex items-start gap-2">
                                        <AlertCircle size={12} className="mt-0.5" />
                                        <span>
                                            {blockedDrivers.length} driver(s) hidden due to schedule conflicts.
                                            {blockedDrivers[0]
                                                ? ` Example: ${blockedDrivers[0].name} busy ${formatWindow(blockedDrivers[0].startAt, blockedDrivers[0].endAt)}.`
                                                : ''}
                                        </span>
                                    </div>
                                )}

                                {filteredDrivers.length === 0 ? (
                                    <div className="py-10 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
                                        <User size={32} className="mx-auto mb-2 opacity-20" />
                                        No drivers found.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
                                        {filteredDrivers.map(d => (
                                            <DriverCard
                                                key={d.id}
                                                driver={d}
                                                selected={selectedDriverId === d.id}
                                                onSelect={() => setSelectedDriverId(d.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* bottom confirm strip */}
                            {(selectedVehicleId || selectedDriverId) && (
                                <div className="sticky bottom-4 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="text-sm text-slate-600 flex flex-wrap gap-4">
                                        <span className="flex items-center gap-2">
                                            <Truck size={15} className={selectedVehicleId ? 'text-indigo-500' : 'text-slate-300'} />
                                            {selectedVehicle
                                                ? <><strong>{selectedVehicle.vehicle_number}</strong> · {selectedVehicle.seating_capacity} seats</>
                                                : <span className="text-slate-400">No vehicle selected</span>}
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <User size={15} className={selectedDriverId ? 'text-indigo-500' : 'text-slate-300'} />
                                            {selectedDriver
                                                ? <strong>{selectedDriver.user?.name || selectedDriver.name}</strong>
                                                : <span className="text-slate-400">No driver selected</span>}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={!canConfirm}
                                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all ${canConfirm
                                            ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {processing
                                            ? <><span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Processing…</>
                                            : <><CheckCircle size={16} /> Confirm Allocation</>}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinalizeAllocationPage;
