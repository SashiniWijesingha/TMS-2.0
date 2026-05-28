import React, { useEffect, useState } from 'react';
import {
    Trash2, Plus, X, Edit2, Settings, ChevronRight,
    Truck, Box, Check, Search, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getVehicleTypes,
    createVehicleType,
    deleteVehicleType,
    updateVehicleType
} from '../../services/vehicleService';
import {
    createAttribute,
    deleteAttribute,
    updateAttribute
} from '../../services/attributeService';

// --- Types ---
interface VehicleAttribute {
    id: number;
    key: string;
    label: string;
    type: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN';
    options: string[] | null;
    unit: string | null;
    is_required: boolean;
}

interface VehicleType {
    id: number;
    name: string;
    category: 'PASSENGER' | 'MATERIAL';
    attributes?: VehicleAttribute[];
}

interface NotificationState {
    show: boolean;
    message: string;
    type: 'success' | 'error';
}

// --- Components ---

const NotificationBanner = ({ notification, onClose }: { notification: NotificationState, onClose: () => void }) => {
    return (
        <AnimatePresence>
            {notification.show && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px] ${notification.type === 'error' ? 'bg-red-50 text-red-900 border border-red-100' : 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                        }`}
                >
                    <div className={`p-2 rounded-full ${notification.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                        {notification.type === 'error' ? <AlertTriangle size={20} /> : <Check size={20} />}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sm">{notification.type === 'error' ? 'Error' : 'Success'}</h4>
                        <p className="text-xs opacity-90">{notification.message}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                        <X size={16} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-bold text-lg text-slate-800">{title}</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </motion.div>
        </div>
    );
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="text-center py-4">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 mb-8">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all">
                        Delete
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- Main Page Component ---

const VehicleCategories: React.FC = () => {
    const [types, setTypes] = useState<VehicleType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

    // Notification State
    const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'success' });

    // Modal States
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<VehicleType | null>(null);
    const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
    const [editingSpec, setEditingSpec] = useState<VehicleAttribute | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, type: 'TYPE' | 'SPEC', id: number | null }>({ isOpen: false, type: 'TYPE', id: null });

    const selectedType = types.find(t => t.id === selectedTypeId) || null;

    useEffect(() => {
        fetchData();
    }, []);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 4000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = (await getVehicleTypes()) as unknown as VehicleType[];
            setTypes(data);
            if (selectedTypeId && !data.find(t => t.id === selectedTypeId)) {
                setSelectedTypeId(null);
            }
        } catch (error) {
            console.error(error);
            showNotification("Failed to load vehicle types", 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Type Actions ---

    const handleSaveType = async (typeData: { name: string, category: string }) => {
        try {
            if (editingType) {
                await updateVehicleType(editingType.id, typeData.name, typeData.category);
                showNotification("Vehicle type updated successfully", 'success');
            } else {
                await createVehicleType(typeData.name, typeData.category);
                showNotification("Vehicle type created successfully", 'success');
            }
            await fetchData();
            setIsTypeModalOpen(false);
            setEditingType(null);
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.message || (editingType ? "Failed to update type" : "Failed to create type");
            showNotification(msg, 'error');
        }
    };

    const confirmDeleteType = (id: number) => {
        setDeleteConfirmation({ isOpen: true, type: 'TYPE', id });
    };

    const handleDeleteType = async () => {
        if (!deleteConfirmation.id) return;
        try {
            await deleteVehicleType(deleteConfirmation.id);
            if (selectedTypeId === deleteConfirmation.id) setSelectedTypeId(null);
            await fetchData();
            showNotification("Vehicle type deleted successfully", 'success');
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.message || "Failed to delete type";
            showNotification(msg, 'error');
        } finally {
            setDeleteConfirmation({ isOpen: false, type: 'TYPE', id: null });
        }
    };

    // --- Specification Actions ---

    const handleSaveSpec = async (specData: any) => {
        if (!selectedTypeId) return;
        try {
            if (editingSpec) {
                await updateAttribute(editingSpec.id, specData);
                showNotification("Specification updated successfully", 'success');
            } else {
                await createAttribute(selectedTypeId, specData);
                showNotification("Specification added successfully", 'success');
            }
            await fetchData();
            setIsSpecModalOpen(false);
            setEditingSpec(null);
        } catch (error: any) {
            console.error(error);
            showNotification("Failed to save specification", 'error');
        }
    };

    const confirmDeleteSpec = (id: number) => {
        setDeleteConfirmation({ isOpen: true, type: 'SPEC', id });
    };

    const handleDeleteSpec = async () => {
        if (!deleteConfirmation.id) return;
        try {
            await deleteAttribute(deleteConfirmation.id);
            await fetchData();
            showNotification("Specification deleted successfully", 'success');
        } catch (error: any) {
            console.error(error);
            showNotification("Failed to delete specification", 'error');
        } finally {
            setDeleteConfirmation({ isOpen: false, type: 'SPEC', id: null });
        }
    };

    // --- Render Helpers ---

    const filteredTypes = types.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-64px)] bg-slate-50/50 flex flex-col overflow-hidden relative">
            <NotificationBanner notification={notification} onClose={() => setNotification({ ...notification, show: false })} />

            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center shrink-0 shadow-sm z-20">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Settings className="text-indigo-600" size={28} />
                        Vehicle Configuration
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage standard vehicle types and their technical specifications.</p>
                </div>
                <button
                    onClick={() => { setEditingType(null); setIsTypeModalOpen(true); }}
                    className="desktop-btn desktop-btn-accent min-w-0"
                >
                    <Plus size={20} />
                    New Vehicle Type
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar List */}
                <div className="w-96 bg-white border-r border-slate-200 flex flex-col z-10">
                    <div className="p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search vehicle types..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                <p className="text-xs text-slate-400 font-medium">Loading...</p>
                            </div>
                        ) : filteredTypes.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                    <Search size={24} />
                                </div>
                                <p className="text-slate-500 font-medium">No types found.</p>
                                <button onClick={() => { setEditingType(null); setIsTypeModalOpen(true); }} className="text-indigo-600 font-bold text-sm mt-2 hover:underline">
                                    Create one now
                                </button>
                            </div>
                        ) : (
                            filteredTypes.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedTypeId(type.id)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all group relative duration-200 ${selectedTypeId === type.id
                                        ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200 z-10'
                                        : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50/80 hover:shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${selectedTypeId === type.id
                                                ? (type.category === 'PASSENGER' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600')
                                                : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-indigo-500'
                                                }`}>
                                                {type.category === 'PASSENGER' ? <Truck size={20} /> : <Box size={20} />}
                                            </div>
                                            <div>
                                                <h3 className={`font-bold transition-colors ${selectedTypeId === type.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                    {type.name}
                                                </h3>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block mt-1">
                                                    {type.category}
                                                </span>
                                            </div>
                                        </div>
                                        {selectedTypeId === type.id && <ChevronRight size={18} className="text-indigo-500" />}
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 pl-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <div className={`w-1.5 h-1.5 rounded-full ${type.attributes && type.attributes.length > 0 ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                                            {type.attributes?.length || 0} configurations
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Details Area */}
                <div className="flex-1 bg-slate-50 overflow-y-auto p-4 md:p-8">
                    {selectedType ? (
                        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Selected Type Header */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex items-center gap-6">
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner ${selectedType.category === 'PASSENGER' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'
                                        }`}>
                                        {selectedType.category === 'PASSENGER' ? <Truck size={40} /> : <Box size={40} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-3xl font-bold text-slate-900">{selectedType.name}</h2>
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${selectedType.category === 'PASSENGER' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                {selectedType.category}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 font-medium flex items-center gap-2">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono">ID: {selectedType.id}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span className="text-sm">Configured with {selectedType.attributes?.length || 0} specifications</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => { setEditingType(selectedType); setIsTypeModalOpen(true); }}
                                        className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Edit2 size={16} /> Edit
                                    </button>
                                    <button
                                        onClick={() => confirmDeleteType(selectedType.id)}
                                        className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Trash2 size={16} /> Delete
                                    </button>
                                </div>
                            </div>

                            {/* Specifications Grid */}
                            <div>
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">Specifications</h3>
                                        <p className="text-slate-500">Define the data fields required for this vehicle type.</p>
                                    </div>
                                    <button
                                        onClick={() => { setEditingSpec(null); setIsSpecModalOpen(true); }}
                                        className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-md shadow-slate-900/10 transition-all flex items-center gap-2 text-sm"
                                    >
                                        <Plus size={16} /> Add Spec
                                    </button>
                                </div>

                                {(!selectedType.attributes || selectedType.attributes.length === 0) ? (
                                    <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Settings size={32} className="text-slate-300" />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-700">No specifications yet</h4>
                                        <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">Add specifications to define what information should be collected when registering a vehicle of this type.</p>
                                        <button
                                            onClick={() => { setEditingSpec(null); setIsSpecModalOpen(true); }}
                                            className="px-6 py-2.5 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-colors"
                                        >
                                            Add First Specification
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedType.attributes.map(attr => (
                                            <div key={attr.id} className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-gradient-to-l from-white via-white to-transparent pl-8">
                                                    <button
                                                        onClick={() => { setEditingSpec(attr); setIsSpecModalOpen(true); }}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDeleteSpec(attr.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                <div className="flex items-start gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs uppercase tracking-wider border ${attr.type === 'SELECT' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                        attr.type === 'NUMBER' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                                                            'bg-slate-50 text-slate-600 border-slate-100'
                                                        }`}>
                                                        {attr.type.substring(0, 3)}
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-16">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-slate-800 truncate">{attr.label}</h4>
                                                            {attr.is_required && (
                                                                <span className="text-[10px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">REQ</span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-xs text-slate-500 font-mono bg-slate-50 inline-block px-1.5 rounded">{attr.key}</div>
                                                            {attr.unit && (
                                                                <p className="text-xs text-slate-500">Unit: <span className="font-bold text-slate-700">{attr.unit}</span></p>
                                                            )}
                                                            {Array.isArray(attr.options) && attr.options.length > 0 && (
                                                                <p className="text-xs text-slate-500 truncate">
                                                                    Options: <span className="font-medium text-slate-700">{attr.options.join(', ')}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <Truck size={64} className="text-indigo-200" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Select a Vehicle Type</h2>
                            <p className="text-slate-500 max-w-md">
                                Choose a vehicle type from the sidebar to view detailed specifications, or create a new type to get started.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Modals --- */}

            <Modal
                isOpen={isTypeModalOpen}
                onClose={() => setIsTypeModalOpen(false)}
                title={editingType ? "Edit Vehicle Type" : "Create Vehicle Type"}
            >
                <VehicleTypeForm
                    initialData={editingType}
                    onSubmit={handleSaveType}
                    onCancel={() => setIsTypeModalOpen(false)}
                />
            </Modal>

            <Modal
                isOpen={isSpecModalOpen}
                onClose={() => setIsSpecModalOpen(false)}
                title={editingSpec ? "Edit Specification" : "Add Specification"}
            >
                <SpecificationForm
                    initialData={editingSpec}
                    onSubmit={handleSaveSpec}
                    onCancel={() => setIsSpecModalOpen(false)}
                />
            </Modal>

            <DeleteConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
                onConfirm={deleteConfirmation.type === 'TYPE' ? handleDeleteType : handleDeleteSpec}
                title={deleteConfirmation.type === 'TYPE' ? 'Delete Vehicle Type?' : 'Remove Specification?'}
                message={deleteConfirmation.type === 'TYPE'
                    ? "Are you sure you want to delete this vehicle type? This action cannot be undone and might fail if vehicles are already assigned to this type."
                    : "This will remove this data field from all vehicles of this type. Existing data for this field will be lost."}
            />
        </div>
    );
};

// --- Sub-Forms ---

const VehicleTypeForm = ({ initialData, onSubmit, onCancel }: { initialData: VehicleType | null, onSubmit: (data: any) => void, onCancel: () => void }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [category, setCategory] = useState(initialData?.category || 'PASSENGER');

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Vehicle Type Name</label>
                <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Luxury Sedan, 10ft Lorry"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Category Group</label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setCategory('PASSENGER')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${category === 'PASSENGER'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                    >
                        <Truck size={24} />
                        <span className="font-bold text-sm">Passenger</span>
                    </button>
                    <button
                        onClick={() => setCategory('MATERIAL')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${category === 'MATERIAL'
                            ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                    >
                        <Box size={24} />
                        <span className="font-bold text-sm">Material</span>
                    </button>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button onClick={onCancel} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                    Cancel
                </button>
                <button
                    onClick={() => onSubmit({ name, category })}
                    disabled={!name.trim()}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all"
                >
                    {initialData ? 'Save Changes' : 'Create Type'}
                </button>
            </div>
        </div>
    );
};

const SpecificationForm = ({ initialData, onSubmit, onCancel }: { initialData: VehicleAttribute | null, onSubmit: (data: any) => void, onCancel: () => void }) => {
    const [form, setForm] = useState({
        label: '', type: 'TEXT', options: '', unit: '', is_required: false
    });

    useEffect(() => {
        if (initialData) {
            setForm({
                label: initialData.label,
                type: initialData.type,
                options: Array.isArray(initialData.options) ? initialData.options.join(', ') : '',
                unit: initialData.unit || '',
                is_required: initialData.is_required
            });
        } else {
            setForm({ label: '', type: 'TEXT', options: '', unit: '', is_required: false });
        }
    }, [initialData]);

    const handleSubmit = () => {
        const key = form.label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
        const optionsArray = form.type === 'SELECT' ? form.options.split(',').map(s => s.trim()).filter(Boolean) : null;

        onSubmit({
            label: form.label,
            key: key, // Auto-generate key
            type: form.type,
            options: optionsArray,
            unit: form.unit,
            is_required: form.is_required
        });
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Attribute Name</label>
                    <input
                        required
                        autoFocus
                        value={form.label}
                        onChange={e => setForm({ ...form, label: e.target.value })}
                        placeholder="e.g. Max Load, Fuel Type"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium"
                    />
                </div>

                <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Input Type</label>
                    <select
                        value={form.type}
                        onChange={e => setForm({ ...form, type: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none bg-white font-medium"
                    >
                        <option value="TEXT">Text Field</option>
                        <option value="NUMBER">Number Field</option>
                        <option value="SELECT">Dropdown List</option>
                        <option value="BOOLEAN">Yes/No Switch</option>
                    </select>
                </div>

                <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Unit (Optional)</label>
                    <input
                        value={form.unit}
                        onChange={e => setForm({ ...form, unit: e.target.value })}
                        placeholder="e.g. Kg, M3, Seats"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium"
                    />
                </div>
            </div>

            {form.type === 'SELECT' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Dropdown Options</label>
                    <textarea
                        value={form.options}
                        onChange={e => setForm({ ...form, options: e.target.value })}
                        placeholder="Option 1, Option 2, Option 3"
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Separate options with commas.</p>
                </div>
            )}

            <div className="pt-2">
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${form.is_required ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                        {form.is_required && <Check size={14} />}
                    </div>
                    <input
                        type="checkbox"
                        className="hidden"
                        checked={form.is_required}
                        onChange={e => setForm({ ...form, is_required: e.target.checked })}
                    />
                    <div className="flex-1">
                        <span className="font-bold text-slate-700 block text-sm">Mandatory Field</span>
                        <span className="text-xs text-slate-400">Users must provide this value when registering.</span>
                    </div>
                </label>
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-100 mt-2">
                <button onClick={onCancel} className="flex-1 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!form.label}
                    className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md"
                >
                    {initialData ? 'Update Specification' : 'Add Specification'}
                </button>
            </div>
        </div>
    );
};

export default VehicleCategories;
