import React, { useState } from 'react';
import axios from 'axios';
import { Plus, Edit, UserX, Search, X } from 'lucide-react';
import { Role } from '../../types';
import type { User, Division } from '../../types';
import { createUser, updateUser, deleteUser } from '../../services/userService';
import { getVehicleTypes } from '../../services/vehicleService';
import type { VehicleType } from '../../types';

// Helper for generic alerts - in a real app, use a Toast system
const notify = (msg: string) => alert(msg); // Placeholder

interface UserManagementProps {
    users: User[];
    divisions: Division[];
    onRefresh: () => void;
}

interface DriverDetails {
    contact_no: string;
    nic_no: string;
    allowed_vehicle_type_ids: number[];
}

const UserManagement: React.FC<UserManagementProps> = ({ users, divisions, onRefresh }) => {
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');

    // Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<User> & { password?: string, driverDetails?: DriverDetails }>({});
    const [isEditingUser, setIsEditingUser] = useState(false);
    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);

    React.useEffect(() => {
        const fetchTypes = async () => {
            try {
                const types = await getVehicleTypes();
                setVehicleTypes(types);
            } catch (err) {
                console.error("Failed to load vehicle types", err);
            }
        };
        fetchTypes();
    }, []);

    // Handlers
    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!currentUser.employee_id || !currentUser.name || !currentUser.email || !currentUser.role) {
                notify('Please fill in all required fields');
                return;
            }

            if (currentUser.role === Role.DRIVER) {
                if (!currentUser.driverDetails?.contact_no || !currentUser.driverDetails?.nic_no) {
                    notify('Driver details (Contact & NIC) are required');
                    return;
                }
            }
            if (isEditingUser && currentUser.id) {
                await updateUser(currentUser.id, currentUser);
                notify('User updated successfully');
            } else {
                if (!currentUser.password) {
                    notify('Password is required for new users');
                    return;
                }
                await createUser(currentUser as any);
                notify('User created successfully');
            }
            setIsUserModalOpen(false);
            onRefresh();
        } catch (error) {
            console.error(error);
            const message = axios.isAxiosError(error)
                ? error.response?.data?.message || error.message
                : 'Failed to save user';
            notify(message || 'Failed to save user');
        }
    };

    const handleDeleteUser = async (id: number | string) => {
        if (confirm('Are you sure you want to deactivate this user? This will remove their TMS account and require them to go through the first-time sign-in setup again.')) {
            try {
                await deleteUser(id);
                onRefresh();
            } catch (error) {
                console.error(error);
                notify('Failed to delete user');
            }
        }
    };

    // Filtering
    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            u.employee_id.toLowerCase().includes(userSearchTerm.toLowerCase());
        const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-6 rounded-2xl border border-slate-200">
            <div className="flex flex-col gap-4 mb-6">
                {/* Role Filter Tabs */}
                <div className="flex flex-wrap gap-2">
                    {['ALL', ...Object.values(Role)].map((role) => (
                        <button
                            key={role}
                            onClick={() => setUserRoleFilter(role)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${userRoleFilter === role
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            {role === 'ALL' ? 'All Users' : role.charAt(0) + role.slice(1).toLowerCase().replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <div className="flex justify-between items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                            value={userSearchTerm}
                            onChange={e => setUserSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setCurrentUser({ role: Role.STAFF, driverDetails: { contact_no: '', nic_no: '', allowed_vehicle_type_ids: [] } });
                            setIsEditingUser(false);
                            setIsUserModalOpen(true);
                        }}
                        className="desktop-btn desktop-btn-primary min-w-0"
                    >
                        <Plus size={18} /> Add User
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b uppercase text-xs font-semibold text-slate-500">
                        <tr>
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Division</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-slate-900">{user.name}</div>
                                    <div className="text-xs text-slate-400">{user.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium border border-slate-200">{user.role}</span>
                                </td>
                                <td className="px-6 py-4">
                                    {divisions.find(d => d.id === user.division_id)?.name || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => {
                                            setCurrentUser({ ...user, password: '' });
                                            setIsEditingUser(true);
                                            setIsUserModalOpen(true);
                                        }} className="desktop-btn-icon desktop-btn-icon-primary"><Edit size={16} /></button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="desktop-btn-icon desktop-btn-icon-danger" title="Deactivate user"><UserX size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                    No users found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* User Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-900">{isEditingUser ? 'Edit User' : 'Create User'}</h2>
                            <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleUserSubmit} className="space-y-4" autoComplete="off">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
                                <input type="text" required value={currentUser.employee_id || ''} onChange={e => setCurrentUser({ ...currentUser, employee_id: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="EMP..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input type="text" required value={currentUser.name || ''} onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input type="email" required value={currentUser.email || ''} onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                    <select required value={currentUser.role || ''} onChange={e => setCurrentUser({ ...currentUser, role: e.target.value as Role })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none bg-white">
                                        {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Division</label>
                                    <select value={currentUser.division_id || ''} onChange={e => setCurrentUser({ ...currentUser, division_id: Number(e.target.value) || undefined })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none bg-white">
                                        <option value="">General / None</option>
                                        {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            {currentUser.role === Role.DRIVER && (
                                <div className="space-y-4 border-t border-slate-100 pt-4 mt-4">
                                    <h3 className="text-sm font-semibold text-slate-900">Driver Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact No</label>
                                            <input type="text" required value={currentUser.driverDetails?.contact_no || ''} onChange={e => setCurrentUser({ ...currentUser, driverDetails: { ...(currentUser.driverDetails || { contact_no: '', nic_no: '', allowed_vehicle_type_ids: [] }), contact_no: e.target.value } })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="07..." />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">NIC No</label>
                                            <input type="text" required value={currentUser.driverDetails?.nic_no || ''} onChange={e => setCurrentUser({ ...currentUser, driverDetails: { ...(currentUser.driverDetails || { contact_no: '', nic_no: '', allowed_vehicle_type_ids: [] }), nic_no: e.target.value } })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="NIC..." />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Allowed Vehicle Types</label>
                                        <div className="flex flex-wrap gap-2">
                                            {vehicleTypes.map(vt => (
                                                <button
                                                    key={vt.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const currentIds = currentUser.driverDetails?.allowed_vehicle_type_ids || [];
                                                        const newIds = currentIds.includes(vt.id)
                                                            ? currentIds.filter(id => id !== vt.id)
                                                            : [...currentIds, vt.id];
                                                        setCurrentUser({ ...currentUser, driverDetails: { ...(currentUser.driverDetails || { contact_no: '', nic_no: '', allowed_vehicle_type_ids: [] }), allowed_vehicle_type_ids: newIds } });
                                                    }}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${currentUser.driverDetails?.allowed_vehicle_type_ids?.includes(vt.id)
                                                        ? 'bg-slate-900 text-white border-slate-900'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {vt.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{isEditingUser ? 'New Password (Optional)' : 'Password'}</label>
                                <input type="password" required={!isEditingUser} value={currentUser.password || ''} onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsUserModalOpen(false)} className="desktop-btn desktop-btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="desktop-btn desktop-btn-primary flex-1">Save User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UserManagement;
