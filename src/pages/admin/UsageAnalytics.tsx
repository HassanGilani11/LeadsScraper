import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    Users,
    Activity,
    Smartphone,
    MousePointer2,
    Calendar,
    ChevronDown,
    Zap,
    TrendingUp,
    Filter,
    Clock,
    LayoutDashboard,
    Loader2
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import AppContainer from '@/components/layout/AppContainer';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const UsageAnalytics = () => {
    const { addNotification } = useStore();
    const [dateRange, setDateRange] = useState('30d');
    const [loading, setLoading] = useState(true);
    
    // Data States
    const [stats, setStats] = useState({
        dau: 0,
        mau: 0,
        stickiness: 0,
        dauTrend: '+0%',
        mauTrend: '+0%',
        stickinessTrend: '+0%'
    });
    const [chartData, setChartData] = useState<any>(null);
    const [featureData, setFeatureData] = useState<any>(null);
    const [planData, setPlanData] = useState<any>(null);
    const [topUsers, setTopUsers] = useState<any[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            
            // 1. Fetch Stats (DAU/MAU estimated from leads created)
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            
            const { data: dauResult } = await supabase
                .from('leads')
                .select('user_id', { count: 'exact' })
                .gte('created_at', today);
            
            const { data: mauResult } = await supabase
                .from('leads')
                .select('user_id', { count: 'exact' })
                .gte('created_at', thirtyDaysAgo);
                
            const uniqueDau = new Set(dauResult?.map(l => l.user_id)).size;
            const uniqueMau = new Set(mauResult?.map(l => l.user_id)).size;
            const stickiness = uniqueMau > 0 ? ((uniqueDau / uniqueMau) * 100).toFixed(1) : 0;

            setStats({
                dau: uniqueDau,
                mau: uniqueMau,
                stickiness: Number(stickiness),
                dauTrend: '+12%', // Mocked trend
                mauTrend: '+5%',
                stickinessTrend: '+2%'
            });

            // 2. Fetch Plan Distribution
            const { data: profileStats } = await supabase
                .from('profiles')
                .select('plan');
            
            const plans = { Starter: 0, Pro: 0, Enterprise: 0 };
            profileStats?.forEach(p => {
                const plan = (p.plan || 'Starter') as keyof typeof plans;
                if (plans[plan] !== undefined) plans[plan]++;
            });

            setPlanData({
                labels: Object.keys(plans),
                datasets: [{
                    data: Object.values(plans),
                    backgroundColor: ['#1b57b1', '#0ea5e9', '#06b6d4'],
                    borderWidth: 0,
                }]
            });

            // 3. Fetch Feature Usage
            const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
            const { count: campaignsCount } = await supabase.from('campaigns').select('*', { count: 'exact', head: true });
            const { count: emailsCount } = await supabase.from('email_logs').select('*', { count: 'exact', head: true });

            setFeatureData({
                labels: ['Scraper', 'Campaigns', 'Emails'],
                datasets: [{
                    label: 'Total Actions',
                    data: [leadsCount || 0, campaignsCount || 0, emailsCount || 0],
                    backgroundColor: 'rgba(27, 87, 177, 0.8)',
                    borderRadius: 8,
                }]
            });

            // 4. DAU Chart (Mocking past 7 days based on current data for visualization)
            // In a real app, this would be a complex group-by query or a dedicated analytics table.
            setChartData({
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    fill: true,
                    label: 'Active Users',
                    data: [uniqueDau + 5, uniqueDau + 2, uniqueDau + 8, uniqueDau + 4, uniqueDau + 10, uniqueDau + 15, uniqueDau],
                    borderColor: '#1b57b1',
                    backgroundColor: 'rgba(27, 87, 177, 0.1)',
                    tension: 0.4,
                }]
            });

            // 5. Top Users
            const { data: usersWithLeads } = await supabase
                .from('profiles')
                .select('id, full_name, email, plan, leads(count)');
            
            const processedUsers = usersWithLeads?.map(u => ({
                id: u.id,
                name: u.full_name || 'Unnamed',
                email: u.email,
                plan: u.plan || 'Starter',
                runs: u.leads?.[0]?.count || 0
            })).sort((a, b) => b.runs - a.runs).slice(0, 10);

            setTopUsers(processedUsers || []);

        } catch (err) {
            console.error('Error fetching analytics:', err);
            addNotification({ title: 'Error', message: 'Failed to fetch usage data', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Chart Options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#fff',
                titleColor: '#1e293b',
                bodyColor: '#64748b',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                titleFont: { weight: 'bold' as const }
            },
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
            y: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: { color: '#64748b', usePointStyle: true, padding: 20, font: { size: 11, weight: 'bold' as const } },
            },
        },
    };

    return (
        <AppContainer title="Admin: Usage Analytics">
            <div className="space-y-6 pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-none">Product Usage Analytics</h1>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Real-time performance metrics and user behavior.</p>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                        {['7d', '30d', '90d'].map(range => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${dateRange === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Daily Active Users', value: stats.dau, change: stats.dauTrend, icon: <Users className="text-[#1b57b1]" /> },
                        { label: 'Monthly Active Users', value: stats.mau, change: stats.mauTrend, icon: <LayoutDashboard className="text-emerald-600" /> },
                        { label: 'Stickiness (DAU/MAU)', value: `${stats.stickiness}%`, change: stats.stickinessTrend, icon: <Zap className="text-amber-600" /> },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{stat.label}</p>
                                <div className="p-1.5 bg-slate-50 rounded-lg">
                                    {stat.icon}
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <h3 className="text-3xl font-bold text-slate-900">{stat.value.toLocaleString()}</h3>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{stat.change}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Engagement Chart */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={14} className="text-[#1b57b1]" />
                                DAU Over Selected Period
                            </h3>
                            <button className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all">
                                <Filter size={16} />
                            </button>
                        </div>
                        <div className="h-[300px] w-full relative">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50"><Loader2 className="animate-spin text-[#1b57b1]" /></div>
                            ) : chartData && <Line data={chartData} options={chartOptions} />}
                        </div>
                    </div>

                    {/* Plan Distribution */}
                    <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                        <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                            <MousePointer2 size={14} className="text-[#1b57b1]" />
                            Plan Distribution
                        </h3>
                        <div className="h-[220px] relative">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50"><Loader2 className="animate-spin text-[#1b57b1]" /></div>
                            ) : planData && <Doughnut data={planData} options={doughnutOptions} />}
                            {!loading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
                                    <span className="text-2xl font-bold text-slate-900">100%</span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center px-10">Market Share</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Feature Adoption */}
                    <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                        <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                            <Zap size={14} className="text-[#1b57b1]" />
                            Feature Adoption
                        </h3>
                        <div className="h-[300px]">
                            {loading ? (
                                <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-[#1b57b1]" /></div>
                            ) : featureData && <Bar data={featureData} options={chartOptions} />}
                        </div>
                    </div>

                    {/* Top Users Table */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Smartphone size={14} className="text-[#1b57b1]" />
                                Top 10 Most Active Users
                            </h3>
                            <button className="text-[10px] font-bold text-[#1b57b1] hover:underline uppercase tracking-tighter">View Detailed List</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Profile</th>
                                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Plan</th>
                                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Activity</th>
                                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Stickiness</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin text-[#1b57b1] mx-auto" /></td></tr>
                                    ) : topUsers.map((user, idx) => (
                                        <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-bold border border-slate-100 text-[#1b57b1] uppercase">
                                                        {user.name.split(' ').map((n: string) => n[0]).join('')}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-900 leading-none mb-1">{user.name}</span>
                                                        <span className="text-[10px] text-slate-500 font-medium">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                    user.plan === 'Enterprise' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                    user.plan === 'Pro' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-slate-50 text-slate-500 border-slate-100'
                                                }`}>
                                                    {user.plan}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <span className="text-xs font-bold text-slate-900">{user.runs.toLocaleString()} runs</span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <div className="flex justify-end">
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                        <div 
                                                            className="h-full bg-[#1b57b1] transition-all duration-1000 ease-out" 
                                                            style={{ width: `${Math.min((user.runs / 100) * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AppContainer>
    );
};

export default UsageAnalytics;
