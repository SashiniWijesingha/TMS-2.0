import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
    Users,
    Plus,
    Search,
    Edit,
    UserX,
    Mail,
    Shield,
    Building,
    X,
    Save,
    Key
} from 'lucide-react';
import { getAllUsers, getDivisions, createUser, updateUser, deleteUser } from '../services/userService';
import type { User, Division, Role } from '../types';

const UserModal = ({
    editingUser,
    divisions,
    onClose,
    onSave
}: {
    editingUser: User | null;
    divisions: Division[];
    onClose: () => void;
    onSave: (formData: any) => Promise<void>;
}) => {
    const [formData, setFormData] = useState({
        name: editingUser?.name || '',
        email: editingUser?.email || '',
        employee_id: editingUser?.employee_id || '',
        role: editingUser?.role || 'STAFF' as Role,
        division_id: editingUser?.division_id?.toString() || '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900">
                        {editingUser ? 'Edit User' : 'Add New User'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            disabled={!!editingUser && editingUser.account_type !== 'LOCAL'}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                            autoComplete="off"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={!!editingUser && editingUser.account_type !== 'LOCAL'}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                            autoComplete="off"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Employee ID</label>
                        <input
                            type="text"
                            id="employee_id"
                            name="employee_id"
                            required
                            value={formData.employee_id}
                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                            disabled={!!editingUser && editingUser.account_type !== 'LOCAL'}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                            autoComplete="off"
                        />
                        {!!editingUser && editingUser.account_type !== 'LOCAL' && (
                            <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                                <Shield size={10} /> Contact HR to change synced fields.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                        <select
                            required
                            value={formData.role}
                            onChange={(e) => {
                                const newRole = e.target.value as Role;
                                setFormData({
                                    ...formData,
                                    role: newRole,
                                    division_id: newRole === 'DRIVER' ? '' : formData.division_id
                                });
                            }}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="STAFF">Staff</option>
                            <option value="COORDINATOR">Coordinator</option>
                            <option value="HOD">HOD</option>
                            <option value="CEO">CEO</option>
                            <option value="TRANSPORT">Transport</option>
                            {editingUser?.role === 'DRIVER' && <option value="DRIVER">Driver</option>}
                            <option value="ADMIN">Admin</option>
                            <option value="MCU_USER">MCU User</option>
                            <option value="CALL_CENTER">Call Center</option>
                            <option value="WAREHOUSE">Warehouse</option>
                        </select>
                    </div>
                    {formData.role !== 'DRIVER' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Division</label>
                            <select
                                value={formData.division_id}
                                onChange={(e) => setFormData({ ...formData, division_id: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">No Division</option>
                                {divisions.map(div => (
                                    <option key={div.id} value={div.id}>{div.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {!editingUser && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="new-password"
                                required={!editingUser}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Enter password"
                                autoComplete="new-password"
                            />
                        </div>
                    )}
                    <div className="flex gap-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Save size={14} />
                            {editingUser ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [divisionFilter, setDivisionFilter] = useState<string>('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersData, divisionsData] = await Promise.all([
                getAllUsers(),
                getDivisions()
            ]);
            setUsers(usersData);
            setDivisions(divisionsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingUser(null);
        setShowModal(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setShowModal(true);
    };

    const handleSave = async (formData: any) => {
        try {
            const submitData = {
                ...formData,
                division_id: formData.division_id ? parseInt(formData.division_id) : null
            };

            if (editingUser) {
                await updateUser(editingUser.id, submitData);
            } else {
                await createUser(submitData);
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving user:', error);
            const message = axios.isAxiosError(error)
                ? error.response?.data?.message || error.message
                : 'Failed to save user';
            alert(message || 'Failed to save user');
        }
    };

    const handleDelete = async (id: number | string) => {
        if (!confirm('Are you sure you want to deactivate this user? This will remove their TMS account and require them to go through the first-time sign-in setup again.')) return;
        try {
            await deleteUser(id);
            fetchData();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const divisionName = user.division_id
                ? (divisions.find((d) => d.id === user.division_id)?.name || '')
                : '';
            const matchesSearch = String(user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(user.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                divisionName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
            const matchesDivision = divisionFilter === 'ALL' || String(user.division_id || '') === divisionFilter;
            return matchesSearch && matchesRole && matchesDivision;
        });
    }, [users, divisions, searchTerm, roleFilter, divisionFilter]);

    const getRoleBadgeColor = (role: string) => {
        const colors: Record<string, string> = {
            ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
            COORDINATOR: 'bg-blue-50 text-blue-700 border-blue-200',
            HOD: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            CEO: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            TRANSPORT: 'bg-amber-50 text-amber-700 border-amber-200',
            DRIVER: 'bg-slate-50 text-slate-700 border-slate-200',
            STAFF: 'bg-slate-50 text-slate-700 border-slate-200',
            MCU_USER: 'bg-pink-50 text-pink-700 border-pink-200',
            CALL_CENTER: 'bg-cyan-50 text-cyan-700 border-cyan-200',
            WAREHOUSE: 'bg-orange-50 text-orange-700 border-orange-200',
            PENDING_HRIS: 'bg-slate-100 text-slate-400 border-slate-200'
        };
        return colors[role] || 'bg-slate-50 text-slate-700 border-slate-200';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500 font-medium">Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="desktop-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Users size={24} className="text-blue-500" />
                        User Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage system users and permissions</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="desktop-btn desktop-btn-accent min-w-0"
                >
                    <Plus size={16} />
                    Add User
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative w-full lg:min-w-0 lg:flex-[1.75]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name, email, employee ID, or division..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="desktop-input pl-10"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="desktop-input w-full lg:w-[220px] lg:flex-none"
                    >
                        <option value="ALL">All Roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="COORDINATOR">Coordinator</option>
                        <option value="HOD">HOD</option>
                        <option value="CEO">CEO</option>
                        <option value="TRANSPORT">Transport</option>
                        <option value="DRIVER">Driver</option>
                        <option value="STAFF">Staff</option>
                        <option value="MCU_USER">MCU User</option>
                        <option value="CALL_CENTER">Call Center</option>
                        <option value="WAREHOUSE">Warehouse</option>
                    </select>
                    <select
                        value={divisionFilter}
                        onChange={(e) => setDivisionFilter(e.target.value)}
                        className="desktop-input w-full lg:w-[240px] lg:flex-none"
                    >
                        <option value="ALL">All Divisions</option>
                        {divisions.map((division) => (
                            <option key={division.id} value={String(division.id)}>{division.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Employee ID</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Division</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                        <Users size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No users found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                    {user.name}
                                                    {user.account_type === 'LOCAL' ? (
                                                        <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Local</span>
                                                    ) : (
                                                        <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">HRIS</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Mail size={10} />
                                                    {user.email}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-xs text-slate-600">{user.employee_id}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${getRoleBadgeColor(user.role)}`}>
                                                <Shield size={10} />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.division_id ? (
                                                <span className="text-xs text-slate-600 flex items-center gap-1">
                                                    <Building size={10} />
                                                    {divisions.find(d => d.id === user.division_id)?.name || 'N/A'}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.source === 'HRIS' || (user.role as string) === 'PENDING_HRIS' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                                    Not Registered
                                                </span>
                                            ) : user.must_change_password ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    <Key size={10} />
                                                    Reset Required
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="desktop-btn-icon desktop-btn-icon-primary h-9 w-9 rounded-lg"
                                                    title="Edit user"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="desktop-btn-icon desktop-btn-icon-danger h-9 w-9 rounded-lg"
                                                    title="Deactivate user"
                                                >
                                                    <UserX size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* User count */}
            <div className="mt-4 text-sm text-slate-500">
                Showing {filteredUsers.length} of {users.length} users
            </div>

            {/* Modal */}
            {showModal && (
                <UserModal
                    editingUser={editingUser}
                    divisions={divisions}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default UserManagement;
