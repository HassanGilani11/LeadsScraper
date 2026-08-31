import React, { useState, useEffect, useMemo } from 'react';
import { X, BarChart3, TrendingUp, Users, Mail, MessageSquare, ArrowUpRight, Loader2, CheckCircle2, AlertCircle, PieChart, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Campaign } from '@/store/useStore';

interface AnalyticsData {
    totalEnrolled: number;
    repliedCount: number;
    sentCount: number;
    failedCount: number;
    stepsDistribution: Record<number, number>;
    successRate: number;
}

interface CampaignAnalyticsModalProps {
    open: boolean;
    onClose: () => void;
    campaign: Campaign;
}

const CampaignAnalyticsModal: React.FC<CampaignAnalyticsModalProps> = ({ open, onClose, campaign }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        if (open && campaign.id) {
            fetchAnalytics();
        }
    }, [open, campaign.id]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            // 1. Fetch Sequences
            const { data: sequences, error: seqError } = await supabase
                .from('lead_sequences')
                .select('status, current_step_number, lead_id')
                .eq('campaign_id', campaign.id);

            if (seqError) throw seqError;

            // 2. Fetch Email Logs for these leads
            const leadIds = sequences?.map(s => s.lead_id) || [];
            let emailLogs: any[] = [];
            
            if (leadIds.length > 0) {
                const { data: logs, error: logError } = await supabase
                    .from('email_logs')
                    .select('status, lead_id')
                    .in('lead_id', leadIds);
                if (!logError && logs) emailLogs = logs;
            }

            // 3. Process Data
            const totalEnrolled = sequences?.length || 0;
            const repliedCount = sequences?.filter(s => s.status === 'replied').length || 0;
            const sentCount = emailLogs.filter(l => l.status === 'sent').length;
            const failedCount = emailLogs.filter(l => l.status === 'failed').length;
            
            const stepsDistribution: Record<number, number> = {};
            sequences?.forEach(s => {
                const step = s.current_step_number + 1;
                stepsDistribution[step] = (stepsDistribution[step] || 0) + 1;
            });

            setData({
                totalEnrolled,
                repliedCount,
                sentCount,
                failedCount,
                stepsDistribution,
                successRate: totalEnrolled > 0 ? (repliedCount / totalEnrolled) * 100 : 0
            });
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#1b57b1]/10 rounded-xl text-[#1b57b1]">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{campaign.name} Analytics</h3>
                            <p className="text-sm text-slate-500 font-medium">Outreach Performance & ROI Dashboard</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4">
                            <Loader2 size={40} className="text-[#1b57b1] animate-spin" />
                            <p className="text-sm font-medium text-slate-500">Calculating your campaign ROI...</p>
                        </div>
                    ) : data ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Summary Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <AnalyticsTile 
                                    icon={<Users className="text-blue-600" />} 
                                    label="Total Enrolled" 
                                    value={data.totalEnrolled.toLocaleString()} 
                                    color="blue"
                                />
                                <AnalyticsTile 
                                    icon={<Mail className="text-indigo-600" />} 
                                    label="Emails Sent" 
                                    value={data.sentCount.toLocaleString()} 
                                    color="indigo"
                                />
                                <AnalyticsTile 
                                    icon={<MessageSquare className="text-emerald-600" />} 
                                    label="Positive Replies" 
                                    value={data.repliedCount.toLocaleString()} 
                                    color="emerald"
                                />
                                <div className="bg-slate-900 p-5 rounded-2xl flex flex-col gap-2 shadow-lg shadow-slate-900/10">
                                    <div className="flex items-center justify-between">
                                        <TrendingUp className="text-emerald-400" size={20} />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Success Rate</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white">{data.successRate.toFixed(1)}%</div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-400" style={{ width: `${data.successRate}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                {/* Funnel Progression */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            <Activity size={18} className="text-[#1b57b1]" />
                                            Sequence Funnel Progression
                                        </h4>
                                    </div>
                                    <div className="space-y-4">
                                        {Object.entries(data.stepsDistribution).sort(([a], [b]) => Number(a) - Number(b)).map(([step, count]) => (
                                            <div key={step} className="space-y-1.5">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-slate-600">Step {step}: Initial Outreach & Follow-ups</span>
                                                    <span className="text-slate-900">{count} Leads ({( (count / data.totalEnrolled) * 100 ).toFixed(0)}%)</span>
                                                </div>
                                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                                                    <div 
                                                        className="h-full bg-[#1b57b1] transition-all duration-1000" 
                                                        style={{ width: `${(count / data.totalEnrolled) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Delivery Health */}
                                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-6">
                                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Loader2 size={18} className="text-slate-600" />
                                        Delivery Integrity
                                    </h4>
                                    <div className="flex items-center justify-center py-4">
                                        <div className="relative w-32 h-32 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-200" />
                                                <circle 
                                                    cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                                    strokeDasharray={364.4}
                                                    strokeDashoffset={364.4 - (364.4 * ( data.sentCount / (data.sentCount + data.failedCount || 1) )) }
                                                    className="text-indigo-600 transition-all duration-1000" 
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-xl font-bold text-slate-900">
                                                    { ( (data.sentCount / (data.sentCount + data.failedCount || 1)) * 100 ).toFixed(0) }%
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">Healthy</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                                                <CheckCircle2 size={14} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Success</span>
                                            </div>
                                            <div className="text-lg font-bold text-slate-900">{data.sentCount} Sent</div>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-1.5 text-red-500 mb-1">
                                                <AlertCircle size={14} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Bounced</span>
                                            </div>
                                            <div className="text-lg font-bold text-slate-900">{data.failedCount} Failed</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center space-y-4">
                            <PieChart size={48} className="mx-auto text-slate-200" />
                            <p className="text-slate-500">No data available for this campaign yet. Start the sequence to see results!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AnalyticsTile = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) => {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600'
    };
    
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
        </div>
    );
}

export default CampaignAnalyticsModal;
