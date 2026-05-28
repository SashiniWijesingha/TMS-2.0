import { useNavigate } from 'react-router-dom';
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { User, Zap, Star, ArrowRight } from 'lucide-react';
import { RequestType } from '../types';
import passengerTransportBg from '../assets/images/passenger_transport_bg.png';

const PassengerRequestSelection = () => {
    const navigate = useNavigate();
    
    // Remove page scrollbar while on this full-bleed selection page to give
    // an immersive, app-like feel. Restore on unmount.
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, []);

    const handleSelect = (subType: string, title?: string) => {
        navigate('/service-selection', {
            state: {
                type: RequestType.PASSENGER,
                subType: subType,
                title: title
            }
        });
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const cardVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 120, damping: 20 }
        },
        hover: {
            scale: 1.02,
            transition: { type: "spring", stiffness: 400, damping: 25 }
        }
    };

    return (
        <div className="relative min-h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center p-6 overflow-hidden bg-[#f7f9fc]">
            {/* Background image + overlays */}
            <div className="absolute inset-0 pointer-events-none">
                <img
                    src={passengerTransportBg}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover object-center scale-105 opacity-18"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18),transparent_34%),linear-gradient(135deg,rgba(247,249,252,0.96),rgba(239,246,255,0.88))]" />
                <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:72px_72px]" />
                <div className="absolute top-[-8%] left-[-8%] w-[34%] h-[34%] bg-[#dbeafe]/70 rounded-full blur-3xl" />
                <div className="absolute bottom-[-12%] right-[-10%] w-[42%] h-[42%] bg-[#e2e8f0]/65 rounded-full blur-3xl" />
            </div>

            <motion.div
                className="relative z-10 w-full max-w-7xl min-h-[calc(100vh-144px)] flex flex-col justify-center space-y-10 px-3 sm:px-4 mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="text-center space-y-4 max-w-3xl mx-auto">
                    <motion.button
                        onClick={() => navigate('/passenger-selection')}
                        className="mb-8 inline-flex items-center gap-2 mx-auto rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 shadow-sm backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white hover:text-slate-900 group"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <ArrowRight className="rotate-180 transform group-hover:-translate-x-1 transition-transform" size={14} /> 
                        BACK TO CATEGORIES
                    </motion.button>

                    <motion.h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                        PASSENGER <span className="text-slate-700">PROTOCOLS</span>
                    </motion.h1>
                    <motion.p className="text-base text-slate-600 font-medium max-w-2xl mx-auto">
                        Choose the service profile that best fits your transport needs.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 px-0 sm:px-1">
                    {[
                        {
                            id: 'NORMAL',
                            title: 'STANDARD',
                            subTitle: 'Normal Transit',
                            description: 'Standard operational transport for official duties and site coordination.',
                            icon: User,
                            gradient: 'from-[#FF5F1F] to-[#FF8C00]',
                            bg: 'bg-orange-50',
                            text: 'text-[#FF5F1F]'
                        },
                        {
                            id: 'ADHOC',
                            title: 'AD-HOC',
                            subTitle: 'Urgent Transit',
                            description: 'Urgent or immediate requests, including after-hours trips.',
                            icon: Zap,
                            gradient: 'from-[#E34A00] to-[#FF5F1F]',
                            bg: 'bg-red-50',
                            text: 'text-[#E34A00]'
                        },
                        {
                            id: 'SPECIAL',
                            title: 'SPECIAL',
                            subTitle: 'VIP / Specialized',
                            description: 'High-profile transit for VIP guests.',
                            icon: Star,
                            gradient: 'from-[#C48E00] to-[#FFB800]',
                            bg: 'bg-amber-50',
                            text: 'text-[#C48E00]'
                        }
                    ].map((type) => (
                        <motion.div
                            key={type.id}
                            variants={cardVariants}
                            whileHover="hover"
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelect(type.id, type.subTitle)}
                            className="cursor-pointer group relative bg-white rounded-2xl p-1 shadow-lg border border-slate-100 h-full w-full flex flex-col hover:shadow-xl transition-shadow duration-300"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${type.gradient} rounded-2xl opacity-0 group-hover:opacity-90 transition-all duration-400 blur-2xl`} />

                            <div className="relative h-full min-h-[220px] bg-white rounded-xl p-4 sm:p-5 flex flex-col items-start overflow-hidden border border-slate-100 flex-1">
                                <div className="absolute top-0 right-0 p-6 opacity-10 scale-125 transform translate-x-6 -translate-y-6 group-hover:scale-125 transition-transform duration-700 text-slate-900">
                                    <type.icon size={92} />
                                </div>

                                <div className={`mb-4 w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-700 group-hover:scale-105 group-hover:bg-gradient-to-br ${type.gradient} group-hover:text-white transition-all duration-400 shadow-sm border border-slate-100`}>
                                    <type.icon size={22} strokeWidth={2.2} />
                                </div>

                                <div className="space-y-1.5 relative z-10 w-full flex-1">
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${type.text} mb-0.5 opacity-85`}>{type.title}</span>
                                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug tracking-tight">
                                            {type.subTitle}
                                        </h2>
                                    </div>
                                    <p className="text-slate-500 font-medium leading-relaxed text-xs sm:text-sm">
                                        {type.description}
                                    </p>
                                </div>

                                <div className="mt-4 pt-4 w-full flex items-center justify-between border-t border-slate-100 group-hover:border-slate-200 transition-colors">
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.18em] group-hover:text-slate-900 transition-colors">Select</span>
                                    <div className={`w-9 h-9 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-gradient-to-br ${type.gradient} group-hover:text-white transition-all duration-400`}>
                                        <ArrowRight size={16} className="transform group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default PassengerRequestSelection;
