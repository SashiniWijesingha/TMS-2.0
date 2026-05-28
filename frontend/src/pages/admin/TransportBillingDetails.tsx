import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { getTripEntryById } from '../../services/tripEntryService';
import type { TripEntry } from '../../types';

const TransportBillingDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [entry, setEntry] = useState<TripEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEntry = async () => {
            try {
                setLoading(true);
                setError(null);
                if (!id) {
                    setError('Billing entry not found.');
                    return;
                }
                const data = await getTripEntryById(id);
                setEntry(data);
            } catch (err: any) {
                const message = err?.response?.data?.message || err.message || 'Failed to load billing details.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchEntry();
    }, [id]);

    const formatCurrency = (value: number | string) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(value || 0));
    };

    const driverName = entry?.driver?.user?.name || (entry ? `Driver #${entry.driver_id}` : '--');
    const vehicleLabel = entry?.vehicle?.vehicle_number || (entry ? `Vehicle #${entry.vehicle_id}` : '--');

    const kmBreakdown = useMemo(() => {
        if (!entry) return null;
        const effectiveLimit = entry.km_limit === null
            ? null
            : Number(entry.km_limit || 0) + Math.max(0, Number(entry.total_trip_days) - 1) * Number(entry.additional_day_km_limit || 0);

        return {
            effectiveLimit,
            extraKm: Number(entry.extra_km || 0),
            totalKm: Number(entry.total_km || 0)
        };
    }, [entry]);

    if (loading) {
        return <div className="p-6 text-slate-500">Loading billing details...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
            <style>{`
                @media print {
                    .print-hidden {
                        display: none !important;
                    }
                    .print-root {
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            `}</style>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 print-hidden">
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/transport-billing"
                        className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800"
                    >
                        <ArrowLeft size={16} className="mr-2" />
                        Back to History
                    </Link>
                </div>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                >
                    <Printer size={16} className="mr-2" />
                    Print
                </button>
            </div>

            {error ? (
                <div className="p-6 text-center text-red-600">{error}</div>
            ) : entry ? (
                <div className="space-y-6 print-root">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                        <h1 className="text-2xl font-bold text-slate-800">Billing Details</h1>
                        <p className="text-sm text-slate-500 mt-1">Full calculation breakdown and trip summary.</p>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <p className="text-xs uppercase text-slate-500 font-semibold">Trip Date</p>
                                <p className="text-lg font-semibold text-slate-800 mt-2">{entry.entry_date}</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <p className="text-xs uppercase text-slate-500 font-semibold">Driver</p>
                                <p className="text-lg font-semibold text-slate-800 mt-2">{driverName}</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <p className="text-xs uppercase text-slate-500 font-semibold">Vehicle</p>
                                <p className="text-lg font-semibold text-slate-800 mt-2">{vehicleLabel}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-800">Package Info</h2>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-xs uppercase text-slate-500 font-semibold">Package</p>
                                <p className="font-semibold text-slate-800 mt-1">{entry.package_name}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 font-semibold">Category</p>
                                <p className="font-semibold text-slate-800 mt-1">{entry.package_category}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-500 font-semibold">Trip Days</p>
                                <p className="font-semibold text-slate-800 mt-1">{entry.total_trip_days}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-slate-800">KM Breakdown</h2>
                            <div className="mt-4 space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Total KM</span>
                                    <span className="font-semibold text-slate-800">{Number(entry.total_km || 0).toFixed(1)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Effective KM Limit</span>
                                    <span className="font-semibold text-slate-800">
                                        {kmBreakdown?.effectiveLimit === null ? 'Unlimited' : Number(kmBreakdown?.effectiveLimit || 0).toFixed(1)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Extra KM</span>
                                    <span className="font-semibold text-slate-800">{Number(entry.extra_km || 0).toFixed(1)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-slate-800">Charges</h2>
                            <div className="mt-4 space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Base Amount</span>
                                    <span className="font-semibold text-slate-800">{formatCurrency(entry.base_amount_total)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Extra KM Amount</span>
                                    <span className="font-semibold text-slate-800">{formatCurrency(entry.extra_km_amount)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Additional Day Amount</span>
                                    <span className="font-semibold text-slate-800">{formatCurrency(entry.additional_day_amount)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">OT Amount</span>
                                    <span className="font-semibold text-slate-800">{formatCurrency(entry.ot_amount)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Night Out Amount</span>
                                    <span className="font-semibold text-slate-800">{formatCurrency(entry.night_out_amount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase text-emerald-600 font-semibold">Final Amount</p>
                                <p className="text-2xl font-bold text-emerald-700 mt-2">{formatCurrency(entry.final_amount)}</p>
                            </div>
                            <div className="text-right text-sm text-emerald-700">
                                <p>Status: {entry.status || 'SAVED'}</p>
                                <p>OT Hours: {entry.ot_hours}</p>
                                <p>Night Out: {entry.night_out_count}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-6 text-center text-slate-500">No billing entry found.</div>
            )}
        </div>
    );
};

export default TransportBillingDetails;
