import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppContainer from '@/components/layout/AppContainer';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import {
    TrendingUp,
    TrendingDown,
    Loader2
} from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useStore();
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
    const [stats, setStats] = useState({
        totalLeads: 0,
        avgICP: 0,
        industryDist: [] as { name: string, value: number, color: string }[],
        icpBreakdown: [0, 0, 0, 0, 0], // ranges: 1-2, 3-4, 5-6, 7-8, 9-10
        acquisitionTrends: [] as number[],
    });

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, dateRange]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            // Calculate starting date
            const now = new Date();
            const startDate = new Date();
            if (dateRange === '7d') startDate.setDate(now.getDate() - 7);
            else if (dateRange === '30d') startDate.setDate(now.getDate() - 30);
            else startDate.setDate(now.getDate() - 90);

            // 1. Fetch leads within date range
            const { data: leads, error } = await supabase
                .from('leads')
                .select('created_at, industry, icp_score')
                .eq('user_id', user!.id)
                .gte('created_at', startDate.toISOString());

            if (error) throw error;

            if (leads) {
                // Total Leads
                const totalLeads = leads.length;

                // Average ICP Score
                const avgICP = totalLeads > 0 
                    ? parseFloat((leads.reduce((acc, curr) => acc + (Number(curr.icp_score) || 0), 0) / totalLeads).toFixed(1))
                    : 0;

                // Industry Distribution (Top 3)
                const industryCounts: Record<string, number> = {};
                leads.forEach(l => {
                    const ind = l.industry || 'Other';
                    industryCounts[ind] = (industryCounts[ind] || 0) + 1;
                });
                const sortedIndustries = Object.entries(industryCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);
                
                const colors = ['#1b57b1', '#3b82f6', '#93c5fd'];
                const industryDist = sortedIndustries.map(([name, count], i) => ({
                    name,
                    value: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
                    color: colors[i] || '#e2e8f0'
                }));

                // ICP Breakdown
                const icpBreakdown = [0, 0, 0, 0, 0];
                leads.forEach(l => {
                    const score = Number(l.icp_score) || 0;
                    if (score <= 2) icpBreakdown[0]++;
                    else if (score <= 4) icpBreakdown[1]++;
                    else if (score <= 6) icpBreakdown[2]++;
                    else if (score <= 8) icpBreakdown[3]++;
                    else icpBreakdown[4]++;
                });

                // Acquisition Trends (Group by day)
                const daysToFetch = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
                const dailyCounts = new Array(daysToFetch).fill(0);
                
                leads.forEach(l => {
                    const leadDate = new Date(l.created_at);
                    const diffTime = Math.abs(now.getTime() - leadDate.getTime());
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays < daysToFetch) {
                        dailyCounts[daysToFetch - 1 - diffDays]++;
                    }
                });

                setStats({
                    totalLeads,
                    avgICP,
                    industryDist,
                    icpBreakdown,
                    acquisitionTrends: dailyCounts
                });
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AppContainer title="Analytics Overview">
                <div className="h-[60vh] flex items-center justify-center">
                    <Loader2 size={40} className="animate-spin text-[#1b57b1]" />
                </div>
            </AppContainer>
        );
    }

    return (
        <AppContainer title={`Welcome back, ${user?.full_name || 'Hassan'}`}>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Leads Scraped"
                    value={stats.totalLeads.toLocaleString()}
                    trend="+100%"
                    trendType="up"
                />
                <KPICard
                    title="Average ICP Score"
                    value={stats.avgICP.toString()}
                    trend="+0.2"
                    trendType="up"
                />
                <KPICard
                    title="Email Success Rate"
                    value="--%"
                    subtitle="Coming Soon"
                />
                <KPICard
                    title="Credits Used"
                    value={`${user?.credits?.toLocaleString() || '0'} / ${user?.max_credits?.toLocaleString() || '0'}`}
                    subtitle={user?.plan === 'Starter' ? 'Resets Daily' : 'Resets Monthly'}
                />
            </div>

            {/* Main Chart */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h4 className="text-lg font-bold text-slate-900">Lead Acquisition Trends</h4>
                        <p className="text-sm text-slate-500">New leads identified per day over the selected period</p>
                    </div>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        {(['7d', '30d', '90d'] as const).map(range => (
                            <button 
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${dateRange === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-64 relative">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
                        <defs>
                            <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#1b57b1" stopOpacity="0.3"></stop>
                                <stop offset="100%" stopColor="#1b57b1" stopOpacity="0"></stop>
                            </linearGradient>
                        </defs>
                        {stats.acquisitionTrends.length > 0 && (() => {
                            const max = Math.max(...stats.acquisitionTrends, 1);
                            const points = stats.acquisitionTrends.map((count, i) => {
                                const x = (i / (stats.acquisitionTrends.length - 1)) * 1000;
                                const y = 180 - (count / max) * 150;
                                return `${x},${y}`;
                            });
                            const areaPath = `M0,200 L${points.join(' L')} L1000,200 Z`;
                            const linePath = `M${points.join(' L')}`;
                            return (
                                <>
                                    <path d={areaPath} fill="url(#areaGradient)"></path>
                                    <path d={linePath} fill="none" stroke="#1b57b1" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"></path>
                                </>
                            );
                        })()}
                    </svg>
                    <div className="flex justify-between mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2">
                        <span>Day 1</span>
                        <span>Day {Math.floor(stats.acquisitionTrends.length / 3)}</span>
                        <span>Day {Math.floor(stats.acquisitionTrends.length * 2 / 3)}</span>
                        <span>Day {stats.acquisitionTrends.length}</span>
                    </div>
                </div>
            </div>

            {/* Secondary Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                {/* Industry Distribution */}
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 className="text-lg font-bold mb-1 text-slate-900">Lead Distribution by Industry</h4>
                    <p className="text-sm text-slate-500 mb-8">Breakdown of leads across top sectors</p>
                    <div className="flex-1 flex items-center justify-around">
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" fill="none" r="16" stroke="#e2e8f0" strokeWidth="4"></circle>
                                {stats.industryDist.length > 0 ? (
                                    stats.industryDist.map((ind, i) => {
                                        // Simple dasharray visualization
                                        const offset = stats.industryDist.slice(0, i).reduce((a, b) => a + b.value, 0);
                                        return (
                                            <circle 
                                                key={ind.name}
                                                cx="18" cy="18" fill="none" r="16" 
                                                stroke={ind.color} 
                                                strokeDasharray={`${ind.value}, 100`} 
                                                strokeDashoffset={-offset} 
                                                strokeWidth="4" 
                                                className="cursor-pointer hover:stroke-blue-400 transition-all"
                                                onClick={() => navigate(`/leads?industry=${encodeURIComponent(ind.name === 'Other' ? 'Other' : ind.name)}`)}
                                            />
                                        );
                                    })
                                ) : (
                                    <circle cx="18" cy="18" fill="none" r="16" stroke="#1b57b1" strokeDasharray="100, 100" strokeWidth="4"></circle>
                                )}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-bold text-slate-900">{stats.totalLeads > 1000 ? (stats.totalLeads/1000).toFixed(1)+'k' : stats.totalLeads}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {stats.industryDist.length > 0 ? stats.industryDist.map(ind => (
                                <div 
                                    key={ind.name} 
                                    className="flex items-center gap-3 cursor-pointer group"
                                    onClick={() => navigate(`/leads?industry=${encodeURIComponent(ind.name)}`)}
                                >
                                    <div className="size-3 rounded-full transition-transform group-hover:scale-125" style={{ backgroundColor: ind.color }}></div>
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-[#1b57b1] transition-colors">{ind.name} ({ind.value}%)</span>
                                </div>
                            )) : (
                                <div className="text-sm text-slate-400 italic">No industry data available</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ICP Score Breakdown */}
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 className="text-lg font-bold mb-1 text-slate-900">ICP Score Breakdown</h4>
                    <p className="text-sm text-slate-500 mb-8">Distribution of leads by ideal customer profile match</p>
                    <div className="flex-1 flex items-end justify-between gap-2 h-40">
                        <BarChartItem 
                            count={stats.icpBreakdown[0]} 
                            label="1-2" 
                            height={`${Math.max(5, (stats.icpBreakdown[0] / Math.max(...stats.icpBreakdown, 1)) * 100)}%`} 
                            onClick={() => navigate('/leads?minScore=1&maxScore=2')}
                        />
                        <BarChartItem 
                            count={stats.icpBreakdown[1]} 
                            label="3-4" 
                            height={`${Math.max(5, (stats.icpBreakdown[1] / Math.max(...stats.icpBreakdown, 1)) * 100)}%`} 
                            onClick={() => navigate('/leads?minScore=3&maxScore=4')}
                        />
                        <BarChartItem 
                            count={stats.icpBreakdown[2]} 
                            label="5-6" 
                            height={`${Math.max(5, (stats.icpBreakdown[2] / Math.max(...stats.icpBreakdown, 1)) * 100)}%`} 
                            onClick={() => navigate('/leads?minScore=5&maxScore=6')}
                        />
                        <BarChartItem 
                            count={stats.icpBreakdown[3]} 
                            label="7-8" 
                            height={`${Math.max(5, (stats.icpBreakdown[3] / Math.max(...stats.icpBreakdown, 1)) * 100)}%`} 
                            active 
                            onClick={() => navigate('/leads?minScore=7&maxScore=8')}
                        />
                        <BarChartItem 
                            count={stats.icpBreakdown[4]} 
                            label="9-10" 
                            height={`${Math.max(5, (stats.icpBreakdown[4] / Math.max(...stats.icpBreakdown, 1)) * 100)}%`} 
                            primary 
                            onClick={() => navigate('/leads?minScore=9&maxScore=10')}
                        />
                    </div>
                    <div className="mt-6 flex justify-center text-xs text-slate-400 font-medium">
                        <p>Scores weighted by revenue potential & firmographics</p>
                    </div>
                </div>
            </div>
        </AppContainer>
    );
};

export default Dashboard;

interface KPICardProps {
    title: string;
    value: string;
    trend?: string;
    trendType?: 'up' | 'down';
    subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, trend, trendType, subtitle }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col justify-between">
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <div className="mt-2 flex items-end justify-between">
            <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
            {trend && (
                <span className={`text-sm font-bold flex items-center gap-0.5 ${trendType === 'up' ? 'text-green-600' : 'text-red-500'}`}>
                    {trend}
                    {trendType === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                </span>
            )}
            {subtitle && <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">{subtitle}</span>}
        </div>
    </div>
);

interface BarChartItemProps {
    height: string;
    label: string;
    count: number;
    active?: boolean;
    primary?: boolean;
    onClick?: () => void;
}

const BarChartItem: React.FC<BarChartItemProps> = ({ height, label, count, active, primary, onClick }) => (
    <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer" onClick={onClick}>
        <div
            className={`
                w-full rounded-t transition-all duration-500
                ${primary ? 'bg-[#1b57b1]' : active ? 'bg-[#1b57b1]/40' : 'bg-slate-100'} 
                ${!primary && !active ? 'group-hover:bg-[#1b57b1]/30' : 'group-hover:opacity-80'}
            `}
            style={{ height }}
            title={`${label}: ${count} leads`}
        ></div>
        <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{label}</span>
    </div>
);
