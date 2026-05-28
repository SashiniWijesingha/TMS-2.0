import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset, resetPasswordWithOtp } from '../services/authService';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState<'REQUEST' | 'OTP' | 'SUCCESS'>('REQUEST');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await requestPasswordReset(email);
            setStep('OTP');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send reset link.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await resetPasswordWithOtp(email, otp, newPassword);
            setStep('SUCCESS');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password. Please check your OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 relative overflow-hidden px-4">
            {/* Background Texture similar to Login */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-200/20 blur-[100px] animate-pulse"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/50">
                    {step === 'REQUEST' && (
                        <>
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-6">
                                    <Mail className="h-8 w-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">Forgot Password?</h2>
                                <p className="mt-2 text-slate-500 text-sm">
                                    Enter your email address and we'll send you a verification code to reset your password.
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 mb-6 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleRequestSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        placeholder="user@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-4 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70"
                                >
                                    {loading ? 'Sending...' : 'Send Verification Code'}
                                </button>
                            </form>
                        </>
                    )}

                    {step === 'OTP' && (
                        <>
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-6">
                                    <KeyRound className="h-8 w-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">Enter Verification Code</h2>
                                <p className="mt-2 text-slate-500 text-sm">
                                    We sent a 6-digit code to <span className="font-semibold text-slate-800">{email}</span>. Enter it below along with your new password.
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 mb-6 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleOtpSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">6-Digit Code</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={6}
                                        className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center tracking-widest font-mono font-bold text-lg"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={12}
                                        className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        placeholder="New Password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-4 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70"
                                >
                                    {loading ? 'Resetting...' : 'Reset Password'}
                                </button>
                                
                                <div className="text-center mt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => { setStep('REQUEST'); setError(''); }}
                                        className="text-blue-600 font-medium hover:underline text-sm"
                                    >
                                        Resend Code
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {step === 'SUCCESS' && (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-6 animate-bounce">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Reset!</h2>
                            <p className="text-slate-500 text-sm mb-8">
                                Your password has been successfully reset. You can now use your new password to log in.
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full flex justify-center py-4 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 transition-all shadow-lg shadow-green-500/30"
                            >
                                Return to Sign In
                            </button>
                        </div>
                    )}

                    {step !== 'SUCCESS' && (
                        <div className="mt-8 text-center">
                            <button onClick={() => navigate('/login')} className="flex items-center justify-center w-full text-sm text-slate-400 hover:text-slate-600 transition-colors gap-2">
                                <ArrowLeft size={16} /> Back to Sign In
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
