import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Users, Truck, FileCheck, LayoutDashboard, List } from 'lucide-react';

const AdminRoleNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        {
            label: 'Admin',
            path: '/dashboard',
            icon: LayoutDashboard,
            color: 'text-blue-400'
        },
        {
            label: 'Coordinator',
            path: '/coordinator/requests',
            icon: List,
            color: 'text-purple-400'
        },
        {
            label: 'HOD Approvals',
            path: '/hod/approvals',
            icon: FileCheck,
            color: 'text-emerald-400'
        },
        {
            label: 'Transport Allocations',
            path: '/transport/allocations',
            icon: Truck,
            color: 'text-amber-400'
        },
        {
            label: 'Staff View',
            path: '/my-requests',
            icon: Users,
            color: 'text-slate-400'
        }
    ];

    return (
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:px-6">
            <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm shadow-slate-200">
                    <Shield size={16} />
                </div>

                <div className="flex items-center gap-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`
                                    inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap
                                    ${isActive
                                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm shadow-slate-200'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                                    }
                                `}
                            >
                                <Icon size={12} className={isActive ? item.color : ''} />
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminRoleNavigation;
