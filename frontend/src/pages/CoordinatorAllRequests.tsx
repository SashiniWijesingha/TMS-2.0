import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { VehicleRequest } from '../types';
import { Search, Eye, X, Calendar, ArrowUpDown } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING_COORDINATOR', label: 'Pending Review' },
    { value: 'RETURNED', label: 'Returned' },
    { value: 'PENDING_HOD', label: 'HOD Approval' },
    { value: 'PENDING_CEO', label: 'CEO Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'ALLOCATED', label: 'Allocated' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'ON_GOING', label: 'On Going' },
    { value: 'COMPLETED', label: 'Completed' },
];

const STATUS_BADGE: Record<string, { color: string; label: string }> = {
    PENDING_COORDINATOR: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Pending Review' },
    PENDING_HOD: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'HOD Approval' },
    PENDING_CEO: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'CEO Approval' },
    APPROVED: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Approved' },
    REJECTED: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Rejected' },
    RETURNED: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Returned' },
    CANCELLED: { color: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Cancelled' },
    ALLOCATED: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Allocated' },
    ACCEPTED: { color: 'bg-sky-100 text-sky-700 border-sky-200', label: 'Accepted' },
    ON_GOING: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'On Going' },
    COMPLETED: { color: 'bg-slate-100 text-slate-800 border-slate-200', label: 'Completed' },
};

// ── Filter Chip ───────────────────────────────────────────────────────────────

const FilterChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
        {label}
        <button onClick={onRemove} className="hover:text-blue-900 leading-none">
            <X size={10} />
        </button>
    </span>
);

// ── Status Summary Bar ────────────────────────────────────────────────────────

