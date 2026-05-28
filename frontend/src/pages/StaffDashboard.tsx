import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FileText, Clock, CheckCircle, XCircle, ChevronRight, PlusCircle, ArrowRight } from 'lucide-react';
import { getNewRequestPath } from '../utils/systemSelection';

const StatCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all group">
        <div className="flex justify-between items-start mb-2">
            <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-opacity-100 group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metric</span>
        </div>
        <div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">{title}</p>
        </div>
    </div>
);

const StaffDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = user.role;
    const userName = user.name || 'User';

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
    });
    const [recentRequests, setRecentRequests] = useState<any[]>([]);
    const navigate = useNavigate();
    const newRequestPath = getNewRequestPath();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/requests');
                const reqs = res.data;

                const newStats = {
                    total: reqs.length,
                    pending: reqs.filter((r: any) => ['PENDING_CEO', 'PENDING_COORDINATOR', 'PENDING_HOD'].includes(r.status)).length,
                    approved: reqs.filter((r: any) => ['APPROVED', 'ALLOCATED', 'ON_GOING', 'COMPLETED'].includes(r.status)).length,
                    rejected: reqs.filter((r: any) => ['REJECTED', 'RETURNED', 'CANCELLED'].includes(r.status)).length
                };
                setStats(newStats);
                setRecentRequests(reqs.slice(0, 5));
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            }
        };
        fetchData();
    }, []);

    const dashboardTitle = userRole === 'HOD' ? 'HOD Dashboard'
        : userRole === 'ADMIN' ? 'Admin Dashboard'
            : 'Staff Dashboard';

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">{dashboardTitle}</h1>
                    <p className="text-xs text-slate-500 mt-1">{getGreeting()}, <span className="font-semibold text-slate-700">{userName}</span>. Here's your request overview.</p>
                </div>
                <button
                    onClick={() => navigate(newRequestPath)}
                    className="bg-[#005C2E] text-white px-4 py-2 rounded-xl hover:bg-[#004d26] transition-all shadow-lg shadow-green-900/10 text-xs font-black uppercase tracking-widest flex items-center gap-2"
                >
                    <PlusCircle size={16} />
                    New Request
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Requests"
                    value={stats.total}
                    icon={<FileText size={18} className="text-[#005C2E]" />}
                    color="bg-green-50 text-[#005C2E]"
                />
                <StatCard
                    title="Pending Review"
                    value={stats.pending}
                    icon={<Clock size={18} className="text-amber-600" />}
                    color="bg-amber-100 text-amber-600"
                />
                <StatCard
                    title="Approved / Active"
                    value={stats.approved}
                    icon={<CheckCircle size={18} className="text-emerald-600" />}
                    color="bg-emerald-100 text-emerald-600"
                />
                <StatCard
                    title="Rejected / Cancelled"
                    value={stats.rejected}
                    icon={<XCircle size={18} className="text-red-600" />}
                    color="bg-red-100 text-red-600"
                />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Recent Requests</h2>
                    <button onClick={() => navigate('/my-requests')} className="text-[10px] text-[#005C2E] hover:text-[#004d26] font-bold uppercase tracking-wide flex items-center gap-1">
                        View All <ArrowRight size={10} />
                    </button>
                </div>
                <div className="p-0">
                    {recentRequests.length === 0 ? (
                        <div className="text-center text-slate-400 py-12 flex flex-col items-center">
                            <div className="p-3 bg-slate-50 rounded-full mb-3">
                                <FileText size={24} className="text-slate-300" />
                            </div>
                            <span className="text-sm font-medium">No recent requests found</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">ID</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Project</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Date</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recentRequests.map(req => (
                                        <tr key={req.id} onClick={() => navigate(`/requests/${req.id}`)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                                            <td className="px-4 py-3 font-mono font-medium text-slate-500">#{req.id}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-800">{req.project_name}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                                    {req.division?.name} {req.sub_division ? `/ ${req.sub_division}` : ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{new Date(req.submitted_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border 
                                                    ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                        req.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                                                            'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                    {req.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-slate-300 group-hover:text-[#005C2E] transition-colors">
                                                    <ChevronRight size={14} />
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
