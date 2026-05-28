import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { ArrowLeft, ChevronRight, Briefcase, Search, ShoppingBag, Globe, MessageSquare, FileText } from 'lucide-react';
import { RequestType } from '../types';
import serviceBackground from '../assets/images/transport_service_bg.png';

const ServiceCategorySelection = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Retrieve previous selection (NORMAL, ADHOC, SPECIAL)
    const requestSubType = location.state?.subType || 'NORMAL';
    const requestSubTypeTitle = location.state?.title || 'Passenger Request';

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.03,
                delayChildren: 0.05
            }
        }
    };

    const cardVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 120,
                damping: 20
            }
        },
        hover: {
            y: -10,
            scale: 1.06,
            boxShadow: "0 28px 60px -14px rgba(15, 23, 42, 0.28), 0 18px 32px -18px rgba(255, 95, 31, 0.35)",
            transition: { type: "spring", stiffness: 400, damping: 25 }
        }
    };

    const handleSelect = (category: string, title?: string) => {
        navigate('/create-request', {
            state: {
                type: RequestType.PASSENGER,
                subType: requestSubType,
                subTypeTitle: requestSubTypeTitle,
                serviceCategory: category,
                serviceCategoryTitle: title
            }
        });
    };

    const categories = [
        { id: 'PROJECT_SERVICE', title: 'Project Service', icon: Briefcase, color: 'text-[#FF5F1F]', bg: 'bg-orange-50' },
        { id: 'PROSPECTIVE', title: 'Prospective', icon: Search, color: 'text-[#E34A00]', bg: 'bg-red-50' },
        { id: 'SALES_PROMOTIONS', title: 'Sales Promotions', icon: ShoppingBag, color: 'text-[#C48E00]', bg: 'bg-amber-50' },
        { id: 'GENERAL_PURPOSE', title: 'General Purpose', icon: Globe, color: 'text-[#7C3AED]', bg: 'bg-purple-50' },
        { id: 'AFTER_SALES', title: 'After Sales', icon: MessageSquare, color: 'text-[#0EA5E9]', bg: 'bg-sky-50' },
        { id: 'TENDER_SUMMATION', title: 'Tender Summation', icon: FileText, color: 'text-[#64748B]', bg: 'bg-slate-100' },
    ];

    return (
        <div
            className="relative h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center px-4 py-3 sm:px-8 sm:py-5 overflow-hidden bg-slate-50"
            style={{
                backgroundImage: `linear-gradient(135deg, rgba(247, 248, 250, 0.9), rgba(238, 242, 247, 0.84)), url(${serviceBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {/* Ambient Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-18%] right-[-8%] w-[42%] h-[42%] bg-[#FF5F1F]/12 rounded-full blur-3xl opacity-55" />
                <div className="absolute bottom-[-14%] left-[-10%] w-[36%] h-[36%] bg-[#FF8C00]/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-slate-100/55" />
            </div>

            <motion.div
                className="relative z-10 w-full max-w-6xl space-y-4 sm:space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="text-center space-y-2 sm:space-y-3">
                    <motion.div
                        className="mb-2 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.22em] uppercase text-slate-600"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <button
                            onClick={() => navigate('/passenger-selection')}
                            className="flex items-center gap-1.5 text-slate-600 hover:text-[#FF5F1F] transition-all group"
                        >
                            <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                            BACK
                        </button>
                        <span className="text-slate-400">/</span>
                        <nav className="hidden sm:flex items-center gap-2 text-slate-600">
                            <span className="hover:text-[#FF5F1F] cursor-pointer transition-colors text-[9px]" onClick={() => navigate('/passenger-selection')}>PASSENGER</span>
                            <ChevronRight size={10} className="text-slate-300" />
                            <span className="text-slate-900 border-b-2 border-[#FF5F1F] pb-0.5 text-[9px]">CATEGORY</span>
                            
                            {requestSubType && requestSubType !== 'NORMAL' && (
                                <>
                                    <ChevronRight size={10} className="text-slate-300" />
                                    <span className="text-[#FF5F1F] px-1.5 py-0.5 bg-orange-50 rounded text-[9px] border border-orange-100">{requestSubTypeTitle}</span>
                                </>
                            )}
                        </nav>
                    </motion.div>

                    <motion.h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                        SERVICE <span className="text-[#FF5F1F]">CLASSIFICATION</span>
                    </motion.h1>
                    <motion.p className="text-sm sm:text-base text-slate-700 font-medium max-w-2xl mx-auto">
                        Select the service category for your transport requirement
                    </motion.p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 px-1 sm:px-0 max-h-[calc(100vh-260px)] sm:max-h-[calc(100vh-230px)]">
                    {categories.map((cat) => (
                        <motion.button
                            key={cat.id}
                            variants={cardVariants}
                            whileHover="hover"
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleSelect(cat.id, cat.title)}
                            className="text-left bg-white/92 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-[0_18px_45px_-18px_rgba(15,23,42,0.35)] ring-1 ring-white/80 border border-slate-100/80 hover:border-[#FF5F1F]/30 flex flex-col items-start gap-3 relative overflow-hidden group transition-all hover:bg-white"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF5F1F] via-[#FFB38A] to-[#FF5F1F] opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className={`p-3 rounded-xl ${cat.bg} ${cat.color} group-hover:bg-[#FF5F1F] group-hover:text-white transition-all duration-300 shadow-md border border-black/5 z-10`}>
                                <cat.icon size={24} strokeWidth={2} />
                            </div>

                            <div className="space-y-1 z-10 flex-1 min-h-0">
                                <h3 className="font-bold text-slate-900 text-sm sm:text-[15px] leading-snug tracking-tight group-hover:text-[#FF5F1F] transition-colors">
                                    {cat.title}
                                </h3>
                            </div>

                            <div className="z-10 w-full pt-2.5 flex items-center justify-between border-t border-slate-100 group-hover:border-[#FF5F1F]/20 transition-all">
                                <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-[#FF5F1F] transition-colors">SELECT</span>
                                <ChevronRight size={15} className="text-slate-400 group-hover:text-[#FF5F1F] group-hover:translate-x-1 transition-all" />
                            </div>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default ServiceCategorySelection;
