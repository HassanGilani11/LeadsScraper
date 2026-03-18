import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Check, Rocket, Zap, Crown, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

interface PlanUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlan?: string;
}

const PLANS = [
    {
        name: 'Starter',
        price: '$0',
        description: 'Perfect for exploring and small projects.',
        features: [
            '20 credits per day',
            'Basic lead extraction',
            'CSV & Excel Export',
            'Community Support'
        ],
        icon: <Rocket className="text-blue-500" size={24} />,
        buttonText: 'Current Plan',
        popular: false,
        stripeLink: null,
    },
    {
        name: 'Pro',
        price: '$19',
        pricePeriod: '/mo',
        description: 'For growing businesses needing more volume.',
        features: [
            '100 credits per month',
            'Advanced lead scoring',
            'Priority Support',
            'Detailed ICP Analysis',
            'Campaign Management'
        ],
        icon: <Zap className="text-amber-500" size={24} />,
        buttonText: 'Upgrade to Pro',
        popular: true,
        stripeLink: 'Pro',
    },
    {
        name: 'Enterprise',
        price: '$79',
        pricePeriod: '/mo',
        description: 'High-volume scraping for large teams.',
        features: [
            '500 credits per month',
            'Unlimited Campaigns',
            'API Access',
            'Custom Lead Scoring',
            '24/7 Dedicated Support'
        ],
        icon: <Crown className="text-[#1b57b1]" size={24} />,
        buttonText: 'Go Enterprise',
        popular: false,
        stripeLink: 'Enterprise',
    }
];

const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({ isOpen, onClose, currentPlan = 'Starter' }) => {
    const { user } = useStore();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleUpgrade = async (planName: string | null) => {
        if (!planName || !user) return;
        setError(null);
        setLoadingPlan(planName);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    planName,
                    userId: user.id,
                    userEmail: user.email,
                },
            });

            if (fnError) throw fnError;
            if (data?.error) throw new Error(data.error);
            if (!data?.url) throw new Error('No checkout URL returned');

            // Redirect to Stripe Checkout
            window.location.href = data.url;

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to start checkout. Please try again.';
            console.error('Checkout error:', message);
            setError(message);
            setLoadingPlan(null);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 pb-0 flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">Choose Your Plan</h2>
                        <p className="text-slate-500 mt-2">Scale your lead generation with our premium features and higher limits.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Pricing Grid */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PLANS.map((plan) => {
                        const isCurrent = plan.name === currentPlan;
                        return (
                            <div 
                                key={plan.name}
                                className={`
                                    relative p-6 rounded-2xl border transition-all duration-300 flex flex-col
                                    ${plan.popular 
                                        ? 'border-[#1b57b1] shadow-xl shadow-[#1b57b1]/10 scale-105 z-10' 
                                        : 'border-slate-200 hover:border-slate-300'}
                                `}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1b57b1] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                                        Most Popular
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2 rounded-lg ${isCurrent ? 'bg-slate-100' : 'bg-[#1b57b1]/5'}`}>
                                        {plan.icon}
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-900">{plan.name}</h3>
                                </div>

                                <div className="mb-6">
                                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                                    {plan.pricePeriod && (
                                        <span className="text-slate-400 font-medium ml-1">{plan.pricePeriod}</span>
                                    )}
                                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                                        {plan.description}
                                    </p>
                                </div>

                                <div className="space-y-3 mb-8 flex-1">
                                    {plan.features.map((feature: string) => (
                                        <div key={feature} className="flex items-start gap-3">
                                            <div className="p-0.5 rounded-full bg-green-50 text-green-600 shrink-0 mt-0.5">
                                                <Check size={14} />
                                            </div>
                                            <span className="text-sm text-slate-600 font-medium">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    disabled={isCurrent || loadingPlan !== null}
                                    onClick={() => !isCurrent && !loadingPlan && handleUpgrade(plan.stripeLink)}
                                    className={`
                                        w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                                        ${isCurrent 
                                            ? 'bg-slate-100 text-slate-400 cursor-default' 
                                            : loadingPlan === plan.name
                                                ? 'bg-[#1b57b1]/80 text-white cursor-wait'
                                                : 'bg-[#1b57b1] text-white hover:bg-[#154690] shadow-lg shadow-[#1b57b1]/20 cursor-pointer'}
                                    `}
                                >
                                    {loadingPlan === plan.name ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Redirecting to Stripe…
                                        </>
                                    ) : isCurrent ? 'Current Plan' : plan.buttonText}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-6 border-t border-slate-100">
                    {error && (
                        <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium text-center">
                            ⚠️ {error}
                        </div>
                    )}
                    <p className="text-slate-500 text-sm text-center">
                        Need a custom plan for your team?{' '}
                        <a href="mailto:sales@leadsscraper.com" className="text-[#1b57b1] font-bold hover:underline">Contact Sales</a>
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PlanUpgradeModal;
