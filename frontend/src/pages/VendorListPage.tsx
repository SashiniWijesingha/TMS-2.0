import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, Building2, ChevronLeft, RefreshCw, Copy, CheckCheck, X } from 'lucide-react';
import api from '../services/api';
import type { Vendor } from '../types';
import { useNavigate } from 'react-router-dom';

const VendorListPage: React.FC = () => {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchVendors = async (q: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/vendors', { params: q ? { q } : {} });
            setVendors(res.data);
        } catch (err: any) {
            setError('Failed to load vendor list. Please try again.');
            setVendors([]);
        } finally {
            setLoading(false);
        }
    };

    // Load all on mount
    useEffect(() => {
        fetchVendors('');
    }, []);

    // Debounced search
    const handleSearch = (value: string) => {
        setQuery(value);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchVendors(value), 400);
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    return (
        <div className="desktop-page-narrow max-w-4xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vendor Companies</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Browse registered transport vendor companies from HRIS
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchVendors(query)}
                        className="desktop-btn-icon desktop-btn-icon-neutral"
                        title="Refresh"
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="desktop-btn-icon desktop-btn-icon-neutral"
                        title="Go Back"
                    >
                        <ChevronLeft size={20} />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="desktop-section-card p-4 mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                        type="text"
                        value={query}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search by vendor name or code..."
                        className="desktop-input pl-9 pr-9 text-sm w-full"
                    />
                    {query && (
                        <button
                            onClick={() => handleSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Results */}
            <div className="desktop-section-card overflow-hidden">
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-[140px_1fr_160px] gap-4 px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vendor Code</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company Name</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile</span>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Loading vendors...</span>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-12 text-red-600 gap-2">
                        <p className="text-sm font-medium">{error}</p>
                        <button
                            onClick={() => fetchVendors(query)}
                            className="text-xs text-blue-600 underline hover:no-underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && vendors.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                        <Building2 size={32} className="opacity-30" />
                        <p className="text-sm">No vendors found{query ? ` for "${query}"` : ''}.</p>
                    </div>
                )}

                {/* Vendor Rows */}
                {!loading && !error && vendors.length > 0 && (
                    <div className="divide-y divide-slate-50">
                        {vendors.map((vendor, idx) => {
                            const rowId = `${vendor.VENDOR_CODE}-${idx}`;
                            return (
                                <div
                                    key={rowId}
                                    className="grid grid-cols-1 md:grid-cols-[140px_1fr_160px] gap-2 md:gap-4 px-4 py-3 hover:bg-slate-50 transition-colors"
                                >
                                    {/* Vendor Code */}
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {vendor.VENDOR_CODE}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(vendor.VENDOR_CODE, `code-${rowId}`)}
                                            className="text-slate-300 hover:text-slate-500 transition-colors"
                                            title="Copy code"
                                        >
                                            {copiedCode === `code-${rowId}` ? (
                                                <CheckCheck size={12} className="text-emerald-500" />
                                            ) : (
                                                <Copy size={12} />
                                            )}
                                        </button>
                                    </div>

                                    {/* Company Name */}
                                    <div className="flex items-center gap-2">
                                        <Building2 size={13} className="text-slate-400 flex-shrink-0 hidden md:block" />
                                        <span className="text-sm font-medium text-slate-800 leading-tight">
                                            {vendor.NAME}
                                        </span>
                                    </div>

                                    {/* Mobile */}
                                    <div className="flex items-center gap-2">
                                        <Phone size={12} className="text-slate-400 flex-shrink-0" />
                                        <span className="text-sm font-mono text-slate-700">
                                            {vendor.MOBILE_NUMBER}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(vendor.MOBILE_NUMBER, `mob-${rowId}`)}
                                            className="text-slate-300 hover:text-slate-500 transition-colors"
                                            title="Copy number"
                                        >
                                            {copiedCode === `mob-${rowId}` ? (
                                                <CheckCheck size={12} className="text-emerald-500" />
                                            ) : (
                                                <Copy size={12} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer count */}
                {!loading && !error && vendors.length > 0 && (
                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
                        <p className="text-[11px] text-slate-400">
                            {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} shown
                            {vendors.length >= 50 && query
                                ? ' — refine your search to narrow results'
                                : vendors.length >= 100
                                ? ' — showing first 100, use search to filter'
                                : ''}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorListPage;
