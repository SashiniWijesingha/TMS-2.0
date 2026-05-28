import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Truck,
    Users,
    FileText,
    ChevronLeft,
    Shield,
    PlusCircle,
    DollarSign
} from 'lucide-react';

const AdminCard = ({ title, description, icon, color, actions }: any) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full"
    >
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
            {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6 flex-1">{description}</p>

        <div className="space-y-2">
            {actions.map((action: any, idx: number) => (
                <button
                    key={idx}
                    onClick={action.onClick}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors group"
                >
                    <span>{action.label}</span>
                    <PlusCircle size={16} className="text-slate-400 group-hover:text-slate-600" />
                </button>
            ))}
        </div>
    </motion.div>
);

const TransportAdminPanel = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <button onClick={() => navigate('/dashboard')} className="hover:text-slate-800 flex items-center gap-1">
                            <ChevronLeft size={14} /> Back to Dashboard
                        </button>
                        <span>/</span>
                        <span className="font-semibold text-slate-800">Admin Panel</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Shield className="text-indigo-600" size={32} />
                        Transport Administration
                    </h1>
                    <p className="text-slate-500 mt-1">Manage fleet assets, drivers, and system configurations.</p>
                </div>
            </div>

            {/* Admin Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Vehicle Management */}
                <AdminCard
                    title="Vehicle Management"
                    description="Register new vehicles, manage fleet availability, and schedule maintenance."
                    icon={<Truck size={24} className="text-blue-600" />}
                    color="bg-blue-50"
                    actions={[
                        { label: 'Register New Vehicle', onClick: () => navigate('/admin/vehicles/new') },
                        { label: 'View Fleet List', onClick: () => navigate('/admin/vehicles') },
                        { label: 'Maintenance Schedule', onClick: () => console.log('Maintenance') }
                    ]}
                />

                {/* Driver Management */}
                <AdminCard
                    title="Driver Management"
                    description="Onboard new drivers, manage assignments, and update contact details."
                    icon={<Users size={24} className="text-emerald-600" />}
                    color="bg-emerald-50"
                    actions={[
                        { label: 'Add New Driver', onClick: () => navigate('/admin/users') },
                        { label: 'View All Drivers', onClick: () => navigate('/admin/users') },
                        { label: 'Duty Roster', onClick: () => console.log('Roster') }
                    ]}
                />

                {/* Reports & Analytics */}
                <AdminCard
                    title="Reports & Analytics"
                    description="Generate usage reports, fuel consumption analysis, and driver performance stats."
                    icon={<FileText size={24} className="text-purple-600" />}
                    color="bg-purple-50"
                    actions={[
                        { label: 'Trip Reports', onClick: () => console.log('Trips') },
                        { label: 'Fuel Analysis', onClick: () => console.log('Fuel') },
                        { label: 'Utilization Stats', onClick: () => console.log('Stats') }
                    ]}
                />

                {/* Pricing & Packages */}
                <AdminCard
                    title="Pricing & Packages"
                    description="Configure vehicle transport packages, KM limits, fuel rate indexes, and driver KM rate cards."
                    icon={<DollarSign size={24} className="text-amber-600" />}
                    color="bg-amber-50"
                    actions={[
                        { label: 'Manage Packages & Fuel', onClick: () => navigate('/admin/packages') },
                        { label: 'View Setup Dashboard', onClick: () => navigate('/admin/packages') },
                    ]}
                />
            </div>

            {/* Quick Stats Section */}
            <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h3 className="text-xl font-bold mb-2">System Status</h3>
                        <p className="text-slate-400">All systems operational. Last sync: Just now.</p>
                    </div>
                    <div className="flex gap-8 text-center">
                        <div>
                            <p className="text-3xl font-bold text-indigo-400">15</p>
                            <p className="text-sm text-slate-400">Total Vehicles</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-emerald-400">12</p>
                            <p className="text-sm text-slate-400">Active Drivers</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-amber-400">3</p>
                            <p className="text-sm text-slate-400">Maintenance</p>
                        </div>
                    </div>
                </div>

                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>
            </div>
        </div>
    );
};

export default TransportAdminPanel;
