import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    User, Phone, Truck, CreditCard, ChevronLeft, CheckCircle2, AlertCircle,
    Building2, Search, X, CheckCheck
} from 'lucide-react';
import api from '../services/api';
import type { Vendor } from '../types';

type Mode = 'company' | 'vendor';

const AllocationPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>('company');
    const [loading, setLoading] = useState(false);

    // ── Company allocation state ─────────────────────────────────────────────
    const [formData, setFormData] = useState({
        driver_name: '',
        contact_no: '',
        vehicle_number: '',
        nic_no: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCompanySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/requests/${id}/allocate`, formData);
            navigate('/transport/allocations');
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Failed to allocate vehicle.');
        } finally {
            setLoading(false);
        }
    };

    // ── Vendor assignment state ──────────────────────────────────────────────
    const [vendorQuery, setVendorQuery] = useState('');
    const [vendorResults, setVendorResults] = useState<Vendor[]>([]);
    const [vendorLoading, setVendorLoading] = useState(false);
    const [vendorError, setVendorError] = useState<string | null>(null);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Load vendor list when switching to vendor tab
    useEffect(() => {
        if (mode === 'vendor' && vendorResults.length === 0 && !vendorLoading) {
            searchVendors('');
        }
    }, [mode]);

    const handleVendorSearch = (value: string) => {
        setVendorQuery(value);
        setSelectedVendor(null);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => searchVendors(value), 400);
    };

    const handleVendorAssign = async () => {
        if (!selectedVendor) return;
        setLoading(true);
        try {
            await api.put(`/requests/${id}/assign-vendor`, {
                vendor_code: selectedVendor.VENDOR_CODE,
                vendor_name: selectedVendor.NAME,
                vendor_mobile: selectedVendor.MOBILE_NUMBER,
            });
            navigate('/transport/allocations');
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Failed to assign vendor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="desktop-page-narrow max-w-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Allocate Transport</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Request #{id} — choose a company vehicle or assign to a vendor</p>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="desktop-btn-icon desktop-btn-icon-neutral"
                    title="Go Back"
                >
                    <ChevronLeft size={20} />
                </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-4 bg-slate-50">
                <button
                    type="button"
                    onClick={() => setMode('company')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors ${
                        mode === 'company'
                            ? 'bg-white text-slate-900 shadow-sm border-r border-slate-200'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Truck size={14} />
                    Company Vehicle
                </button>
                <button
                    type="button"
                    onClick={() => setMode('vendor')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors ${
                        mode === 'vendor'
                            ? 'bg-white text-slate-900 shadow-sm border-l border-slate-200'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Building2 size={14} />
                    Assign Vendor
                </button>
            </div>

            {/* ── Company Vehicle Form ──────────────────────────────────────── */}
            {mode === 'company' && (
                <>
                    <div className="desktop-section-card p-6">
                        <form onSubmit={handleCompanySubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                        Driver Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            name="driver_name"
                                            required
                                            value={formData.driver_name}
                                            onChange={handleChange}
                                            className="desktop-input pl-8 text-xs sm:text-sm"
                                            placeholder="Enter driver's name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                        Contact Number <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="tel"
                                            name="contact_no"
                                            required
                                            value={formData.contact_no}
                                            onChange={handleChange}
                                            className="desktop-input pl-8 text-xs sm:text-sm"
                                            placeholder="e.g. 077 123 4567"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                        Vehicle Number <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Truck className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            name="vehicle_number"
                                            required
                                            value={formData.vehicle_number}
                                            onChange={handleChange}
                                            placeholder="e.g. WP CA-1234"
                                            className="desktop-input pl-8 text-xs sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                        NIC No <span className="text-slate-300 font-normal normal-case">(Optional)</span>
                                    </label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            name="nic_no"
                                            value={formData.nic_no}
                                            onChange={handleChange}
                                            className="desktop-input pl-8 text-xs sm:text-sm"
                                            placeholder="Driver's NIC"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="desktop-btn desktop-btn-secondary text-xs sm:text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="desktop-btn desktop-btn-accent text-xs sm:text-sm"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={14} />
                                            <span>Confirm Allocation</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded text-blue-700">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] leading-tight">
                            By confirming this allocation, the requester will be notified via SMS/Email. Ensure all driver and vehicle details are accurate before proceeding.
                        </p>
                    </div>
                </>
            )}

            {/* ── Vendor Assignment Panel ───────────────────────────────────── */}
            {mode === 'vendor' && (
                <>
                    <div className="desktop-section-card overflow-hidden">
                        {/* Search */}
                        <div className="p-4 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    value={vendorQuery}
                                    onChange={e => handleVendorSearch(e.target.value)}
                                    placeholder="Search vendor by name or code..."
                                    className="desktop-input pl-9 pr-8 text-sm w-full"
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

                        {/* Vendor List */}
                        <div className="max-h-72 overflow-y-auto">
                            {vendorLoading && (
                                <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs">Loading vendors...</span>
                                </div>
                            )}

                            {!vendorLoading && vendorError && (
                                <div className="text-center py-8 text-red-500 text-xs">{vendorError}</div>
                            )}

                            {!vendorLoading && !vendorError && vendorResults.length === 0 && (
                                <div className="text-center py-10 text-slate-400 text-xs">
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
                                            isSelected
                                                ? 'bg-blue-50 border-blue-100'
                                                : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Building2 size={15} className={isSelected ? 'text-blue-500' : 'text-slate-300'} />
                                            <div className="min-w-0">
                                                <p className={`text-sm font-medium leading-tight truncate ${isSelected ? 'text-blue-800' : 'text-slate-800'}`}>
                                                    {vendor.NAME}
                                                </p>
                                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                                    {vendor.VENDOR_CODE}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Phone size={11} className="text-slate-400" />
                                            <span className="text-xs font-mono text-slate-600">{vendor.MOBILE_NUMBER}</span>
                                            {isSelected && <CheckCheck size={14} className="text-blue-500" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected Vendor Confirmation */}
                    {selectedVendor && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">Selected Vendor</p>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-blue-900">{selectedVendor.NAME}</p>
                                    <p className="text-xs text-blue-600 font-mono mt-0.5">
                                        Code: {selectedVendor.VENDOR_CODE}
                                    </p>
                                    <p className="text-xs text-blue-700 flex items-center gap-1 mt-1">
                                        <Phone size={11} /> {selectedVendor.MOBILE_NUMBER}
                                    </p>
                                </div>
                                <button
                                    onClick={handleVendorAssign}
                                    disabled={loading}
                                    className="desktop-btn desktop-btn-accent text-xs whitespace-nowrap flex-shrink-0"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Assigning...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={13} />
                                            <span>Assign to Request</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded text-amber-700">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] leading-tight">
                            Assigning a vendor means the vehicle and driver details will be arranged by the vendor company.
                            The requester will be notified with the vendor's name and contact number.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default AllocationPage;
