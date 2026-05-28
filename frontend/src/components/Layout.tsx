import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import logoUrl from '../assets/images/FENTONS-Logo.png';
import {
    LayoutDashboard,
    PlusCircle,
    List,
    CheckCircle,
    Truck,
    LogOut,
    Menu,
    X,
    User,
    Users,
    Settings,
    Building,
    ChevronRight,
    ChevronDown,
    MapPin,
    Clock,
    Bell,
    GitMerge,
    DollarSign,
    Link2,
    FileText
} from 'lucide-react';
import { Role } from '../types';
import AdminRoleNavigation from './admin/AdminRoleNavigation';
import NotificationBell from './common/NotificationBell';
import { getNewRequestPath } from '../utils/systemSelection';

interface LayoutProps {
    userRole?: Role;
}

const Layout: React.FC<LayoutProps> = ({ userRole }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const location = useLocation();
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        logout();
    };

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const currentRole = (user?.role || userRole || '').toUpperCase();
    const newRequestPath = getNewRequestPath();

    const navItems = [
        {
            label: 'Dashboard',
            path: '/dashboard',
            icon: <LayoutDashboard size={16} />,
            roles: ['STAFF', 'COORDINATOR', 'HOD', 'TRANSPORT', 'ADMIN', 'DRIVER', 'MCU_USER', 'CALL_CENTER', 'WAREHOUSE']
        },
        {
            label: 'Vendor Companies',
            path: '/transport/vendors',
            icon: <Building size={16} />,
            roles: ['TRANSPORT', 'ADMIN']
        },
        {
            label: 'Route Mapping & Merge',
            path: '/coordinator/optimization',
            icon: <GitMerge size={16} />,
            roles: ['COORDINATOR']
        },
        {
            label: 'Route Optimization',
            path: '/transport/route-optimization',
            icon: <GitMerge size={16} />,
            roles: ['TRANSPORT']
        },
        {
            label: 'All Requests',
            path: '/coordinator/all-requests',
            icon: <List size={16} />,
            roles: ['COORDINATOR']
        },
        {
            label: 'Recent History',
            path: '/driver/history',
            icon: <Clock size={16} />,
            roles: ['DRIVER']
        },
        {
            label: 'New Request',
            path: newRequestPath,
            icon: <PlusCircle size={16} />,
            roles: ['STAFF', 'COORDINATOR', 'HOD', 'TRANSPORT', 'ADMIN', 'MCU_USER', 'CALL_CENTER', 'WAREHOUSE']
        },
        {
            label: 'My Requests',
            path: '/my-requests',
            icon: <List size={16} />,
            roles: ['STAFF', 'HOD', 'COORDINATOR', 'TRANSPORT', 'ADMIN', 'MCU_USER', 'CALL_CENTER', 'WAREHOUSE']
        },
        {
            label: 'Approvals',
            path: '/hod/approvals',
            icon: <CheckCircle size={16} />,
            roles: ['HOD']
        },
        {
            label: 'User Management',
            path: '/admin/users',
            icon: <Users size={16} />,
            roles: ['ADMIN']
        },
        {
            label: 'Vehicles',
            path: '/admin/vehicles',
            icon: <Truck size={16} />,
            roles: ['ADMIN']
        },
        {
            label: 'Register Vehicle',
            path: '/admin/vehicles/new',
            icon: <PlusCircle size={16} />,
            roles: ['ADMIN']
        },
        {
            label: 'Register Driver',
            path: '/admin/driver-register',
            icon: <User size={16} />,
            roles: ['ADMIN']
        },
        {
            label: 'Driver KM Trip Entry',
            path: '/admin/trip-entry',
            icon: <MapPin size={16} />,
            roles: ['ADMIN']
        },
        {
            label: 'Transport Billing History',
            path: '/admin/transport-billing',
            icon: <DollarSign size={16} />,
            roles: ['ADMIN', 'TRANSPORT']
        },
        {
            label: 'Categories',
            path: '/admin/vehicle-categories',
            icon: <List size={16} />,
            roles: ['ADMIN']
        },
        {
            label: 'Divisions',
            path: '/admin/divisions',
            icon: <Building size={16} />,
            roles: ['ADMIN']
        },
        {
            label: 'Pricing & Packages',
            path: '/admin/packages',
            icon: <DollarSign size={16} />,
            roles: ['ADMIN', 'TRANSPORT']
        },
        {
            label: 'Package Assignment',
            path: '/admin/vehicle-assignments',
            icon: <Link2 size={16} />,
            roles: ['ADMIN', 'TRANSPORT']
        },
        {
            label: 'System Settings',
            path: '/admin/system-config',
            icon: <Settings size={16} />,
            roles: ['ADMIN']
        },
    ];

    const filteredNavItems = navItems.filter(item =>
        currentRole && item.roles.includes(currentRole)
    );

    // Check if current user is STAFF (hide sidebar for STAFF users)
    const isStaffUser = currentRole === 'STAFF';

    useEffect(() => {
        setIsSidebarOpen(false);
        setIsProfileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (isStaffUser) {
            return;
        }

        const className = 'overflow-hidden';

        if (isSidebarOpen) {
            document.body.classList.add(className);
        } else {
            document.body.classList.remove(className);
        }

        return () => {
            document.body.classList.remove(className);
        };
    }, [isSidebarOpen, isStaffUser]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!profileMenuRef.current) return;
            if (!profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const staffQuickLinks = [
        {
            label: 'Dashboard',
            description: 'Overview and recent activity',
            path: '/dashboard',
            icon: <LayoutDashboard size={15} />,
        },
        {
            label: 'New Request',
            description: 'Start a new request',
            path: newRequestPath,
            icon: <PlusCircle size={15} />,
        },
        {
            label: 'My Requests',
            description: 'Track, edit, and manage requests',
            path: '/my-requests',
            icon: <List size={15} />,
        },
        {
            label: 'Notifications',
            description: 'View alerts and updates',
            path: '/notifications',
            icon: <Bell size={15} />,
        },
    ];

    return (
        <div className={`flex min-h-screen bg-slate-50 font-sans text-slate-800 ${!isStaffUser ? 'lg:gap-5' : ''}`}>
            {/* Sidebar - Hidden for STAFF users */}
            {!isStaffUser && (
                <>
                    <button
                        type="button"
                        aria-label="Close navigation menu"
                        onClick={() => setIsSidebarOpen(false)}
                        className={`fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    />

                    <aside
                        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:sticky lg:top-0 lg:h-screen lg:max-w-none lg:shrink-0 lg:self-start lg:translate-x-0`}
                    >
                        {/* Logo/Brand */}
                        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <img
                                    src={logoUrl}
                                    alt="Hayleys Fentons"
                                    className="h-10 w-auto"
                                />
                            </div>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors lg:hidden"
                                aria-label="Close sidebar"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                            {filteredNavItems.map((item, index) => (
                                <NavLink
                                    key={index}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={({ isActive }) => `
                                flex items-center justify-between px-3 py-3 rounded-md transition-all duration-150 group relative
                                ${isActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                        }
                            `}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="shrink-0">
                                            {item.icon}
                                        </span>
                                        <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                                    </div>
                                    <ChevronRight size={14} className="opacity-60 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" />
                                </NavLink>
                            ))}
                        </nav>

                        {/* User Profile & Logout */}
                        <div className="border-t border-slate-800 bg-slate-900">
                            <div className="px-3 py-3">
                                <div className="flex items-center gap-3 px-3 py-3 rounded-md bg-slate-800/50 mb-2">
                                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shrink-0">
                                        <User size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{user?.name || 'User'}</p>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{currentRole || 'Guest'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 w-full px-3 py-3 text-sm font-semibold text-slate-300 rounded-md hover:bg-red-600 hover:text-white transition-all"
                                >
                                    <LogOut size={16} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </aside>
                </>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar */}
                <header className="min-h-16 bg-white shadow-sm border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
                    {!isStaffUser && (
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden inline-flex h-11 w-11 items-center justify-center text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                            aria-label="Open sidebar"
                        >
                            <Menu size={22} />
                        </button>
                    )}

                    {/* STAFF users get a simplified header with just the logo/title */}
                    {isStaffUser && (
                        <div className="flex items-center gap-3">
                            <img
                                src={logoUrl}
                                alt="Hayleys Fentons"
                                className="h-8 w-auto"
                            />
                            <div className="hidden sm:block">
                                <h1 className="text-lg font-bold text-slate-900">Transport Management System</h1>
                                <p className="text-xs text-slate-500">Vehicle Request Portal</p>
                            </div>
                        </div>
                    )}

                    <div className={`flex ${isStaffUser ? '' : 'flex-1'} ${!isStaffUser ? 'justify-end' : ''} items-center`}>
                        <div className="flex items-center gap-4">
                            <NotificationBell />
                            {/* User Profile */}
                            <div ref={profileMenuRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsProfileMenuOpen(prev => !prev)}
                                    className="flex items-center gap-3 pl-1 pr-3 py-1.5 rounded-full border border-slate-100 bg-white shadow-sm hover:shadow hover:border-slate-200 transition-all cursor-pointer group"
                                    aria-haspopup="menu"
                                    aria-expanded={isProfileMenuOpen}
                                >
                                    <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-sm ring-2 ring-white">
                                        <span className="text-xs font-bold tracking-tight">
                                            {(user?.name || 'U').charAt(0)}
                                        </span>
                                    </div>
                                    <div className="hidden sm:flex sm:flex-col sm:items-start">
                                        <span className="text-[13px] font-semibold text-slate-700 leading-none group-hover:text-slate-900 transition-colors">
                                            {user?.name || 'User Profile'}
                                        </span>
                                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                                            {currentRole || 'Guest'}
                                        </span>
                                    </div>
                                    <ChevronDown size={14} className={`text-slate-300 group-hover:text-slate-500 transition-all ml-1 hidden sm:block ${isProfileMenuOpen ? 'rotate-180 text-slate-500' : ''}`} />
                                </button>

                                {isStaffUser && isProfileMenuOpen && (
                                    <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
                                        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                                            <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'User Profile'}</p>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-1">Staff Member</p>
                                        </div>
                                        <div className="p-2">
                                            {staffQuickLinks.map((item) => (
                                                <NavLink
                                                    key={item.path}
                                                    to={item.path}
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                    className={({ isActive }) => `mb-1 flex items-start gap-3 rounded-xl px-3 py-3 transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                                                >
                                                    <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                                        {item.icon}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-sm font-semibold">{item.label}</span>
                                                        <span className="mt-0.5 block text-xs text-slate-400">{item.description}</span>
                                                    </span>
                                                </NavLink>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                                            >
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                                                    <LogOut size={15} />
                                                </span>
                                                <span>Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="stable-scrollbar-gutter flex-1 overflow-x-hidden overflow-y-scroll bg-slate-50 flex flex-col">
                    {/* {currentRole === 'ADMIN' && <AdminRoleNavigation />} */}
                    <div className="flex-1">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
