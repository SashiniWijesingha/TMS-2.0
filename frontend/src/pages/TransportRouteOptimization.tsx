import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GitMerge, CheckCircle, Search, Plus, X } from 'lucide-react';
import { getRouteOptimizationSuggestions } from '../services/requestService';
import GoogleClusterMap from '../components/common/GoogleClusterMap';

const TransportRouteOptimization: React.FC = () => {
    const navigate = useNavigate();

    // Mode State
    const [activeTab, setActiveTab] = useState<'smart' | 'manual'>('smart');

    // Filter State
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });
    const [viewAll, setViewAll] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Data State
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [unclustered, setUnclustered] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Selection / Staging State
    const [selectedGroup, setSelectedGroup] = useState<any>(null); // For Smart Mode
    const [selectedClusterIds, setSelectedClusterIds] = useState<Set<string>>(new Set());
    const [selectedForMerge, setSelectedForMerge] = useState<any[]>([]); // For Manual Mode (Staging)
    const [checkedRequests, setCheckedRequests] = useState<Set<number>>(new Set()); // Checkboxes

    useEffect(() => {
        fetchSuggestions();
    }, []);

    const fetchSuggestions = async () => {
        try {
            setLoading(true);
            const data = await getRouteOptimizationSuggestions(startDate, endDate, viewAll, 'all');

            setSuggestions(data.suggestions || []);
            setUnclustered(data.unclustered || []);

            if (data.suggestions && data.suggestions.length > 0) {
                setSelectedGroup(data.suggestions[0]);
            } else {
                setSelectedGroup(null);
            }
            setSelectedClusterIds(new Set());
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Combine all sources for Manual Builder
    const allAvailableRequests = React.useMemo(() => {
        const smartReqs = suggestions.flatMap(g =>
            g.requests.map((r: any) => ({ ...r, _smart: true, _clusterId: g.groupId }))
        );
        return [...smartReqs, ...unclustered];
    }, [suggestions, unclustered]);

    // Manual Mode Logic
    const toggleCheckRequest = (id: number) => {
        const newSet = new Set(checkedRequests);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setCheckedRequests(newSet);
    };

    const addCheckedToStage = () => {
        const items = allAvailableRequests.filter(r => checkedRequests.has(r.id));
        const existingIds = new Set(selectedForMerge.map(r => r.id));
        const newItems = items.filter(r => !existingIds.has(r.id));
        setSelectedForMerge([...selectedForMerge, ...newItems]);
        setCheckedRequests(new Set());
    };

    const addClusterToStage = (clusterId: string) => {
        const cluster = suggestions.find(g => g.groupId === clusterId);
        if (cluster) {
            const existingIds = new Set(selectedForMerge.map(r => r.id));
            const newReqs = cluster.requests.filter((r: any) => !existingIds.has(r.id));
            if (newReqs.length === 0) {
                alert('All requests from this cluster are already in the staging area.');
                return;
            }
            setSelectedForMerge([...selectedForMerge, ...newReqs]);
        }
    };

    const removeFromStage = (id: number) => {
        setSelectedForMerge(selectedForMerge.filter(r => r.id !== id));
    };

    const toggleClusterSelection = (groupId: string) => {
        setSelectedClusterIds(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const selectAllClusters = () => {
        setSelectedClusterIds(new Set(suggestions.map(g => String(g.groupId))));
    };

    const clearSelectedClusters = () => {
        setSelectedClusterIds(new Set());
    };

    const selectedSmartGroups = React.useMemo(() => {
        return suggestions.filter(g => selectedClusterIds.has(String(g.groupId)));
    }, [suggestions, selectedClusterIds]);

    const selectedSmartRequests = React.useMemo(() => {
        const deduped = new Map<number, any>();
        selectedSmartGroups.forEach(group => {
            group.requests.forEach((req: any) => {
                if (!deduped.has(req.id)) deduped.set(req.id, req);
            });
        });
        return Array.from(deduped.values());
    }, [selectedSmartGroups]);

    const handleMergeSelectedClusters = () => {
        if (selectedSmartRequests.length < 1) {
            alert('Select at least one cluster to merge.');
            return;
        }
        const syntheticGroup = {
            groupId: `multi-${Date.now()}`,
            requests: selectedSmartRequests,
            totalPassengers: selectedSmartRequests.reduce((sum, r) => sum + (r.passengerDetails?.no_of_passengers || 0), 0),
            matchReason: `Merged from ${selectedSmartGroups.length} clusters`
        };
        handleOpenAlloc(syntheticGroup);
    };

    const handleManualMergeSubmit = () => {
        if (selectedForMerge.length < 1) {
            alert('Select at least 1 request to allocate.');
            return;
        }
        const syntheticGroup = {
            requests: selectedForMerge,
            totalPassengers: selectedForMerge.reduce((sum, r) => sum + (r.passengerDetails?.no_of_passengers || 0), 0)
        };
        handleOpenAlloc(syntheticGroup);
    };

    const handleOpenAlloc = (group: any) => {
        navigate('/transport/finalize-allocation', { state: { group } });
    };

    const handleEditGroup = (group: any) => {
        setSelectedForMerge(group.requests);
        setActiveTab('manual');
    };

    const getDistance = (r1: any, r2: any) => {
        const d1 = r1.passengerDetails || r1.materialDetails;
        const d2 = r2.passengerDetails || r2.materialDetails;
        if (!d1 || !d2) return 9999;
        return Math.sqrt(Math.pow(d1.pickup_lat - d2.pickup_lat, 2) + Math.pow(d1.pickup_lng - d2.pickup_lng, 2));
    };

    const filteredUnclustered = allAvailableRequests.filter(r => {
        if (selectedForMerge.some(s => s.id === r.id)) return false;
        return searchQuery ? r.id.toString().includes(searchQuery) : true;
    }).sort((a, b) => { // Smart Sort
        if (selectedForMerge.length > 0) {
            const base = selectedForMerge[0];
            return getDistance(base, a) - getDistance(base, b);
        }
        return 0;
    });

    // Helper Comp
    const Badge = ({ count }: { count: number }) => (
        <div className="flex items-center justify-center w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">
            {count}
        </div>
    );

    const RequestCard = ({ req, compact }: { req: any, compact?: boolean }) => (
        <div className={`flex items-start gap-3 p-3 border rounded-lg ${compact ? 'border-slate-100 bg-white' : 'border-slate-100 bg-white'}`}>
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-slate-900">#{req.id} - {req.requester?.name}</span>
                    <span className="text-xs font-mono text-slate-500">{req.passengerDetails?.time.substring(0, 5)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                    {req.passengerDetails?.pickup_location} ➝ {req.passengerDetails?.drop_location}
                </div>
                {!compact && (
                    <div className="mt-2 flex gap-2">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {req.passengerDetails?.vehicle_type || 'Standard'}
                        </span>
                        {req.passengerDetails?.specification && (
                            <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">
                                {req.passengerDetails.specification}
                            </span>
                        )}
                        {req.proposed_attributes && (
                            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">
                                Requested: {Object.keys(req.proposed_attributes).filter(k => req.proposed_attributes[k]).join(', ')}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="desktop-page space-y-6">
                {/* Header */}
                <div className="desktop-toolbar">
                    <button onClick={() => navigate('/dashboard')} className="desktop-btn desktop-btn-secondary min-w-0 justify-start">
                        <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-1 rounded-lg border border-slate-200 flex text-sm font-medium">
                            <button onClick={() => setActiveTab('smart')} className={`px-4 py-2 rounded-md transition-all ${activeTab === 'smart' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Smart Overview</button>
                            <button onClick={() => setActiveTab('manual')} className={`px-4 py-2 rounded-md transition-all ${activeTab === 'manual' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Workbench & Map</button>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-4">
                    <div className="w-40">
                        <label className={`block text-xs font-semibold mb-1 ${viewAll ? 'text-slate-300' : 'text-slate-500'}`}>Start Date</label>
                        <input type="date" value={startDate} disabled={viewAll} onChange={(e) => setStartDate(e.target.value)} className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${viewAll ? 'bg-slate-50 text-slate-400' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'}`} />
                    </div>
                    <div className="w-40">
                        <label className={`block text-xs font-semibold mb-1 ${viewAll ? 'text-slate-300' : 'text-slate-500'}`}>End Date</label>
                        <input type="date" value={endDate} disabled={viewAll} onChange={(e) => setEndDate(e.target.value)} className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${viewAll ? 'bg-slate-50 text-slate-400' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'}`} />
                    </div>
                    <div className="flex items-center h-[38px] px-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setViewAll(!viewAll)}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors ${viewAll ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400 bg-white'}`}>{viewAll && <CheckCircle size={10} className="text-white" />}</div>
                        <span className={`text-sm font-medium ${viewAll ? 'text-indigo-700' : 'text-slate-600'}`}>Global Scan (90 Days)</span>
                    </div>
                    <button onClick={fetchSuggestions} disabled={loading} className="desktop-btn desktop-btn-primary min-w-0 h-[42px]">{loading ? 'Scanning...' : 'Update Scan'}</button>
                    {activeTab === 'manual' && (
                        <div className="ml-auto w-64 relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input type="text" placeholder="Search ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    )}
                </div>

                {/* Content */}
                {activeTab === 'smart' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* List */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Clusters</h3>
                                {suggestions.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={selectAllClusters} className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold">Select All</button>
                                        <button onClick={clearSelectedClusters} className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold">Clear</button>
                                    </div>
                                )}
                            </div>
                            {suggestions.map((group) => (
                                <div key={group.groupId} onClick={() => setSelectedGroup(group)} className={`cursor-pointer p-4 rounded-xl border transition-all ${selectedGroup?.groupId === group.groupId ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedClusterIds.has(String(group.groupId))}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleClusterSelection(String(group.groupId));
                                                }}
                                                className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <Badge count={group.requests.length} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleEditGroup(group); }} className="desktop-btn desktop-btn-secondary min-w-0 px-3 py-1.5 text-[10px] text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100">Edit in Workbench</button>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${group.isExisting ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>{group.isExisting ? 'Coordinator Proposal' : 'Auto Cluster'}</span>
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-slate-900 mb-1">{group.totalPassengers} Passengers Combined</div>
                                    <div className="text-xs text-slate-500">{group.matchReason}</div>
                                </div>
                            ))}
                        </div>
                        {/* Detail */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[500px]">
                            {selectedGroup ? (
                                <div className="h-full flex flex-col">
                                    <div className="mb-4 h-64 shrink-0 rounded-xl overflow-hidden border border-slate-200 relative">
                                        <GoogleClusterMap requests={selectedGroup.requests} />
                                    </div>
                                    <div className="flex-1 space-y-3 overflow-y-auto">
                                        {selectedGroup.requests.map((req: any) => <RequestCard key={req.id} req={req} />)}
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                                        {selectedClusterIds.size > 0 && (
                                            <button onClick={handleMergeSelectedClusters} className="desktop-btn desktop-btn-primary min-w-0 px-6 mr-3">
                                                <GitMerge size={16} /> Merge Selected ({selectedClusterIds.size})
                                            </button>
                                        )}
                                        <button onClick={() => handleOpenAlloc(selectedGroup)} className="desktop-btn desktop-btn-accent min-w-0 px-8">
                                            <GitMerge size={18} /> Finalize Allocation
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <GitMerge size={48} className="mb-4 opacity-20" />
                                    <p>Select a cluster to review details</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
                        {/* Left: Source List */}
                        <div className="lg:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700">All Requests</h3>
                                <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600">{filteredUnclustered.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {filteredUnclustered.map(req => (
                                    <div key={req.id} className="flex items-start gap-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                        <input type="checkbox" checked={checkedRequests.has(req.id)} onChange={() => toggleCheckRequest(req.id)} className="mt-1.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-slate-900">#{req.id}</span>
                                                    {req._smart && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] bg-purple-50 text-purple-600 px-1 rounded border border-purple-100 font-bold">Smart</span>
                                                            <button onClick={(e) => { e.stopPropagation(); req._clusterId && addClusterToStage(req._clusterId); }} className="text-[10px] text-blue-600 hover:underline">(+ Cluster)</button>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-xs font-mono text-slate-500">{req.passengerDetails?.date}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">{req.requester?.name} • {req.passengerDetails?.pickup_location}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50">
                                <button onClick={addCheckedToStage} disabled={checkedRequests.size === 0} className="desktop-btn desktop-btn-primary w-full">Add Selected to Workbench</button>
                            </div>
                        </div>
                        {/* Right: Workbench */}
                        <div className="lg:col-span-8 flex flex-col bg-indigo-50/50 rounded-2xl border-2 border-dashed border-indigo-200 overflow-hidden">
                            <div className="p-4 border-b border-indigo-100 bg-indigo-50 flex justify-between items-center">
                                <h3 className="font-bold text-indigo-900">Allocation Workbench</h3>
                                {selectedForMerge.length > 0 && <span className="text-xs font-bold text-indigo-600">{selectedForMerge.length} items</span>}
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {selectedForMerge.length > 0 && (
                                    <div className="mb-4 h-48 shrink-0 rounded-xl overflow-hidden shadow-sm border border-slate-200 block">
                                        <GoogleClusterMap requests={selectedForMerge} />
                                    </div>
                                )}
                                {selectedForMerge.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-indigo-300">
                                        <Plus size={48} className="mb-2 opacity-50" />
                                        <p>Build a trip from the left list</p>
                                    </div>
                                ) : (
                                    selectedForMerge.map(req => (
                                        <div key={req.id} className="relative bg-white p-4 rounded-xl shadow-sm border border-indigo-100 pl-4">
                                            <button onClick={() => removeFromStage(req.id)} className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 transition-colors"><X size={16} /></button>
                                            <RequestCard req={req} compact />
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-4 bg-white border-t border-indigo-100">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm text-slate-500">Total Passengers:</span>
                                    <span className="text-xl font-bold text-slate-900">{selectedForMerge.reduce((sum, r) => sum + (r.passengerDetails?.no_of_passengers || 0), 0)}</span>
                                </div>
                                <button onClick={handleManualMergeSubmit} disabled={selectedForMerge.length < 1} className="desktop-btn desktop-btn-success w-full">Finalize Allocation</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransportRouteOptimization;
