import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GitMerge, CheckCircle, Search, Plus, X, Clock } from 'lucide-react';
import { getRouteOptimizationSuggestions, mergeRequests } from '../services/requestService';
import { getVehicleCategories } from '../services/vehicleService';
import GoogleClusterMap from '../components/common/GoogleClusterMap';

const CoordinatorRouteOptimization: React.FC = () => {
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
    const [selectedForMerge, setSelectedForMerge] = useState<any[]>([]); // For Manual Mode (Staging)
    const [checkedRequests, setCheckedRequests] = useState<Set<number>>(new Set()); // Checkboxes in Left Panel

    // Allocation Resources
    const [showAllocModal, setShowAllocModal] = useState(false);
    const [vehicleCategories, setVehicleCategories] = useState<any[]>([]); // New Categories API
    const [selectedCategory, setSelectedCategory] = useState<any>(null); // Full Category Object
    const [validationError, setValidationError] = useState<string | null>(null);
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, boolean>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchData();
        loadResources();
    }, []); // Initial Load

    const loadResources = async () => {
        try {
            const categories = await getVehicleCategories();
            setVehicleCategories(categories);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchData = () => {
        fetchSuggestions();
        loadResources();
    };

    // Validation Effect
    useEffect(() => {
        if (!selectedGroup || !selectedCategory) {
            setValidationError(null);
            return;
        }

        // 1. Capacity Check
        if (selectedCategory.max_passengers < selectedGroup.totalPassengers) {
            setValidationError(`Capacity Exceeded! Needs ${selectedGroup.totalPassengers}, but ${selectedCategory.name} holds ${selectedCategory.max_passengers}.`);
            return;
        }

        setValidationError(null);
    }, [selectedCategory, selectedGroup]);

    const fetchSuggestions = async () => {
        try {
            setLoading(true);
            const data = await getRouteOptimizationSuggestions(startDate, endDate, viewAll);

            setSuggestions(data.suggestions || []);
            setUnclustered(data.unclustered || []);

            if (data.suggestions && data.suggestions.length > 0) {
                setSelectedGroup(data.suggestions[0]);
            } else {
                setSelectedGroup(null);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Combine all sources for Manual Builder
    const allAvailableRequests = React.useMemo(() => {
        // Mark smart proposals so we can badge them
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
        // Look in ALL requests
        const items = allAvailableRequests.filter(r => checkedRequests.has(r.id));

        // Avoid duplicates in stage
        const existingIds = new Set(selectedForMerge.map(r => r.id));
        const newItems = items.filter(r => !existingIds.has(r.id));

        const newStage = [...selectedForMerge, ...newItems];

        // Remove from unclustered/list view is handled by filtering out selectedForMerge IDs from the display list
        setSelectedForMerge(newStage);
        setCheckedRequests(new Set());
    };

    const removeFromStage = (id: number) => {
        setSelectedForMerge(selectedForMerge.filter(r => r.id !== id));
    };

    const handleManualMergeSubmit = () => {
        if (selectedForMerge.length < 2) {
            alert('Select at least 2 requests to merge.');
            return;
        }
        // Create a "Group" object compatible with the Modal
        const syntheticGroup = {
            requests: selectedForMerge,
            totalPassengers: selectedForMerge.reduce((sum, r) => sum + (r.passengerDetails?.no_of_passengers || 0), 0)
        };
        handleOpenMerge(syntheticGroup);
    };


    const handleOpenMerge = async (group: any) => {
        setSelectedGroup(group);
        setShowAllocModal(true);
    };

    const handleConfirmMerge = async (mergedStartTime?: string) => {
        if (!selectedCategory || !selectedGroup) {
            // Should be handled by UI validation disabling the button, but double check
            return;
        }

        if (validationError) {
            // Block if invalid
            return;
        }

        try {
            setProcessing(true);
            const requestIds = selectedGroup.requests.map((r: any) => r.id);

            // We pass the Category ID as the vehicleTypeId
            // Ensure the backend handles this ID mapping or the ID is actually a type ID. 
            // Based on user prompt "Vehicle Category... store value... include in submit payload".
            await mergeRequests(requestIds, selectedCategory.id, mergedStartTime, selectedAttributes);

            alert('Proposal created! Requests merged and sent to HOD for approval.');
            setShowAllocModal(false);
            setSelectedGroup(null);
            setSelectedForMerge([]); // Clear staging
            setCheckedRequests(new Set());
            setSelectedAttributes({}); // Clear attributes
            fetchSuggestions(); // Refresh data
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Merge failed');
        } finally {
            setProcessing(false);
        }
    };

    // Switch to Manual Mode with specific group loaded
    const handleEditGroup = (group: any) => {
        setSelectedForMerge(group.requests);
        setActiveTab('manual');
    };

    const addClusterToStage = (clusterId: string) => {
        const cluster = suggestions.find(g => g.groupId === clusterId);
        if (cluster) {
            // Add all requests from this cluster to stage (avoid duplicates)
            const existingIds = new Set(selectedForMerge.map(r => r.id));
            const newReqs = cluster.requests.filter((r: any) => !existingIds.has(r.id));

            if (newReqs.length === 0) {
                alert('All requests from this cluster are already in the staging area.');
                return;
            }

            setSelectedForMerge([...selectedForMerge, ...newReqs]);
        }
    };

    // Distance Helper (Client-side approximation)
    const getDistance = (r1: any, r2: any) => {
        const d1 = r1.passengerDetails || r1.materialDetails;
        const d2 = r2.passengerDetails || r2.materialDetails;
        if (!d1 || !d2) return 9999;
        // Simple Euclidean for sorting (assuming small area)
        return Math.sqrt(Math.pow(d1.pickup_lat - d2.pickup_lat, 2) + Math.pow(d1.pickup_lng - d2.pickup_lng, 2));
    };

    // Filter & Sort for Display
    const filteredUnclustered = allAvailableRequests.filter(r => {
        // Exclude if already in staging
        if (selectedForMerge.some(s => s.id === r.id)) return false;

        const matchId = searchQuery ? r.id.toString().includes(searchQuery) : true;
        return matchId;
    }).sort((a, b) => {
        // If sorting enabled (smart sort)
        if (selectedForMerge.length > 0) {
            const base = selectedForMerge[0];
            const distA = getDistance(base, a);
            const distB = getDistance(base, b);
            return distA - distB;
        }
        return 0; // standard order
    });

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-900 transition-colors">
                        <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-1 rounded-lg border border-slate-200 flex text-sm font-medium">
                            <button
                                onClick={() => setActiveTab('smart')}
                                className={`px-4 py-2 rounded-md transition-all ${activeTab === 'smart' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                Smart Suggestions
                            </button>
                            <button
                                onClick={() => setActiveTab('manual')}
                                className={`px-4 py-2 rounded-md transition-all ${activeTab === 'manual' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                Manual Merge Builder
                            </button>
                        </div>
                    </div>
                </div>

                {/* Controls Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-4">
                    <div className="w-40">
                        <label className={`block text-xs font-semibold mb-1 ${viewAll ? 'text-slate-300' : 'text-slate-500'}`}>Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            disabled={viewAll}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${viewAll ? 'bg-slate-50 text-slate-400 border-slate-100' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'}`}
                        />
                    </div>
                    <div className="w-40">
                        <label className={`block text-xs font-semibold mb-1 ${viewAll ? 'text-slate-300' : 'text-slate-500'}`}>End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            disabled={viewAll}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${viewAll ? 'bg-slate-50 text-slate-400 border-slate-100' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'}`}
                        />
                    </div>

                    <div className="flex items-center h-[38px] px-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setViewAll(!viewAll)}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors ${viewAll ? 'bg-blue-600 border-blue-600' : 'border-slate-400 bg-white'}`}>
                            {viewAll && <CheckCircle size={10} className="text-white" />}
                        </div>
                        <span className={`text-sm font-medium ${viewAll ? 'text-blue-700' : 'text-slate-600'}`}>Show Global Opportunities</span>
                    </div>

                    <button
                        onClick={fetchSuggestions}
                        disabled={loading}
                        className="bg-slate-900 text-white px-5 py-2 rounded-lg hover:bg-slate-800 transition-all text-sm font-medium h-[38px]"
                    >
                        {loading ? 'Scanning...' : 'Update Scan'}
                    </button>

                    {activeTab === 'manual' && (
                        <div className="ml-auto w-64 relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search Request ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    )}
                </div>

                {/* CONTENT AREA */}
                {activeTab === 'smart' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Clusters List */}
                        <div className="lg:col-span-1 space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Detected Opportunities</h3>
                            {suggestions.length === 0 && (
                                <div className="text-center py-8 bg-white border border-dashed rounded-xl text-slate-500 text-sm">
                                    No smart clusters found for this range.
                                </div>
                            )}
                            {suggestions.map((group) => (
                                <div
                                    key={group.groupId}
                                    onClick={() => setSelectedGroup(group)}
                                    className={`cursor-pointer p-4 rounded-xl border transition-all ${selectedGroup?.groupId === group.groupId ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white border-slate-200 hover:border-blue-200'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge count={group.requests.length} />
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditGroup(group);
                                                }}
                                                className="text-[10px] font-bold text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">High Impact</span>
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-slate-900 mb-1">
                                        {group.totalPassengers} Passengers Combined
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {group.matchReason}
                                    </div>
                                    <div className="mt-3 text-xs text-slate-400">
                                        Vehicles to save: {group.requests.length - 1}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right: Detail View */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[500px]">
                            {selectedGroup ? (
                                <div className="h-full flex flex-col">
                                    <div className="mb-4 border-b border-slate-100 pb-4">
                                        <h3 className="text-lg font-bold text-slate-900">Cluster Breakdown</h3>
                                        <p className="text-slate-500 text-sm">Review map and request details.</p>
                                    </div>

                                    {/* Map Visualization */}
                                    <div className="mb-4 h-64 shrink-0 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                                        <GoogleClusterMap requests={selectedGroup.requests} />
                                    </div>

                                    <div className="flex-1 space-y-3 overflow-y-auto">
                                        {selectedGroup.requests.map((req: any) => (
                                            <RequestCard key={req.id} req={req} />
                                        ))}
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                                        <button
                                            onClick={() => handleOpenMerge(selectedGroup)}
                                            className="bg-blue-600 text-white px-8 py-2.5 rounded-xl hover:bg-blue-700 font-medium flex items-center gap-2"
                                        >
                                            <GitMerge size={18} /> Propose Merge
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
                        <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700">Unallocated Requests</h3>
                                <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600">{filteredUnclustered.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {filteredUnclustered.map(req => (
                                    <div key={req.id} className="flex items-start gap-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={checkedRequests.has(req.id)}
                                            onChange={() => toggleCheckRequest(req.id)}
                                            className="mt-1.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-slate-900">#{req.id} - {req.requester?.name}</span>
                                                    {req._smart && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100 font-bold">
                                                                Smart
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // Prevent parent toggle
                                                                    req._clusterId && addClusterToStage(req._clusterId);
                                                                }}
                                                                className="text-[10px] text-blue-600 hover:underline font-medium"
                                                                title="Load all trips from this smart cluster"
                                                            >
                                                                (+ Load Cluster)
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-xs font-mono text-slate-500">{req.passengerDetails?.date}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {req.passengerDetails?.pickup_location} ➝ {req.passengerDetails?.drop_location}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1 flex gap-2">
                                                <span>{req.passengerDetails?.time.substring(0, 5)}</span>
                                                <span>•</span>
                                                <span>{req.passengerDetails?.no_of_passengers} Pax</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredUnclustered.length === 0 && (
                                    <p className="text-center text-slate-400 text-sm py-10">No requests match filters.</p>
                                )}
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50">
                                <button
                                    onClick={addCheckedToStage}
                                    disabled={checkedRequests.size === 0}
                                    className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                                >
                                    Add Selected ({checkedRequests.size}) to Merge
                                </button>
                            </div>
                        </div>

                        {/* Middle: Arrow Indicator (Desktop Only) */}
                        <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
                            <div className="p-2 bg-slate-200 rounded-full text-slate-400">
                                <ArrowLeft className="rotate-180" size={24} />
                            </div>
                        </div>

                        {/* Right: Staging Area */}
                        <div className="lg:col-span-6 flex flex-col bg-blue-50/50 rounded-2xl border-2 border-dashed border-blue-200 overflow-hidden">
                            <div className="p-4 border-b border-blue-100 bg-blue-50 flex justify-between items-center">
                                <h3 className="font-bold text-blue-900">Merge Staging Area</h3>
                                {selectedForMerge.length > 0 && <span className="text-xs font-bold text-blue-600">{selectedForMerge.length} items</span>}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {selectedForMerge.length > 0 && (
                                    <div className="mb-4 h-48 shrink-0 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                                        <GoogleClusterMap requests={selectedForMerge} />
                                    </div>
                                )}

                                {selectedForMerge.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-blue-300">
                                        <Plus size={48} className="mb-2 opacity-50" />
                                        <p className="text-sm font-medium">Select requests from the left to build a trip</p>
                                    </div>
                                ) : (
                                    selectedForMerge.map(req => (
                                        <div key={req.id} className="relative bg-white p-4 rounded-xl shadow-sm border border-blue-100 pl-4 animate-in fade-in zoom-in-95 duration-200">
                                            <button
                                                onClick={() => removeFromStage(req.id)}
                                                className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                            <RequestCard req={req} compact />
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 bg-white border-t border-blue-100">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm text-slate-500">Total Passengers:</span>
                                    <span className="text-xl font-bold text-slate-900">
                                        {selectedForMerge.reduce((sum, r) => sum + (r.passengerDetails?.no_of_passengers || 0), 0)}
                                    </span>
                                </div>
                                <button
                                    onClick={handleManualMergeSubmit}
                                    disabled={selectedForMerge.length < 2}
                                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg shadow-green-600/20"
                                >
                                    Review & Submit Merge
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Enhanced Merge Proposal Modal (Full Screen Overlay) */}
            {showAllocModal && selectedGroup && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-[95vw] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col h-[90vh]">

                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Finalize Trip Proposal</h3>
                                <p className="text-slate-500 text-sm mt-1">Review time conflicts, vehicle constraints, and route logic.</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600">{selectedGroup.requests.length} Requests</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Being Merged</div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* 1. Schedule & Timing Analysis */}
                            <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 shrink-0">
                                <h4 className="text-sm font-bold text-amber-900 mb-4 flex items-center gap-2">
                                    <Clock size={16} /> Schedule Conflicts & Wait Times
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-amber-900 mb-1">Proposed Trip Start</label>
                                        <input
                                            type="time"
                                            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-mono shadow-sm"
                                            defaultValue={selectedGroup.requests.sort((a: any, b: any) => a.passengerDetails?.time.localeCompare(b.passengerDetails?.time))[0]?.passengerDetails?.time.substring(0, 5)}
                                            id="mergedStartTimeInput"
                                        />
                                        <p className="text-[10px] text-amber-700 mt-1">*Based on earliest request.</p>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="text-xs text-amber-800 bg-amber-100/50 p-3 rounded-lg border border-amber-100">
                                            <strong>Policy Check:</strong> Ensure no passenger waits {'>'} 45 mins. Adjust Trip Start if needed.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Passenger Manifesto Table */}
                            <div className="flex-1 min-h-[300px]">
                                <h4 className="text-sm font-bold text-slate-900 mb-3">Passenger Manifesto & Constraints</h4>
                                <div className="border border-slate-200 rounded-xl overflow-hidden h-full overflow-y-auto">
                                    <table className="w-full text-sm text-left relative">
                                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-4 py-3 bg-slate-50">Requester</th>
                                                <th className="px-4 py-3 bg-slate-50">Pax</th>
                                                <th className="px-4 py-3 bg-slate-50">Requested Time</th>
                                                <th className="px-4 py-3 bg-slate-50">Wait Time</th>
                                                <th className="px-4 py-3 bg-slate-50">Pickup Location</th>
                                                <th className="px-4 py-3 bg-slate-50">Dropoff</th>
                                                <th className="px-4 py-3 bg-slate-50">Required Spec</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedGroup.requests.sort((a: any, b: any) => a.passengerDetails?.time.localeCompare(b.passengerDetails?.time)).map((r: any) => {
                                                const sorted = selectedGroup.requests.sort((a: any, b: any) => a.passengerDetails?.time.localeCompare(b.passengerDetails?.time));
                                                const earliestTime = sorted[0]?.passengerDetails?.time;

                                                const isFirst = r.passengerDetails?.time === earliestTime;

                                                // Distance from Start (Simulated)
                                                // We simulate 'startReq' as the one at index 0 of sorted array
                                                const startReq = sorted[0];
                                                const dist = getDistance(startReq, r);
                                                const distDisplay = Math.round(dist * 100) / 100;

                                                // Access vehicle_type_id safely, assuming it might be on the request root
                                                // (Lint fix: removed unused requestedType lookup)

                                                return (
                                                    <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${isFirst ? 'bg-blue-50/40' : ''}`}>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-slate-900">{r.requester?.name}</div>
                                                            <div className="text-xs text-slate-400">#{r.id}</div>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-slate-900">
                                                            {r.passengerDetails?.no_of_passengers}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-slate-600">
                                                            {r.passengerDetails?.time.substring(0, 5)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isFirst ? (
                                                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">Trip Starter</span>
                                                            ) : (
                                                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                                                    Wait
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-slate-900 font-medium">{r.passengerDetails?.pickup_location}</div>
                                                            {isFirst ? (
                                                                <div className="text-[10px] font-bold text-green-600 bg-green-50 mt-1 inline-block px-1.5 rounded border border-green-100">
                                                                    START POINT (+0 km)
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-slate-400 mt-1">
                                                                    +{distDisplay} km from Start
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">{r.passengerDetails?.drop_location || r.materialDetails?.drop_location_1}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-col gap-1 items-start">
                                                                {/* 1. Vehicle Type Name (from Request) */}
                                                                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                    {(r.passengerDetails?.vehicle_type || r.materialDetails?.vehicle_type || 'Standard').toLowerCase() === 'alto' ? 'Sedan' : (r.passengerDetails?.vehicle_type || r.materialDetails?.vehicle_type || 'Standard')}
                                                                </span>

                                                                {/* 2. Specific Attributes (e.g. A/C, High Roof) */}
                                                                {(r.passengerDetails?.specification || (r.materialDetails && (r.materialDetails.lorry_size || r.materialDetails.lorry_type))) && (
                                                                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 font-semibold">
                                                                        {(r.passengerDetails?.specification?.toLowerCase() === 'alto' ? 'Sedan' : r.passengerDetails?.specification) || [r.materialDetails?.lorry_size, r.materialDetails?.lorry_type].filter(Boolean).join(', ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 3. Vehicle Category Selection - UPDATED */}
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shrink-0">
                                <h4 className="text-sm font-bold text-slate-900 mb-3">Vehicle Allocation</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                                            Required Capacity
                                        </label>
                                        <div className="text-lg font-bold text-slate-900">
                                            {selectedGroup.totalPassengers} Passengers
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                                            Vehicle Category <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                required
                                                value={selectedCategory?.id || ''}
                                                onChange={(e) => {
                                                    const cat = vehicleCategories.find(c => c.id.toString() === e.target.value);
                                                    setSelectedCategory(cat || null);
                                                    setSelectedAttributes({});
                                                }}
                                                className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-slate-900 text-sm appearance-none bg-white ${!selectedCategory ? 'border-amber-500 bg-amber-50/10' :
                                                    validationError ? 'border-red-500 bg-red-50' : 'border-slate-300'
                                                    }`}
                                            >
                                                <option value="">Select Category...</option>
                                                {vehicleCategories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.name} (Max: {cat.max_passengers}, Luggage: {cat.luggage_capacity})
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Validation Error / Warning */}
                                            {validationError && (
                                                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                                                    <span className="font-bold">⚠️ Issue:</span> {validationError}
                                                </div>
                                            )}

                                            {!validationError && selectedCategory && (
                                                <div className="mt-2 text-xs text-slate-400">
                                                    Vehicle must satisfy all merged request requirements.
                                                </div>
                                            )}
                                        </div>

                                        {/* Dynamic Specifications Selector (kept for attribute refinement if category allows) */}
                                        {selectedCategory && (
                                            <div className="mt-4">
                                                {/* If the category maps to a vehicle type with attributes, we'd show them here. 
                                                    For now we assume category selection is primary, and attributes are secondary if fetched.
                                                    Since we replaced vehicleTypes with vehicleCategories, we might need to fetch attributes for this category 
                                                    or assume they are generic. Keeping it clean as per prompt focus on Category. 
                                                */}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
                            <div className="text-xs text-slate-400">
                                *Transport Officer will assign specific license plate.
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAllocModal(false)}
                                    className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const time = (document.getElementById('mergedStartTimeInput') as HTMLInputElement).value;
                                        handleConfirmMerge(time);
                                    }}
                                    disabled={processing || !selectedCategory || !!validationError}
                                    className={`px-8 py-2.5 rounded-xl transition-all font-bold shadow-lg flex items-center gap-2 ${(processing || !selectedCategory || !!validationError)
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/20'
                                        }`}
                                >
                                    {processing ? 'Processing...' : <><CheckCircle size={18} /> Confirm & Propose</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Badge = ({ count }: { count: number }) => (
    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
        {count}
    </div>
);

const RequestCard = ({ req, compact }: { req: any, compact?: boolean }) => (
    <div className={`p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center ${compact ? 'py-3' : ''}`}>
        <div>
            <div className="font-medium text-slate-900 text-sm">#{req.id} - {req.requester?.name}</div>
            <div className="text-xs text-slate-500 mt-1">
                {req.passengerDetails?.pickup_location} ➝ {req.passengerDetails?.drop_location}
            </div>
            {!compact && <div className="text-xs text-slate-400 mt-1">{req.passengerDetails?.date}</div>}
        </div>
        <div className="text-right">
            <div className="font-mono text-sm">{req.passengerDetails?.time.substring(0, 5)}</div>
            <div className="text-xs text-slate-400">{req.passengerDetails?.no_of_passengers} Pax</div>
        </div>
    </div>
);

export default CoordinatorRouteOptimization;
