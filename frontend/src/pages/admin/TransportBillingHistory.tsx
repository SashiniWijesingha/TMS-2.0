import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Printer, Filter } from 'lucide-react';
import { getTripEntries } from '../../services/tripEntryService';
import type { TripEntry } from '../../types';

const TransportBillingHistory: React.FC = () => {
    const [entries, setEntries] = useState<TripEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('ALL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const fetchEntries = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getTripEntries({
                q: search.trim() || undefined,
                status: status !== 'ALL' ? status : undefined,
                from: fromDate || undefined,
                to: toDate || undefined
            });
            setEntries(Array.isArray(data) ? data : []);
        } catch (err: any) {
            const message = err?.response?.data?.message || err.message || 'Failed to load billing history.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [search, status, fromDate, toDate]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const handlePrint = () => {
        window.print();
    };

    const totalAmount = useMemo(() => {
        return entries.reduce((sum, entry) => sum + Number(entry.final_amount || 0), 0);
    }, [entries]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const formatName = (entry: TripEntry) => {
        return entry.driver?.user?.name || `Driver #${entry.driver_id}`;
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
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
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Transport Billing History</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Review saved transport billing calculations and print summaries.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                >
                    <Printer size={16} className="mr-2" />
                    Print
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6 mb-6 print-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                        <label className="text-xs font-semibold text-slate-600 uppercase">Search</label>
                        <div className="mt-2 flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
                            <Search size={16} className="text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Driver, vehicle number, package"
                                className="w-full text-sm text-slate-700 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
                        >
                            <option value="ALL">All</option>
                            <option value="SAVED">Saved</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={fetchEntries}
                            className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            <Filter size={16} className="mr-2" />
                            Apply Filters
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase">From</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase">To</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden print-root">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading billing history...</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-600">{error}</div>
                ) : entries.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No billing entries found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="text-left font-semibold px-4 py-3">Date</th>
                                    <th className="text-left font-semibold px-4 py-3">Driver</th>
                                    <th className="text-left font-semibold px-4 py-3">Vehicle</th>
                                    <th className="text-left font-semibold px-4 py-3">Package</th>
                                    <th className="text-right font-semibold px-4 py-3">Total KM</th>
                                    <th className="text-right font-semibold px-4 py-3">Extra KM</th>
                                    <th className="text-right font-semibold px-4 py-3">OT Amount</th>
                                    <th className="text-right font-semibold px-4 py-3">Night Out</th>
                                    <th className="text-right font-semibold px-4 py-3">Final Amount</th>
                                    <th className="text-left font-semibold px-4 py-3">Status</th>
                                    <th className="text-right font-semibold px-4 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-slate-700">{entry.entry_date}</td>
                                        <td className="px-4 py-3 text-slate-700">{formatName(entry)}</td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {entry.vehicle?.vehicle_number || `Vehicle #${entry.vehicle_id}`}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{entry.package_name}</td>
                                        <td className="px-4 py-3 text-right text-slate-700">{Number(entry.total_km).toFixed(1)}</td>
                                        <td className="px-4 py-3 text-right text-slate-700">{Number(entry.extra_km).toFixed(1)}</td>
                                        <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(Number(entry.ot_amount || 0))}</td>
                                        <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(Number(entry.night_out_amount || 0))}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(Number(entry.final_amount || 0))}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                                                {entry.status || 'SAVED'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                to={`/admin/transport-billing/${entry.id}`}
                                                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {!loading && entries.length > 0 && (
                <div className="mt-4 text-right text-sm text-slate-600">
                    Total Amount: <span className="font-semibold text-slate-900">{formatCurrency(totalAmount)}</span>
                </div>
            )}
        </div>
    );
};

export default TransportBillingHistory;
