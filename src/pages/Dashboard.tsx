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
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Rectangle
} from 'recharts';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useStore();
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
    const [stats, setStats] = useState({
        totalLeads: 0,
        avgICP: 0,
        industryDist: [] as { name: string, value: number, count: number, color: string }[],
        icpBreakdown: [] as { name: string, count: number, range: string }[],
        acquisitionTrends: [] as { date: string, count: number }[],
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
                    count,
                    color: colors[i] || '#e2e8f0'
                }));

                // ICP Breakdown
                const icpRanges = [
                    { name: '1-2', range: '1-2', count: 0 },
                    { name: '3-4', range: '3-4', count: 0 },
                    { name: '5-6', range: '5-6', count: 0 },
                    { name: '7-8', range: '7-8', count: 0 },
                    { name: '9-10', range: '9-10', count: 0 },
                ];
                
                leads.forEach(l => {
                    const score = Number(l.icp_score) || 0;
                    if (score <= 2) icpRanges[0].count++;
                    else if (score <= 4) icpRanges[1].count++;
                    else if (score <= 6) icpRanges[2].count++;
                    else if (score <= 8) icpRanges[3].count++;
                    else icpRanges[4].count++;
                });

                // Acquisition Trends (Group by day)
                const daysToFetch = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
                const dailyData = [];
                
                for (let i = daysToFetch - 1; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(now.getDate() - i);
                    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    
                    const count = leads.filter(l => {
                        const leadDate = new Date(l.created_at);
                        return leadDate.toDateString() === d.toDateString();
                    }).length;
                    
                    dailyData.push({ date: dateStr, count });
                }

                setStats({
                    totalLeads,
                    avgICP,
                    industryDist,
                    icpBreakdown: icpRanges,
                    acquisitionTrends: dailyData
                });
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-lg font-bold text-[#1b57b1]">
                        {payload[0].value} <span className="text-sm font-medium text-slate-500">Leads</span>
                    </p>
                </div>
            );
        }
        return null;
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
            <div className="bg-white p-4 md:p-8 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-10">
                    <div>
                        <h4 className="text-lg md:text-xl font-bold text-slate-900">Lead Acquisition Trends</h4>
                        <p className="text-xs md:text-sm text-slate-500">New leads identified per day</p>
                    </div>
                    <div className="flex w-full sm:w-auto gap-1 bg-slate-100 p-1 rounded-xl">
                        {(['7d', '30d', '90d'] as const).map(range => (
                            <button 
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`flex-1 sm:flex-none px-3 md:px-4 py-2.5 md:py-2 text-xs font-bold rounded-lg transition-all ${dateRange === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 font-semibold'}`}
                            >
                                {range === '7d' ? '7D' : range === '30d' ? '30D' : '90D'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-64 md:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={stats.acquisitionTrends}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1b57b1" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#1b57b1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                dy={15}
                                interval={dateRange === '90d' ? 14 : dateRange === '30d' ? 4 : 0}
                            />
                            <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                            />
                            <Tooltip 
                                content={<CustomTooltip />}
                                cursor={{ stroke: '#1b57b1', strokeWidth: 2, strokeDasharray: '5 5' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="count" 
                                stroke="#1b57b1" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorCount)" 
                                animationDuration={1500}
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#1b57b1' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Secondary Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                {/* Industry Distribution */}
                <div className="bg-white p-4 md:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-all">
                    <h4 className="text-lg md:text-xl font-bold mb-1 text-slate-900">Lead Distribution by Industry</h4>
                    <p className="text-xs md:text-sm text-slate-500 mb-6 md:mb-8">Breakdown of leads across top sectors</p>
                    <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-6 md:gap-8">
                        <div className="relative w-40 h-40 md:w-48 md:h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.industryDist}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        animationDuration={1500}
                                    >
                                        {stats.industryDist.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.color} 
                                                className="cursor-pointer focus:outline-none"
                                                onClick={() => navigate(`/leads?industry=${encodeURIComponent(entry.name === 'Other' ? 'Other' : entry.name)}`)}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        content={({ active, payload }: any) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white p-2 px-3 border border-slate-200 shadow-xl rounded-lg">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{payload[0].name}</p>
                                                        <p className="text-sm font-bold text-slate-900">{payload[0].value}% ({payload[0].payload.count} leads)</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-slate-900">{stats.totalLeads > 1000 ? (stats.totalLeads/1000).toFixed(1)+'k' : stats.totalLeads}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {stats.industryDist.length > 0 ? stats.industryDist.map(ind => (
                                <div 
                                    key={ind.name} 
                                    className="flex items-center gap-4 cursor-pointer group"
                                    onClick={() => navigate(`/leads?industry=${encodeURIComponent(ind.name)}`)}
                                >
                                    <div className="size-3.5 rounded-full transition-all group-hover:ring-4 group-hover:ring-[#1b57b1]/10" style={{ backgroundColor: ind.color }}></div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 group-hover:text-[#1b57b1] transition-colors leading-tight">{ind.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400">{ind.value}% • {ind.count} leads</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-sm text-slate-400 italic">No industry data available</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ICP Score Breakdown */}
                <div className="bg-white p-4 md:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-all">
                    <h4 className="text-lg md:text-xl font-bold mb-1 text-slate-900">ICP Score Breakdown</h4>
                    <p className="text-xs md:text-sm text-slate-500 mb-6 md:mb-8">Distribution of leads by ICP match</p>
                    <div className="flex-1 h-48 md:h-64 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={stats.icpBreakdown}
                                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="range" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    content={({ active, payload }: any) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white p-2 px-3 border border-slate-200 shadow-xl rounded-lg">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Score Range: {payload[0].payload.range}</p>
                                                    <p className="text-sm font-bold text-slate-900">{payload[0].value} Leads</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar 
                                    dataKey="count" 
                                    fill="#1b57b1" 
                                    radius={[4, 4, 0, 0]}
                                    barSize={40}
                                    animationDuration={1500}
                                    className="cursor-pointer"
                                    onClick={(data: any) => {
                                        if (data && data.range) {
                                            const [min, max] = data.range.split('-');
                                            navigate(`/leads?minScore=${min}&maxScore=${max}`);
                                        }
                                    }}
                                >
                                    {stats.icpBreakdown.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={index >= 3 ? '#1b57b1' : index === 2 ? '#3b82f6' : '#e2e8f0'} 
                                            className="transition-all hover:opacity-80"
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-8 flex justify-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
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
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col justify-between group">
        <p className="text-sm text-slate-500 font-medium group-hover:text-[#1b57b1] transition-colors">{title}</p>
        <div className="mt-2 flex items-end justify-between">
            <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
            {trend && (
                <span className={`text-sm font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full ${trendType === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {trend}
                    {trendType === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                </span>
            )}
            {subtitle && <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{subtitle}</span>}
        </div>
    </div>
);
