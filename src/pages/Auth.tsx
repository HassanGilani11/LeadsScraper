import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles, ArrowLeft } from 'lucide-react';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgot, setIsForgot] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    
    const navigate = useNavigate();
    const setSession = useStore((state) => state.setSession);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (isForgot) {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) throw error;
                setSuccessMsg('Check your email for the password reset link!');
            } else if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                if (data.session) {
                    setSession(data.session);
                    navigate('/dashboard');
                }
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                        emailRedirectTo: `${window.location.origin}/reset-password`,
                    },
                });
                if (error) throw error;

                // Set their profile status to Pending so they are forced to go through
                // the /reset-password flow when they land after confirming their email.
                if (data.user) {
                    await supabase
                        .from('profiles')
                        .update({ status: 'Pending' })
                        .eq('id', data.user.id);
                }

                if (data.session) {
                    // If email confirmation is disabled in Supabase, they get a session right away.
                    // We can still redirect them to reset-password so they confirm their password.
                    navigate('/reset-password');
                } else {
                    setSuccessMsg('Check your email for a confirmation link to complete your signup!');
                }
            }
        } catch (err: any) {
            let message = err.message || 'An error occurred';
            if (isForgot && message.includes('Rate limit')) {
                message = 'Too many requests. Please try again in an hour.';
            } else if (isForgot && message.includes('Email not found')) {
                message = 'No account found with this email address.';
            } else if (isForgot && message.includes('recovery email')) {
                message = 'Could not send reset link. Please verify your email or try again later.';
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        if (isForgot) return 'Reset Password';
        return isLogin ? 'Leads Scraper' : 'Join Leads Scraper';
    };

    const getSubtitle = () => {
        if (isForgot) return 'Enter your email to receive a reset link.';
        return isLogin ? 'Welcome back! Please login to your account.' : 'Create an account to start scraping leads.';
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1b57b1] text-white mb-4 shadow-lg shadow-[#1b57b1]/20">
                        <Sparkles size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">{getTitle()}</h1>
                    <p className="text-slate-500 mt-2">{getSubtitle()}</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
                    <form onSubmit={handleAuth} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                                {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm">
                                {successMsg}
                            </div>
                        )}

                        {!isLogin && !isForgot && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 ml-1">Full Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Ibrahim Aziz"
                                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b57b1]/20 focus:border-[#1b57b1] outline-none transition-all text-slate-900 placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 ml-1">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b57b1]/20 focus:border-[#1b57b1] outline-none transition-all text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {!isForgot && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-sm font-medium text-slate-700">Password</label>
                                    {isLogin && (
                                        <button 
                                            type="button"
                                            onClick={() => { setIsForgot(true); setError(null); setSuccessMsg(null); }}
                                            className="text-xs font-bold text-[#1b57b1] hover:underline cursor-pointer"
                                        >
                                            Forgot?
                                        </button>
                                    )}
                                </div>
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
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1b57b1] hover:bg-[#164791] text-white font-semibold py-3 rounded-xl shadow-lg shadow-[#1b57b1]/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-2 cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    {isForgot ? 'Send Reset Link' : isLogin ? 'Login to Dashboard' : 'Create Account'}
                                    <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        {isForgot ? (
                            <button
                                onClick={() => setIsForgot(false)}
                                className="text-sm text-slate-500 hover:text-[#1b57b1] transition-colors flex items-center justify-center gap-2 mx-auto font-medium cursor-pointer"
                            >
                                <ArrowLeft size={16} />
                                Back to login
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-sm text-slate-500 hover:text-[#1b57b1] transition-colors cursor-pointer"
                            >
                                {isLogin ? (
                                    <>Don't have an account? <span className="font-semibold text-[#1b57b1]">Sign up free</span></>
                                ) : (
                                    <>Already have an account? <span className="font-semibold text-[#1b57b1]">Login instead</span></>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-center text-[11px] text-slate-400 mt-8 leading-relaxed max-w-[280px] mx-auto">
                    By continuing, you agree to our <span className="underline hover:text-slate-600 transition-colors cursor-pointer">Terms of Service</span> and <span className="underline hover:text-slate-600 transition-colors cursor-pointer">Privacy Policy</span>.
                </p>
            </div>
        </div>
    );
};

export default Auth;
