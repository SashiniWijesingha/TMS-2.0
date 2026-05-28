import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Calendar,
    Package,
    MapPin,
    Users,
    FileText,
    CheckCircle,
    Clock,
    Truck,
    Building,
    TrendingUp
} from 'lucide-react';
import type { User, Division, VehicleRequest } from '../types';
import { getAllUsers, getDivisions } from '../services/userService';
import api from '../services/api';

// Quick Action Card Component
const QuickActionCard = ({ icon: Icon, title, description, onClick, color = 'blue' }: any) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100',
        slate: 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
    };

    return (
        <button
            onClick={onClick}
            className={`group p-4 rounded-lg border transition-all text-left w-full ${colorClasses[color as keyof typeof colorClasses]}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-md ${color === 'blue' ? 'bg-blue-100' : color === 'emerald' ? 'bg-emerald-100' : color === 'purple' ? 'bg-purple-100' : color === 'amber' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                    <Icon size={18} />
                </div>
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="font-bold text-sm mb-1">{title}</h3>
            <p className="text-[10px] opacity-75 leading-relaxed">{description}</p>
        </button>
    );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, trend, color = 'blue' }: any) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
        red: 'bg-red-50 text-red-600'
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-md ${colorClasses[color as keyof typeof colorClasses]}`}>
                    <Icon size={16} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        <TrendingUp size={10} className={trend < 0 ? 'rotate-180' : ''} />
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
            </div>
        </div>
    );
};

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [requests, setRequests] = useState<VehicleRequest[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [usersData, divisionsData, requestsData, vehiclesData] = await Promise.all([
                getAllUsers(),
                getDivisions(),
                api.get('/requests').then(res => res.data),
                api.get('/vehicles').then(res => res.data).catch(() => [])
            ]);

            setUsers(usersData);
            setDivisions(divisionsData);
            setRequests(requestsData);
            setVehicles(vehiclesData);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    // Calculate statistics
    const totalUsers = users.length;
    const activeUsers = users.filter(u => !u.must_change_password).length;
    const pendingRequests = requests.filter(r => r.status === 'PENDING_CEO' || r.status === 'PENDING_COORDINATOR' || r.status === 'PENDING_HOD').length;
    const approvedRequests = requests.filter(r => r.status === 'APPROVED').length;
    const completedRequests = requests.filter(r => r.status === 'COMPLETED').length;
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.availability_status === 'AVAILABLE').length;

    // Recent requests (last 5)
    const recentRequests = [...requests]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    // Active Allocations (last 5)
    const activeAllocations = requests
        .filter(r => r.status === 'ALLOCATED' || r.status === 'ON_GOING' || r.status === 'COMPLETED')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transport Administration</h1>
                    <p className="text-sm text-slate-500 mt-1">Comprehensive system management and oversight</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={14} />
                    <span>Last updated: {new Date().toLocaleTimeString()}</span>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Users}
                    label="Total Users"
                    value={totalUsers}
                    color="blue"
                />
                <StatCard
                    icon={FileText}
                    label="Active Requests"
                    value={pendingRequests}
                    color="amber"
                />
                <StatCard
                    icon={Truck}
                    label="Available Vehicles"
                    value={`${availableVehicles}/${totalVehicles}`}
                    color="emerald"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Completed Today"
                    value={completedRequests}
                    color="purple"
                />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <QuickActionCard
                        icon={Users}
                        title="User Management"
                        description="Add, edit, or remove system users"
                        onClick={() => navigate('/admin/users')}
                        color="blue"
                    />
                    <QuickActionCard
                        icon={Truck}
                        title="Fleet Management"
                        description="Manage vehicles and categories"
                        onClick={() => navigate('/admin/vehicles')}
                        color="emerald"
                    />
                    <QuickActionCard
                        icon={Building}
                        title="Divisions"
                        description="Configure organizational units"
                        onClick={() => navigate('/admin/divisions')}
                        color="purple"
                    />
                    <QuickActionCard
                        icon={Package}
                        title="Allocations"
                        description="View vehicle allocations"
                        onClick={() => navigate('/transport/allocations')}
                        color="slate"
                    />
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Recent Requests */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Recent Requests</h3>
                            <button
                                onClick={() => navigate('/my-requests')}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                View All
                                <ArrowRight size={12} />
                            </button>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {recentRequests.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <FileText size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No recent requests</p>
                                </div>
                            ) : (
                                recentRequests.map((req) => (
                                    <div
                                        key={req.id}
                                        className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/requests/${req.id}`)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-xs text-slate-400">#{req.id}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${req.request_type === 'PASSENGER'
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'bg-emerald-50 text-emerald-700'
                                                        }`}>
                                                        {req.request_type}
                                                    </span>
                                                </div>
                                                <p className="font-semibold text-sm text-slate-900 truncate">{req.project_name}</p>
                                                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {new Date(req.created_at).toLocaleDateString()}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{req.requester?.name || 'Unknown'}</span>
                                                    <span>•</span>
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                                        {req.division?.name} {req.sub_division ? `/ ${req.sub_division}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${req.status === 'COMPLETED'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : req.status === 'APPROVED'
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : req.status.includes('PENDING')
                                                            ? 'bg-amber-50 text-amber-700'
                                                            : 'bg-slate-50 text-slate-700'
                                                    }`}>
                                                    {req.status.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Active Allocations Section */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Active Allocations</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {activeAllocations.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Truck size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No active allocations</p>
                                </div>
                            ) : (
                                activeAllocations.map((req) => (
                                    <div
                                        key={req.id}
                                        className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/requests/${req.id}`)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-xs text-slate-400">#{req.id}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${req.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {req.status.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <p className="font-semibold text-sm text-slate-900 truncate">{req.project_name}</p>

                                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                                                    {req.allocation?.vehicle && (
                                                        <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded">
                                                            <Truck size={12} className="text-slate-500" />
                                                            {req.allocation.vehicle.vehicle_number}
                                                        </span>
                                                    )}
                                                    {req.allocation?.driver && (
                                                        <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded">
                                                            <MapPin size={12} className="text-slate-500" />
                                                            {req.allocation.driver.user?.name || 'Driver Assigned'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-slate-300 self-center" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

                {/* System Overview */}
                <div className="space-y-4">
                    {/* Request Status Breakdown */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Request Status</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                    <span className="text-xs text-slate-600">Pending</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">{pendingRequests}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-xs text-slate-600">Approved</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">{approvedRequests}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-xs text-slate-600">Completed</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">{completedRequests}</span>
                            </div>
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">System Health</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={14} className="text-emerald-500" />
                                    <span className="text-xs text-slate-600">Active Users</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">{activeUsers}/{totalUsers}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={14} className="text-emerald-500" />
                                    <span className="text-xs text-slate-600">Divisions</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">{divisions.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={14} className="text-emerald-500" />
                                    <span className="text-xs text-slate-600">Fleet Size</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">{totalVehicles}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
