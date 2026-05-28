import React, { useEffect, useState } from 'react';
import { getDivisions, createDivision, updateDivision, deleteDivision, getAllUsers, createSubDivision, updateSubDivision, deleteSubDivision } from '../services/userService';
import type { Division, User, SubDivision } from '../types';
import { Building, Plus, Edit, Trash2, X, ArrowLeft, Search, Users, Crown, Target, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DivisionManagement: React.FC = () => {
    const navigate = useNavigate();
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingDivision, setEditingDivision] = useState<Division | null>(null);
    const [editingSubDivision, setEditingSubDivision] = useState<SubDivision | null>(null);
    const [parentDivision, setParentDivision] = useState<Division | null>(null);
    const [selectedDivisionForTeam, setSelectedDivisionForTeam] = useState<Division | null>(null);
    const [formData, setFormData] = useState({ name: '' });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [divData, userData] = await Promise.all([
                getDivisions(),
                getAllUsers()
            ]);
            setDivisions(divData);
            setUsers(userData);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingDivision(null);
        setFormData({ name: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (division: Division) => {
        setEditingDivision(division);
        setFormData({ name: division.name });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this division? This might affect users assigned to it.')) {
            try {
                await deleteDivision(id);
                setDivisions(divisions.filter(d => d.id !== id));
            } catch (error) {
                console.error('Failed to delete division', error);
                alert('Failed to delete division');
            }
        }
    };

    const handleViewTeam = (division: Division) => {
        setSelectedDivisionForTeam(division);
        setIsTeamModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setSubmitLoading(true);
        try {
            if (editingDivision) {
                await updateDivision(editingDivision.id, formData.name);
                setDivisions(divisions.map(d => d.id === editingDivision.id ? { ...d, name: formData.name } : d));
            } else {
                await createDivision(formData.name);
                fetchData(); // Refresh to get new ID
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving division:', error);
            alert('Failed to save division');
        } finally {
            setSubmitLoading(false);
        }
    };

    const filteredDivisions = divisions.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getDivisionStats = (divisionId: number) => {
        const divUsers = users.filter(u => u.division_id === divisionId);
        return {
            hod: divUsers.find(u => u.role === 'HOD'),
            coordinator: divUsers.find(u => u.role === 'COORDINATOR'),
            staffCount: divUsers.filter(u => u.role === 'STAFF').length,
            total: divUsers.length
        };
    };

    // SubDivision Handlers
    const handleAddSubDivision = (division: Division) => {
        setParentDivision(division);
        setEditingSubDivision(null);
        setFormData({ name: '' });
        setIsSubModalOpen(true);
    };

    const handleEditSubDivision = (subDiv: SubDivision, division: Division) => {
        setParentDivision(division);
        setEditingSubDivision(subDiv);
        setFormData({ name: subDiv.name });
        setIsSubModalOpen(true);
    };

    const handleDeleteSubDivision = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this sub-division?')) {
            try {
                await deleteSubDivision(id);
                fetchData();
            } catch (error) {
                console.error('Failed to delete sub-division', error);
                alert('Failed to delete sub-division');
            }
        }
    };

    const handleSubDivisionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !parentDivision) return;

        setSubmitLoading(true);
        try {
            if (editingSubDivision) {
                await updateSubDivision(editingSubDivision.id, formData.name);
            } else {
                await createSubDivision(parentDivision.id, formData.name);
            }
            setIsSubModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error saving sub-division:', error);
            alert('Failed to save sub-division');
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <div className="desktop-page-narrow max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="desktop-btn-icon desktop-btn-icon-neutral md:hidden"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Divisions & Teams</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Manage organizational structure and view team hierarchies.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative hidden sm:block">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search divisions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="desktop-input pl-8 w-48 text-xs"
                        />
                    </div>
                    <button
                        onClick={handleCreate}
                        className="desktop-btn desktop-btn-accent w-full md:w-auto min-w-0 text-xs sm:text-sm"
                    >
                        <Plus size={14} />
                        Add Division
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredDivisions.map((division) => {
                        const stats = getDivisionStats(division.id);
                        return (
                            <div key={division.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Division Info */}
                                    <div className="flex items-start gap-3 min-w-[200px]">
                                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <Building size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900">{division.name}</h3>
                                            <p className="text-[11px] text-slate-500 font-medium">{stats.total} Members Total</p>
                                        </div>
                                    </div>

                                    {/* Quick Roles Overview */}
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {/* HOD */}
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-100/50">
                                            <div className="p-1.5 bg-orange-100 text-orange-600 rounded-md">
                                                <Crown size={12} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-orange-800 font-bold uppercase tracking-wider">Head (HOD)</p>
                                                <p className="text-xs font-semibold text-slate-800 truncate">
                                                    {stats.hod ? stats.hod.name : <span className="text-slate-400 italic font-normal">Unassigned</span>}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Coordinator */}
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100/50">
                                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
                                                <Target size={12} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-blue-800 font-bold uppercase tracking-wider">Coordinator</p>
                                                <p className="text-xs font-semibold text-slate-800 truncate">
                                                    {stats.coordinator ? stats.coordinator.name : <span className="text-slate-400 italic font-normal">Unassigned</span>}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Staff Stats */}
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100/50">
                                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md">
                                                <Users size={12} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Staff</p>
                                                <p className="text-xs font-semibold text-slate-800 truncate">
                                                    {stats.staffCount} Members
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 md:pl-4 md:border-l md:border-slate-100">
                                        <button
                                            onClick={() => handleViewTeam(division)}
                                            className="desktop-btn desktop-btn-primary min-w-0 text-xs sm:text-sm"
                                        >
                                            <Users size={14} /> View Team
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEdit(division)}
                                                className="desktop-btn-icon desktop-btn-icon-primary"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(division.id)}
                                                className="desktop-btn-icon desktop-btn-icon-danger"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Sub-Divisions Section */}
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                            <Layers size={14} />
                                            Sub-Divisions
                                        </h4>
                                        <button
                                            onClick={() => handleAddSubDivision(division)}
                                            className="desktop-btn desktop-btn-secondary min-w-0 px-3 py-2 text-xs text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                                        >
                                            <Plus size={12} />
                                            Add Sub-Division
                                        </button>
                                    </div>

                                    {division.subDivisions && division.subDivisions.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {division.subDivisions.map(subDiv => (
                                                <div key={subDiv.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Layers size={14} className="text-slate-400 flex-shrink-0" />
                                                        <span className="text-sm font-medium text-slate-700 truncate">{subDiv.name}</span>
                                                        <span className="text-xs text-slate-400">({subDiv.users?.length || 0})</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleEditSubDivision(subDiv, division)}
                                                            className="desktop-btn-icon desktop-btn-icon-primary h-8 w-8 rounded-lg"
                                                            title="Edit"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSubDivision(subDiv.id)}
                                                            className="desktop-btn-icon desktop-btn-icon-danger h-8 w-8 rounded-lg"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">No sub-divisions yet</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredDivisions.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                            <Building size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-slate-500 text-sm">No divisions found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-sm font-bold text-slate-900">
                                {editingDivision ? 'Edit Division' : 'Create New Division'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Division Name</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                        placeholder="e.g. Finance"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="desktop-btn desktop-btn-secondary min-w-0 text-xs sm:text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="desktop-btn desktop-btn-primary min-w-0 text-xs sm:text-sm"
                                >
                                    {submitLoading ? 'Saving...' : 'Save Division'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SubDivision Modal */}
            {isSubModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Layers size={18} className="text-indigo-600" />
                                {editingSubDivision ? 'Edit Sub-Division' : 'Create New Sub-Division'}
                            </h2>
                            <button onClick={() => setIsSubModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubDivisionSubmit} className="p-5 space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Parent Division
                                </label>
                                <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700">
                                    {parentDivision?.name}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Sub-Division Name
                                </label>
                                <div className="relative">
                                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                                        placeholder="e.g. Accounts"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsSubModalOpen(false)}
                                    className="desktop-btn desktop-btn-secondary min-w-0 text-xs sm:text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="desktop-btn desktop-btn-accent min-w-0 text-xs sm:text-sm"
                                >
                                    {submitLoading ? 'Saving...' : 'Save Sub-Division'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Team View Modal */}
            {isTeamModalOpen && selectedDivisionForTeam && (() => {
                const divUsers = users.filter(u => u.division_id === selectedDivisionForTeam.id);
                // Categorize based on Role Name
                const hod = divUsers.filter(u => u.role === 'HOD');
                const coordinators = divUsers.filter(u => u.role === 'COORDINATOR');
                const staff = divUsers.filter(u => u.role === 'STAFF');

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Building size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">{selectedDivisionForTeam.name} Team</h2>
                                        <p className="text-xs text-slate-500 font-medium">Organizational Hierarchy & Members</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsTeamModalOpen(false)}
                                    className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto space-y-6">
                                {/* HOD Section */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Crown size={14} className="text-orange-500" /> Head of Department
                                    </h3>
                                    {hod.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {hod.map(u => (
                                                <div key={u.id} className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm flex items-center gap-3 relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                                                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-bold text-sm">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                                                        <p className="text-xs text-slate-500">{u.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-400 italic bg-slate-100/50 p-3 rounded-lg border border-dashed border-slate-200 text-center">
                                            No HOD assigned
                                        </div>
                                    )}
                                </div>

                                {/* Coordinator Section */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Target size={14} className="text-blue-500" /> Coordinators
                                    </h3>
                                    {coordinators.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {coordinators.map(u => (
                                                <div key={u.id} className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm flex items-center gap-3 relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                                                        <p className="text-xs text-slate-500">{u.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-400 italic bg-slate-100/50 p-3 rounded-lg border border-dashed border-slate-200 text-center">
                                            No Coordinators assigned
                                        </div>
                                    )}
                                </div>

                                {/* Staff Section */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Users size={14} className="text-emerald-500" /> Staff Members
                                    </h3>
                                    {staff.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {staff.map(u => (
                                                <div key={u.id} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-3 relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-sm">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                                                        <p className="text-xs text-slate-500">{u.email}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{u.employee_id}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-400 italic bg-slate-100/50 p-3 rounded-lg border border-dashed border-slate-200 text-center">
                                            No Staff Members assigned
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                                <button
                                    onClick={() => setIsTeamModalOpen(false)}
                                    className="desktop-btn desktop-btn-secondary min-w-0 text-xs sm:text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default DivisionManagement;