const SummaryBar = ({ requests }: { requests: VehicleRequest[] }) => {
    const groups = [
        { label: 'Pending Review', statuses: ['PENDING_COORDINATOR'], color: 'text-amber-700 bg-amber-50 border-amber-200' },
        { label: 'HOD / CEO', statuses: ['PENDING_HOD', 'PENDING_CEO'], color: 'text-blue-700 bg-blue-50 border-blue-200' },
        { label: 'Returned', statuses: ['RETURNED'], color: 'text-orange-700 bg-orange-50 border-orange-200' },
        { label: 'In Progress', statuses: ['APPROVED', 'ALLOCATED', 'ACCEPTED', 'ON_GOING'], color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { label: 'Completed', statuses: ['COMPLETED'], color: 'text-slate-700 bg-slate-50 border-slate-200' },
        { label: 'Rejected / Cancelled', statuses: ['REJECTED', 'CANCELLED'], color: 'text-red-700 bg-red-50 border-red-200' },
    ];

    return (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {groups.map(g => {
                const count = requests.filter(r => g.statuses.includes(r.status as string)).length;
                return (
                    <div key={g.label} className={`rounded-lg border px-3 py-2 text-center ${g.color}`}>
                        <p className="text-xl font-bold leading-none">{count}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide mt-1 opacity-80">{g.label}</p>
                    </div>
                );
            })}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

type SortKey = 'id' | 'date' | 'submitted' | 'requester' | 'status';
type SortDir = 'asc' | 'desc';

const CoordinatorAllRequests = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<VehicleRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Sort
    const [sortKey, setSortKey] = useState<SortKey>('id');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    useEffect(() => {
        api.get('/requests')
            .then(res => setRequests(res.data))
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, []);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const filtered = useMemo(() => {
        let list = requests.filter(req => {
            const details = req.passengerDetails || req.materialDetails;
            const tripDate = details?.date || '';

            // Search: project name, ID, requester name
            if (search) {
                const s = search.toLowerCase();
                const matchesProject = req.project_name?.toLowerCase().includes(s);
                const matchesId = req.id.toString().includes(s);
                const matchesRequester = req.requester?.name?.toLowerCase().includes(s);
                const matchesJobNo = req.job_number?.toLowerCase().includes(s);
                if (!matchesProject && !matchesId && !matchesRequester && !matchesJobNo) return false;
            }

            if (statusFilter && req.status !== statusFilter) return false;
            if (typeFilter && req.request_type !== typeFilter) return false;
            if (dateFrom && tripDate && tripDate < dateFrom) return false;
            if (dateTo && tripDate && tripDate > dateTo) return false;

            return true;
        });

        // Sort
        list = [...list].sort((a, b) => {
            let aVal: string | number = '';
            let bVal: string | number = '';

            const aDetails = a.passengerDetails || a.materialDetails;
            const bDetails = b.passengerDetails || b.materialDetails;

            if (sortKey === 'id') { aVal = a.id; bVal = b.id; }
            else if (sortKey === 'date') { aVal = aDetails?.date || ''; bVal = bDetails?.date || ''; }
            else if (sortKey === 'submitted') { aVal = a.submitted_at || ''; bVal = b.submitted_at || ''; }
            else if (sortKey === 'requester') { aVal = a.requester?.name || ''; bVal = b.requester?.name || ''; }
            else if (sortKey === 'status') { aVal = a.status || ''; bVal = b.status || ''; }

            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return list;
    }, [requests, search, statusFilter, typeFilter, dateFrom, dateTo, sortKey, sortDir]);

    const hasActiveFilters = search || statusFilter || typeFilter || dateFrom || dateTo;

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('');
        setTypeFilter('');
        setDateFrom('');
        setDateTo('');
    };

    const SortBtn = ({ col }: { col: SortKey }) => (
        <button
            onClick={() => toggleSort(col)}
            className={`ml-1 inline-flex items-center opacity-50 hover:opacity-100 transition-opacity ${sortKey === col ? 'opacity-100 text-blue-600' : ''}`}
        >
            <ArrowUpDown size={11} />
        </button>
    );

    return (
        <div className="desktop-page-compact space-y-4 max-w-[1600px]">
            {/* Header */}
            <div className="desktop-toolbar border-b border-slate-200 pb-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">All Division Requests</h1>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Full history of every request from your division — search, filter, and review.
                    </p>
                </div>
                <span className="text-xs text-slate-400 font-semibold bg-slate-100 px-2.5 py-1 rounded-full">
                    {isLoading ? '…' : `${filtered.length} of ${requests.length}`} requests
                </span>
            </div>

            {/* Summary stats */}
            {!isLoading && <SummaryBar requests={requests} />}

            {/* Filter Panel */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="relative xl:col-span-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        <input
                            type="text"
                            placeholder="Search by requester, project name, job no., ID…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="desktop-input pl-8 w-full"
                        />
                    </div>

                    {/* Status */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="desktop-input"
                    >
                        {STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    {/* Type */}
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="desktop-input"
                    >
                        <option value="">All Types</option>
                        <option value="PASSENGER">Passenger</option>
                        <option value="MATERIAL">Material</option>
                    </select>

                    {/* Date From */}
                    <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="desktop-input pl-8 w-full"
                            title="Trip date from"
                        />
                    </div>

                    {/* Date To */}
                    <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="desktop-input pl-8 w-full"
                            title="Trip date to"
                            min={dateFrom || undefined}
                        />
                    </div>
                </div>

                {/* Active filter chips */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-xs text-slate-500 font-medium">Filters:</span>
                        {search && <FilterChip label={`"${search}"`} onRemove={() => setSearch('')} />}
                        {statusFilter && <FilterChip label={STATUS_BADGE[statusFilter]?.label || statusFilter} onRemove={() => setStatusFilter('')} />}
                        {typeFilter && <FilterChip label={typeFilter} onRemove={() => setTypeFilter('')} />}
                        {dateFrom && <FilterChip label={`From ${dateFrom}`} onRemove={() => setDateFrom('')} />}
                        {dateTo && <FilterChip label={`To ${dateTo}`} onRemove={() => setDateTo('')} />}
                        <button
                            onClick={clearFilters}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 ml-1"
                        >
                            <X size={11} /> Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* Table / Cards */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">

                {/* ── Mobile card list ── */}
                <div className="md:hidden divide-y divide-slate-100">
                    {isLoading ? (
                        <div className="p-10 text-center text-slate-400 text-sm">Loading requests…</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 text-sm">No requests found matching your filters.</div>
                    ) : filtered.map(req => {
                        const details = req.passengerDetails || req.materialDetails;
                        const badge = STATUS_BADGE[req.status as string] ?? { color: 'bg-slate-100 text-slate-600 border-slate-200', label: req.status };
                        return (
                            <div
                                key={req.id}
                                onClick={() => navigate(`/requests/${req.id}`)}
                                className="p-4 hover:bg-slate-50 cursor-pointer space-y-2 active:bg-slate-100"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-mono text-[11px] font-bold text-slate-400">#{req.id}</p>
                                        <p className="text-sm font-bold text-slate-900 mt-0.5">{req.project_name || '—'}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{req.requester?.name}</p>
                                    </div>
                                    <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${badge.color}`}>{badge.label}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                                    <span><span className="font-semibold text-slate-400">Trip: </span>{details?.date || 'N/A'} {details?.time ? `· ${details.time}` : ''}</span>
                                    <span><span className="font-semibold text-slate-400">Type: </span>{req.request_type}</span>
                                    <span><span className="font-semibold text-slate-400">Job No: </span>{req.job_number || '—'}</span>
                                    <span><span className="font-semibold text-slate-400">Submitted: </span>{req.submitted_at ? new Date(req.submitted_at).toLocaleDateString('en-GB') : '—'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Desktop table ── */}
                <div className="hidden md:block overflow-x-auto">
                    {isLoading ? (
                        <div className="p-16 text-center text-slate-400 text-sm">Loading requests…</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-16 text-center">
                            <p className="text-slate-400 text-sm font-medium">No requests match your current filters.</p>
                            {hasActiveFilters && (
                                <button onClick={clearFilters} className="mt-2 text-xs text-blue-600 hover:underline">
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort('id')}>
                                        ID <SortBtn col="id" />
                                    </th>
                                    <th className="px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort('date')}>
                                        Trip Date <SortBtn col="date" />
                                    </th>
                                    <th className="px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort('submitted')}>
                                        Submitted <SortBtn col="submitted" />
                                    </th>
                                    <th className="px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort('requester')}>
                                        Requester <SortBtn col="requester" />
                                    </th>
                                    <th className="px-4 py-3">Project / Job No.</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Trip Details</th>
                                    <th className="px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort('status')}>
                                        Status <SortBtn col="status" />
                                    </th>
                                    <th className="px-4 py-3 w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(req => {
                                    const details = req.passengerDetails || req.materialDetails;
                                    const badge = STATUS_BADGE[req.status as string] ?? { color: 'bg-slate-100 text-slate-600 border-slate-200', label: req.status };
                                    const submitted = req.submitted_at
                                        ? new Date(req.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                        : '—';
                                    const tripDetails = req.passengerDetails
                                        ? `${req.passengerDetails.no_of_passengers} pax · ${req.passengerDetails.vehicle_type}`
                                        : `${req.materialDetails?.vehicle_type || ''}${req.materialDetails?.lorry_size ? ` · ${req.materialDetails.lorry_size}` : ''}`;

                                    return (
                                        <tr
                                            key={req.id}
                                            onClick={() => navigate(`/requests/${req.id}`)}
                                            className="hover:bg-blue-50/40 cursor-pointer transition-colors text-sm"
                                        >
                                            <td className="px-4 py-3 font-mono text-xs text-slate-400 font-bold">#{req.id}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="font-medium text-slate-700">{details?.date || '—'}</span>
                                                {details?.time && <span className="block text-xs text-slate-400">{details.time}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{submitted}</td>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-slate-800 block">{req.requester?.name}</span>
                                                <span className="text-xs text-slate-400 truncate max-w-[180px] block">{req.requester?.email}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-slate-700 block truncate max-w-[200px]">{req.project_name || '—'}</span>
                                                {req.job_number && <span className="text-xs text-slate-400">{req.job_number}</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${req.request_type === 'PASSENGER' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                                    {req.request_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{tripDetails}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={e => { e.stopPropagation(); navigate(`/requests/${req.id}`); }}
                                                    className="desktop-btn desktop-btn-primary"
                                                >
                                                    <Eye size={12} />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoordinatorAllRequests;
