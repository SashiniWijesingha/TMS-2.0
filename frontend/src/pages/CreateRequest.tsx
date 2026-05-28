import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Package, ArrowLeft, ChevronRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import PassengerForm from './forms/PassengerForm';
import MaterialForm from './forms/MaterialForm';
import { RequestType } from '../types';
import api from '../services/api';

const CATEGORY_LABELS: Record<string, string> = {
    PROJECT_SERVICE: 'Project Service',
    PROSPECTIVE: 'Prospective',
    SALES_PROMOTIONS: 'Sales Promotions',
    GENERAL_PURPOSE: 'General Purpose',
    AFTER_SALES: 'After Sales',
    TENDER_SUMMATION: 'Tender Summation',
};

const CATEGORY_DOT_COLORS: Record<string, string> = {
    PROJECT_SERVICE: 'bg-[#FF5F1F]',
    PROSPECTIVE: 'bg-orange-600',
    SALES_PROMOTIONS: 'bg-amber-500',
    GENERAL_PURPOSE: 'bg-purple-500',
    AFTER_SALES: 'bg-sky-500',
    TENDER_SUMMATION: 'bg-slate-400',
};

const SUBTYPE_LABELS: Record<string, string> = {
    NORMAL: 'Standard',
    ADHOC: 'Ad-Hoc',
    SPECIAL: 'Special',
};

const CreateRequest = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const selectedType = location.state?.type as RequestType | null;
    const materialRedirectTriggered = useRef(false);

    useEffect(() => {
        if (!selectedType) {
            navigate('/passenger-selection', { replace: true });
        }
    }, [selectedType, navigate]);

    useEffect(() => {
        if (selectedType !== 'MATERIAL' || materialRedirectTriggered.current) return;
        materialRedirectTriggered.current = true;
        const redirectToMaterialService = async () => {
            try {
                const { data } = await api.post('/material-sso/handoff', { returnTo: '/passenger-selection' });
                if (data?.redirectUrl) window.location.href = data.redirectUrl;
            } catch (error) {
                console.error('[MaterialSSO] Redirect failed:', error);
                navigate('/passenger-selection', { replace: true });
            }
        };
        redirectToMaterialService();
    }, [selectedType, navigate]);

    if (!selectedType) return null;

    const subType: string = location.state?.subType || 'NORMAL';
    const subTypeTitle: string = location.state?.subTypeTitle || '';
    const serviceCategory: string = location.state?.serviceCategory || '';
    const serviceCategoryTitle: string = location.state?.serviceCategoryTitle || '';
    const isPassenger = selectedType === 'PASSENGER';
    const categoryLabel = serviceCategoryTitle || CATEGORY_LABELS[serviceCategory] || serviceCategory;
    const subTypeLabel = subTypeTitle || SUBTYPE_LABELS[subType] || subType;

    const handleBack = () => {
        if (isPassenger && serviceCategory) {
            navigate('/service-selection', { state: { type: RequestType.PASSENGER, subType, title: subTypeLabel } });
            return;
        }
        if (isPassenger) { navigate('/passenger-selection'); return; }
        navigate('/passenger-selection');
    };

    return (
        <div className="min-h-screen bg-slate-50/60 font-sans">
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-[10px] font-black tracking-widest uppercase">
                            <button onClick={handleBack} className="flex items-center gap-1.5 text-slate-400 hover:text-[#FF5F1F] transition-all group">
                                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                BACK
                            </button>
                            <span className="text-slate-200">/</span>
                            <nav className="flex items-center gap-3 text-slate-400">
                                <span className="text-slate-900 border-b-2 border-[#FF5F1F] pb-0.5 uppercase">REQUEST</span>
                            </nav>
                        </div>

                        <div className="flex flex-col items-center justify-center text-center gap-4">
                            <div className="flex flex-col items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${isPassenger ? 'bg-gradient-to-br from-[#FF5F1F] to-[#FF8C00]' : 'bg-gradient-to-br from-[#005C2E] to-[#007F41]'}`}>
                                    {isPassenger ? <User size={28} className="text-white" /> : <Package size={28} className="text-white" />}
                                </div>
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                                        {isPassenger ? 'Passenger Transport Booking' : 'Material Transport Booking'}
                                    </h1>
                                    <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                                        {serviceCategory && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black bg-white border border-slate-200 shadow-sm text-slate-600 uppercase tracking-wider">
                                                <span className={`w-2 h-2 rounded-full ${CATEGORY_DOT_COLORS[serviceCategory] || 'bg-slate-400'}`} />
                                                {categoryLabel}
                                            </span>
                                        )}
                                        {subType && (
                                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black bg-orange-50 text-[#FF5F1F] border border-orange-100 shadow-sm uppercase tracking-wider">
                                                {subTypeLabel}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <motion.main
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-7xl mx-auto px-6 py-10 pb-32"
            >
                {isPassenger
                    ? <PassengerForm subType={subType} serviceCategory={serviceCategory} />
                    : <MaterialForm subType={subType} serviceCategory={serviceCategory} />
                }
            </motion.main>
        </div>
    );
};

export default CreateRequest;
