import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowRight, Zap, Crown, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

const BillingSuccess = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const { setUser, user } = useStore();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [planName, setPlanName] = useState('');
    const [maxCredits, setMaxCredits] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const verifyAndActivate = async () => {
            if (!sessionId) {
                setErrorMsg('No session ID found in URL.');
                setStatus('error');
                return;
            }

            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession?.user?.id) {
                setErrorMsg('You are not logged in.');
                setStatus('error');
                return;
            }

            try {
                // Call verify-payment Edge Function — it checks Stripe and updates DB directly
                const { data, error } = await supabase.functions.invoke('verify-payment', {
                    body: {
                        sessionId,
                        userId: authSession.user.id,
                    },
                    headers: {
                        Authorization: `Bearer ${authSession.access_token}`,
                    },
                });

                if (error || data?.error) {
                    console.error('Verification detailed error:', error || data?.error);
                    throw new Error(data?.details || error?.message || data?.error || 'Verification failed. Please refresh or contact support.');
                }

                const plan = data.plan as string;
                const credits = data.max_credits as number;

                setPlanName(plan);
                setMaxCredits(credits);

                // Update Zustand store immediately
                setUser({
                    id: authSession.user.id,
                    email: authSession.user.email || user?.email || '',
                    full_name: user?.full_name || '',
                    role: user?.role || 'Member',
                    plan: plan as 'Pro' | 'Enterprise',
                    credits: 0,
                    max_credits: credits,
                    company: user?.company || '',
                    avatar_url: user?.avatar_url || '',
                    last_reset_date: new Date().toISOString(),
                });

                setStatus('success');

                // Hard reload to Settings after 4 seconds so App.tsx re-fetches fresh profile
                setTimeout(() => { window.location.href = '/settings'; }, 4000);

            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
                console.error('verify-payment failed:', message);
                setErrorMsg(message);
                setStatus('error');
            }
        };

        // Small delay to let Stripe finalize on their end
        const timer = setTimeout(verifyAndActivate, 1500);
        return () => clearTimeout(timer);
    }, [sessionId]);

    const planConfig: Record<string, { icon: React.ReactNode; color: string }> = {
        Pro: {
            icon: <Zap size={48} className="text-amber-500" />,
            color: 'from-amber-50 to-yellow-50',
        },
        Enterprise: {
            icon: <Crown size={48} className="text-[#1b57b1]" />,
            color: 'from-blue-50 to-indigo-50',
        },
    };

    const plan = planConfig[planName] || planConfig['Pro'];

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden">

                {/* Loading */}
                {status === 'loading' && (
                    <div className="p-16 flex flex-col items-center justify-center text-center gap-6">
                        <div className="w-20 h-20 rounded-full border-4 border-[#1b57b1]/20 flex items-center justify-center">
                            <Loader2 size={36} className="animate-spin text-[#1b57b1]" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Confirming your subscription…</h2>
                            <p className="text-slate-500 mt-2">Please wait while we activate your plan. This takes just a moment.</p>
                        </div>
                    </div>
                )}

                {/* Success */}
                {status === 'success' && (
                    <>
                        <div className={`bg-gradient-to-br ${plan.color} p-12 flex flex-col items-center text-center gap-4`}>
                            <div className="animate-in zoom-in duration-500">
                                {plan.icon}
                            </div>
                            <div className="p-1 bg-green-500 rounded-full animate-in zoom-in duration-700 delay-200">
                                <CheckCircle2 size={32} className="text-white" />
                            </div>
                        </div>

                        <div className="p-8 text-center">
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">
                                Welcome to {planName}! 🎉
                            </h1>
                            <p className="text-slate-500 text-lg mb-6">
                                Your subscription is now active. You now have{' '}
                                <span className="font-bold text-slate-900">{maxCredits} credits/month</span>{' '}
                                to power your lead generation.
                            </p>

                            <div className="bg-slate-50 rounded-2xl p-4 mb-8 text-left space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                                    <span>Plan upgraded and activated</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                                    <span>Credits reset and ready to use</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                                    <span>Confirmation email sent to {user?.email}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => { window.location.href = '/scraper'; }}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1b57b1] text-white rounded-xl font-bold hover:bg-[#154690] transition-all shadow-lg shadow-[#1b57b1]/20"
                            >
                                Start Scraping Leads
                                <ArrowRight size={18} />
                            </button>
                            <p className="text-xs text-slate-400 mt-4">Redirecting to settings in a few seconds…</p>
                        </div>
                    </>
                )}

                {/* Error */}
                {status === 'error' && (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle size={32} className="text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
                        <p className="text-slate-500 mb-2">
                            {errorMsg || "We couldn't confirm your subscription."}
                        </p>
                        <p className="text-slate-400 text-sm mb-6">
                            If payment was taken, your plan will update shortly. Please check your email or contact support.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { window.location.href = '/settings'; }}
                                className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                Go to Settings
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 py-3 bg-[#1b57b1] text-white rounded-xl font-bold hover:bg-[#154690] transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BillingSuccess;
