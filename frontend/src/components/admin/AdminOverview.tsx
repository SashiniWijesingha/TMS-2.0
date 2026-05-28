import React from 'react';
import { Users, FileText, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { RequestStatus } from '../../types';
import type { User, VehicleRequest } from '../../types';

interface AdminOverviewProps {
    users: User[];
    requests: VehicleRequest[];
}

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all group">
        <div className="flex justify-between items-start mb-2">
            <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-opacity-100 group-hover:scale-110 transition-transform`}>
                <Icon size={18} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metric</span>
        </div>
        <div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{title}</p>
        </div>
    </div>
);

const AdminOverview: React.FC<AdminOverviewProps> = ({ users, requests }) => {
    const stats = {
        totalUsers: users.length,
        totalRequests: requests.length,
        pendingRequests: requests.filter(r => r.status.includes('PENDING')).length,
        allocatedRequests: requests.filter(r => r.status === RequestStatus.ALLOCATED).length,
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    color="bg-blue-100 text-blue-600"
                />
                <StatCard
                    title="Pending Requests"
                    value={stats.pendingRequests}
                    icon={Clock}
                    color="bg-amber-100 text-amber-600"
                />
                <StatCard
                    title="Allocated Trips"
                    value={stats.allocatedRequests}
                    icon={CheckCircle}
                    color="bg-emerald-100 text-emerald-600"
                />
                <StatCard
                    title="Total Requests"
                    value={stats.totalRequests}
                    icon={FileText}
                    color="bg-purple-100 text-purple-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Recent Activity</h3>
                        <button className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            View All <ArrowRight size={10} />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {requests.slice(0, 5).map(req => (
                            <div key={req.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${req.request_type === 'PASSENGER' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                                        {req.request_type[0]}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">Request #{req.id}</p>
                                        <p className="text-[10px] text-slate-500">By {req.requester?.name || 'Unknown'}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${req.status.includes('PENDING') ? 'bg-amber-50 text-amber-700' :
                                        req.status === 'APPROVED' ? 'bg-blue-50 text-blue-700' :
                                            req.status === 'ALLOCATED' ? 'bg-indigo-50 text-indigo-700' :
                                                'bg-slate-100 text-slate-700'
                                    }`}>
                                    {req.status.replace('_', ' ')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;
