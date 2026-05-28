import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { ArrowRight, Boxes, Route, UserRound } from 'lucide-react';
import logoUrl from '../assets/images/FENTONS-Logo.png';
import roadBackground from '../assets/images/transport_service_bg.png';
import { setStoredSystemSelection } from '../utils/systemSelection';

type LandingCard = {
    key: 'PASSENGER' | 'MATERIAL';
    title: string;
    subtitle: string;
    cta: string;
    icon: React.ReactNode;
    accent: string;
    glow: string;
    enabled: boolean;
    pill?: string;
    onClick: () => void;
};

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.08,
        },
    },
};

const itemVariants: Variants = {
    hidden: { y: 18, opacity: 0 },
    show: {
        y: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 140, damping: 18 },
    },
};

const SystemLanding: React.FC = () => {
    const navigate = useNavigate();

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
        const user = JSON.parse(userStr);
        const role = (user.role || '').toUpperCase();
        const destination = role === 'STAFF' ? '/new-request' : '/dashboard';
        return <Navigate to={destination} replace />;
    }

    const materialLoginUrl = import.meta.env.VITE_MATERIAL_LOGIN_URL || '';
    const isMaterialConfigured = Boolean(materialLoginUrl);

    const handlePassenger = () => {
        setStoredSystemSelection('PASSENGER');
        navigate('/passenger-login');
    };

    const handleMaterial = () => {
        if (!isMaterialConfigured) return;
        setStoredSystemSelection('MATERIAL');
        window.location.href = materialLoginUrl;
    };

    const cards: LandingCard[] = [
        {
            key: 'PASSENGER',
            title: 'Passenger Transport',
            subtitle: 'Employee travel, approvals, pooled routing, and coordination.',
            cta: 'Continue to Passenger System',
            icon: <UserRound size={22} />,
            accent: '#F47C20',
            glow: 'rgba(244,124,32,0.42)',
            enabled: true,
            onClick: handlePassenger,
        },
        {
            key: 'MATERIAL',
            title: 'Material and Logistics',
            subtitle: 'Asset dispatch, freight movement, and logistics workflow control.',
            cta: 'Continue to Material System',
            icon: <Boxes size={22} />,
            accent: '#0E7A4B',
            glow: 'rgba(14,122,75,0.45)',
            enabled: isMaterialConfigured,
            pill: isMaterialConfigured ? undefined : 'Coming Soon',
            onClick: handleMaterial,
        },
    ];

    return (
        <div
            className="relative flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900"
            style={{
                '--brand-navy': '#0A1F44',
                '--brand-green': '#0E7A4B',
                '--brand-orange': '#F47C20',
                '--landing-ink': '#0f172a',
                '--landing-muted': '#475569',
                '--landing-panel': 'rgba(255, 255, 255, 0.7)',
            } as React.CSSProperties}
        >
            <div className="pointer-events-none absolute inset-0 z-0">
                <img
                    src={roadBackground}
                    alt="Transport background"
                    className="h-full w-full object-cover opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/50 to-white/80" />
            </div>

            <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-8">
                <div className="flex items-center gap-5">
                    <img src={logoUrl} alt="Hayleys Fentons" className="h-20 w-auto md:h-24" />
                    <div className="hidden sm:block">
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-slate-800">Transport Systems Gateway</p>
                    </div>
                </div>
                <span className="rounded-full border border-slate-300/80 bg-white/60 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm backdrop-blur-md">
                    Select your system
                </span>
            </header>

            <motion.main
                className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-start gap-8 px-6 pb-8 pt-6 text-center lg:gap-10 lg:px-8 lg:pt-8"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                <motion.section className="max-w-4xl space-y-4" variants={itemVariants}>
                    <h1 className="text-3xl font-extrabold uppercase tracking-[0.05em] leading-tight text-[#0A1F44] sm:text-4xl lg:text-5xl">
                        Transport Management System
                    </h1>
                    <p className="mx-auto max-w-2xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                        Choose your workflow and easily manage staff travel, approvals, and logistics in one place.
                    </p>
                </motion.section>

                <motion.section className="flex w-full flex-col justify-center gap-5 sm:flex-row sm:gap-5 lg:gap-6" variants={containerVariants}>
                    {cards.map((card) => (
                        <motion.button
                            key={card.key}
                            type="button"
                            onClick={card.onClick}
                            disabled={!card.enabled}
                            variants={itemVariants}
                            whileHover={card.enabled ? { y: -7, scale: 1.015 } : undefined}
                            whileTap={card.enabled ? { scale: 0.985 } : undefined}
                            aria-label={card.cta}
                            style={
                                card.enabled
                                    ? {
                                          borderColor: `${card.accent}80`,
                                          boxShadow:
                                              card.key === 'PASSENGER'
                                                  ? '0 24px 90px -30px rgba(244,124,32,0.60)'
                                                  : '0 24px 90px -34px rgba(14,122,75,0.56)',
                                      }
                                    : undefined
                            }
                            className={
                                'group relative w-full sm:w-[372px] overflow-hidden rounded-[2.1rem] border p-5 text-left transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#142845]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white ' +
                                (card.enabled
                                    ? 'cursor-pointer border-white/60 bg-white/70 shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-3xl ring-1 ring-white/50 hover:-translate-y-2 hover:border-white hover:bg-white/90 hover:shadow-[0_24px_48px_rgba(0,0,0,0.12)]'
                                    : 'cursor-not-allowed border-white/40 bg-white/40 opacity-70 backdrop-blur-md')
                            }
                        >
                            <div
                                className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full blur-3xl"
                                style={{ background: card.glow }}
                            />

                            <div className="relative z-10 flex items-start justify-between gap-5">
                                <div className="min-w-0">
                                    {card.key === 'PASSENGER' && card.enabled ? (
                                        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-orange)]/45 bg-[color:var(--brand-orange)]/10 px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[color:var(--brand-orange)]">
                                            <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--brand-orange)]" />
                                            Click to Enter
                                        </span>
                                    ) : null}
                                    <div
                                        className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[1rem] shadow-sm transition-transform duration-500 group-hover:scale-110"
                                        style={{ 
                                            background: `linear-gradient(135deg, ${card.accent}15 0%, ${card.accent}05 100%)`, 
                                            color: card.accent,
                                            border: `1px solid ${card.accent}20`
                                        }}
                                    >
                                        {card.icon}
                                    </div>

                                    <h2 className="text-xl font-bold tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-[#142845]">
                                        {card.title}
                                    </h2>

                                    <p className="mt-1.5 max-w-[280px] text-[0.82rem] leading-relaxed text-slate-500 transition-colors duration-300 group-hover:text-slate-600">
                                        {card.subtitle}
                                    </p>
                                </div>

                                <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#142845] text-white shadow-md transition-all duration-500 group-hover:-rotate-45 group-hover:scale-110 group-hover:bg-[#F47C20] group-hover:shadow-xl">
                                    <ArrowRight size={18} strokeWidth={2.5} />
                                </div>
                            </div>

                            <div className="relative z-10 mt-6 flex items-center justify-between border-t border-slate-200/60 pt-4">
                                <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-slate-400 transition-colors duration-300 group-hover:text-[#142845]">
                                    {card.cta}
                                </span>
                                {card.pill ? (
                                    <span className="rounded-full border border-amber-400/50 bg-amber-50/80 px-3 py-1 text-[0.55rem] font-bold uppercase tracking-[0.2em] text-amber-700 backdrop-blur-sm">
                                        {card.pill}
                                    </span>
                                ) : null}
                            </div>
                        </motion.button>
                    ))}
                </motion.section>
            </motion.main>
        </div>
    );
};

export default SystemLanding;
