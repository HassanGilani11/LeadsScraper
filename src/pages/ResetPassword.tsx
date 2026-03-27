import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { Lock, ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    const navigate = useNavigate();
    const { session, isLoading, setSession } = useStore();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b57b1]"></div>
            </div>
        );
    }

    // If there is no session, they shouldn't be here (recovery link provides a temporary session)
    if (!session) {
        return <Navigate to="/auth" replace />;
    }

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            // Update the profile status to Active since they have now completed the invite loop
            await supabase.from('profiles').update({ status: 'Active' }).eq('id', session.user.id);

            // Immediately clear the session so they are forced to log in with their new credentials
            await supabase.auth.signOut();
            setSession(null);
            
            setSuccess(true);
            setTimeout(() => {
                navigate('/auth', { state: { message: 'Password updated successfully! Please login with your new password.' } });
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'An error occurred during password reset');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1b57b1] text-white mb-4 shadow-lg shadow-[#1b57b1]/20">
                        <Sparkles size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Set New Password</h1>
                    <p className="text-slate-500 mt-2">Please enter your new password below.</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sparkles size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Password Updated!</h2>
                            <p className="text-slate-500 mt-2">Your password has been set successfully. Redirecting you to login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 ml-1">New Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b57b1]/20 focus:border-[#1b57b1] outline-none transition-all text-slate-900 placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 ml-1">Confirm New Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b57b1]/20 focus:border-[#1b57b1] outline-none transition-all text-slate-900 placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#1b57b1] hover:bg-[#164791] text-white font-semibold py-3 rounded-xl shadow-lg shadow-[#1b57b1]/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-2 cursor-pointer"
                            >
                                {loading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <>
                                        Update Password
                                        <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
