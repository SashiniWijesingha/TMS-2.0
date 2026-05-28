import React, { useEffect, useState } from 'react';
import { login, verifyOtpAndSetup } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock3, KeyRound, Lock, Mail, UsersRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoUrl from '../assets/images/FENTONS-Logo.png';
import roadBg from '../assets/images/road_bg.png';
import passengerBg from '../assets/images/passenger_transport_bg.png';
import { setStoredSystemSelection } from '../utils/systemSelection';

const HUMAN_TRANSPORT_BG = passengerBg;
const ROLE_REDIRECTS: Record<string, string> = {
    STAFF: '/new-request',
    COORDINATOR: '/coordinator/requests',
    HOD: '/hod/approvals',
    TRANSPORT: '/dashboard',
};

const getApiMessage = (err: unknown): string | undefined => {
    if (typeof err !== 'object' || err === null || !('response' in err)) {
        return undefined;
    }

    const response = (err as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    return typeof message === 'string' ? message : undefined;
};

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // OTP Setup State
    const [step, setStep] = useState<'LOGIN' | 'OTP'>('LOGIN');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [backgroundSrc, setBackgroundSrc] = useState(HUMAN_TRANSPORT_BG);
    useEffect(() => {
        setStoredSystemSelection('PASSENGER');
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            if (step === 'LOGIN') {
                const data = await login(email, password);

                if (data.status === 'REQUIRE_FIRST_TIME_SETUP') {
                    setStep('OTP');
                    setSuccessMsg(data.message || 'Check your email for the OTP.');
                    return;
                }

                navigate(ROLE_REDIRECTS[data.role] || '/dashboard');
            } else {
                const data = await verifyOtpAndSetup(email, otp, newPassword);
                navigate(ROLE_REDIRECTS[data.role] || '/dashboard');
            }
        } catch (err: unknown) {
            console.error(err);
            const apiMessage = getApiMessage(err);
            setError(step === 'OTP'
                ? (apiMessage || 'Invalid OTP. Please try again.')
                : (apiMessage || 'Account verification failed. Please check your credentials.'));
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="relative min-h-[100dvh] overflow-hidden bg-[#eaf0f8] text-slate-900">
            <div className="pointer-events-none absolute inset-0">
                <img
                    src={backgroundSrc}
                    alt="Driver and passenger transportation background"
                    className="h-full w-full object-cover opacity-52"
                    onError={() => setBackgroundSrc(roadBg)}
                />
                <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(225,235,248,0.88)_6%,rgba(200,215,235,0.8)_46%,rgba(12,24,48,0.65)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(680px_320px_at_16%_14%,rgba(244,124,32,0.16),transparent_72%),radial-gradient(760px_340px_at_82%_80%,rgba(14,122,75,0.13),transparent_72%)]" />
            </div>

            <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute left-5 top-5 z-40 sm:left-8 sm:top-8"
            >
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300/85 bg-white/85 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm backdrop-blur-md transition hover:border-[#F47C20]/55 hover:text-[#0f1f39]"
                >
                    <ArrowLeft size={16} className="text-slate-500" />
                    Back
                </Link>
            </motion.div>

            <main className="relative z-20 mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col justify-center gap-10 px-5 py-24 sm:px-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-10 lg:py-12">
                <motion.section
                    className="max-w-xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/85 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-700 shadow-sm">
                        <UsersRound size={13} className="text-[#f47c20]" />
                        Human Transport Access
                    </div>

                    <h1 className="text-4xl font-extrabold uppercase leading-tight tracking-tight text-[#142845] sm:text-5xl lg:text-6xl">
                        Passenger Transport
                        <span className="mt-2 block text-2xl font-bold tracking-normal text-[#F47C20] sm:text-3xl lg:mt-3 lg:text-4xl">
                            Login Portal
                        </span>
                    </h1>

                    <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-700">
                        Access Passenger Transport
                    </p>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, delay: 0.1 }}
                    className="w-full"
                >
                    <div className="mx-auto w-full max-w-[450px] rounded-[26px] border border-white/90 bg-white/95 p-7 shadow-[0_22px_55px_rgba(15,31,57,0.28)] backdrop-blur-md sm:p-9">
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="space-y-6"
                        >
                            <div className="text-center">
                                <motion.div
                                    className="mb-5 flex justify-center"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                >
                                    <img src={logoUrl} alt="Hayleys Fentons" className="h-11 w-auto opacity-90" />
                                </motion.div>

                                <motion.div variants={itemVariants} className="mb-4">
                                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        {step === 'LOGIN' ? 'Step 1 of 2' : 'Step 2 of 2'}
                                    </span>
                                </motion.div>

                                <motion.div variants={itemVariants}>
                                    <h2 className="mb-2 text-[1.55rem] font-extrabold uppercase tracking-tight text-[#0d1b33]">
                                        {step === 'LOGIN' ? 'Welcome Back' : 'Account Verification'}
                                    </h2>
                                    <p className="text-sm font-medium text-slate-500">
                                        {step === 'LOGIN'
                                            ? 'Use your credentials to access passenger transport services.'
                                            : 'Enter the OTP sent to your email and set a new password.'}
                                    </p>
                                </motion.div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                            <AnimatePresence mode="wait">
                                {successMsg && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="flex items-center gap-3 rounded-xl border border-[#0E7A4B]/20 bg-[#0E7A4B]/8 p-3.5"
                                    >
                                        <div className="h-1.5 w-1.5 rounded-full bg-[#0E7A4B] animate-pulse"></div>
                                        <p className="text-xs font-semibold text-[#0E7A4B]">{successMsg}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-4">
                                {step === 'LOGIN' ? (
                                    <>
                                        <motion.div variants={itemVariants} className="space-y-2 group">
                                            <label className="ml-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition-colors group-focus-within:text-[#F47C20]">
                                                Email Address
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 transition-all group-focus-within:text-[#F47C20]" />
                                                <input
                                                    type="email"
                                                    required
                                                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-[#0d1b33] placeholder:text-slate-300 transition-all hover:border-slate-300 focus:border-[#F47C20] focus:outline-none focus:ring-4 focus:ring-[#F47C20]/10"
                                                    placeholder="user@hayleysfentons.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                />
                                            </div>
                                        </motion.div>

                                        <motion.div variants={itemVariants} className="space-y-2 group">
                                            <div className="flex justify-between items-center ml-1">
                                                <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition-colors group-focus-within:text-[#F47C20]">
                                                    Password
                                                </label>
                                                <Link to="/forgot-password" title="Reset your password" className="text-[10px] font-bold uppercase tracking-wider text-[#F47C20] underline-offset-4 transition-all hover:underline">Forgot Password?</Link>
                                            </div>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 transition-all group-focus-within:text-[#F47C20]" />
                                                <input
                                                    type="password"
                                                    required
                                                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-[#0d1b33] placeholder:text-slate-300 transition-all hover:border-slate-300 focus:border-[#F47C20] focus:outline-none focus:ring-4 focus:ring-[#F47C20]/10"
                                                    placeholder="••••••••••••"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                />
                                            </div>
                                        </motion.div>
                                    </>
                                ) : (
                                    <>
                                        <motion.div variants={itemVariants} className="space-y-4">
                                            <div className="space-y-2 group">
                                                <label className="ml-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 group-focus-within:text-[#F47C20]">
                                                    Verification Code
                                                </label>
                                                <div className="relative">
                                                    <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 transition-all group-focus-within:text-[#F47C20]" />
                                                    <input
                                                        type="text"
                                                        required
                                                        maxLength={6}
                                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/55 py-3 pl-11 pr-4 text-center text-lg font-bold tracking-[0.4em] transition-all focus:border-[#F47C20] focus:bg-white focus:outline-none"
                                                        placeholder="000000"
                                                        value={otp}
                                                        onChange={(e) => setOtp(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2 group">
                                                <label className="ml-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 group-focus-within:text-[#F47C20]">
                                                    New Password
                                                </label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 transition-all group-focus-within:text-[#F47C20]" />
                                                    <input
                                                        type="password"
                                                        required
                                                        minLength={12}
                                                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold transition-all focus:border-[#F47C20] focus:outline-none focus:ring-4 focus:ring-[#F47C20]/10"
                                                        placeholder="Enter new password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setStep('LOGIN'); setSuccessMsg(''); setError(''); }}
                                                className="flex items-center gap-1.5 pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-[#F47C20]"
                                            >
                                                &larr; Use Different Email
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 rounded-xl bg-orange-50 border border-orange-100 flex items-center gap-3"
                                >
                                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0"></div>
                                    <p className="text-[11px] text-orange-800 font-semibold">{error}</p>
                                </motion.div>
                            )}

                            <motion.button
                                variants={itemVariants}
                                type="submit"
                                disabled={loading}
                                className="group relative w-full rounded-xl bg-[#F47C20] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:brightness-110 hover:shadow-orange-500/30 active:scale-[0.985] disabled:opacity-70"
                            >
                                <div className="flex items-center justify-center gap-3">
                                    {loading ? (
                                        <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="uppercase tracking-[0.15em]">{step === 'LOGIN' ? 'Sign In' : 'Complete Setup'}</span>
                                        </>
                                    )}
                                </div>
                            </motion.button>

                                <motion.div variants={itemVariants} className="flex flex-col items-center gap-3 pt-2">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                        <Clock3 size={11} className="text-[#0E7A4B]" />
                                        Passenger Transport Access
                                    </div>
                                    <p className="max-w-[240px] text-center text-[10px] font-semibold leading-relaxed tracking-tight text-slate-400">
                                        &copy; 2026 Hayleys Fentons.
                                    </p>
                                </motion.div>
                            </form>
                        </motion.div>
                    </div>
                </motion.section>
            </main>
        </div>
    );
};

export default LoginPage;
