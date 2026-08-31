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
            const rangeDays = dateRange === '7d' ? 7 : (dateRange === '90d' ? 90 : 30);
            const fetchDays = Math.max(60, rangeDays);
            
            const startDate = new Date();
            startDate.setDate(now.getDate() - fetchDays);
            startDate.setHours(0, 0, 0, 0);

            // Fetch activity from leads, campaigns, and emails in parallel
            const [
                { data: leadsActivity },
                { data: campaignsActivity },
                { data: emailsActivity },
                { data: profileStats },
                { data: usersWithLeads }
            ] = await Promise.all([
                supabase
                    .from('leads')
                    .select('user_id, created_at')
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', now.toISOString()),
                supabase
                    .from('campaigns')
                    .select('user_id, created_at')
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', now.toISOString()),
                supabase
                    .from('email_logs')
                    .select('user_id, sent_at')
                    .gte('sent_at', startDate.toISOString())
                    .lte('sent_at', now.toISOString()),
                supabase
                    .from('profiles')
                    .select('plan'),
                supabase
                    .from('profiles')
                    .select('id, full_name, email, plan, credits, max_credits, leads(count)')
            ]);

            // Map activities to days
            const dateMap: { [key: string]: Set<string> } = {};
            const dateArray: string[] = [];

            // Initialize all dates in the fetch range
            const current = new Date(startDate);
            while (current <= now) {
                const key = current.toISOString().split('T')[0];
                if (!dateMap[key]) {
                    dateMap[key] = new Set<string>();
                    dateArray.push(key);
                }
                current.setDate(current.getDate() + 1);
            }

            const getDayKey = (isoString: string) => isoString.split('T')[0];

            leadsActivity?.forEach(item => {
                const key = getDayKey(item.created_at);
                if (dateMap[key]) dateMap[key].add(item.user_id);
            });

            campaignsActivity?.forEach(item => {
                const key = getDayKey(item.created_at);
                if (dateMap[key]) dateMap[key].add(item.user_id);
            });

            emailsActivity?.forEach(item => {
                const key = getDayKey(item.sent_at);
                if (dateMap[key]) dateMap[key].add(item.user_id);
            });

            // 1. Calculate Stats
            const todayKey = now.toISOString().split('T')[0];
            const currentDau = dateMap[todayKey]?.size || 0;

            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const yesterdayKey = yesterday.toISOString().split('T')[0];
            const yesterdayDau = dateMap[yesterdayKey]?.size || 0;

            let dauTrend = '0%';
            if (yesterdayDau > 0) {
                const diff = ((currentDau - yesterdayDau) / yesterdayDau) * 100;
                dauTrend = (diff >= 0 ? '+' : '') + Math.round(diff) + '%';
            } else if (currentDau > 0) {
                dauTrend = '+' + (currentDau * 100) + '%';
            }

            // MAU helper
            const getUniqueUsersInRange = (daysFrom: number, daysTo: number) => {
                const userSet = new Set<string>();
                for (let i = daysFrom; i <= daysTo; i++) {
                    const d = new Date(now);
                    d.setDate(now.getDate() - i);
                    const key = d.toISOString().split('T')[0];
                    if (dateMap[key]) {
                        dateMap[key].forEach(uid => userSet.add(uid));
                    }
                }
                return userSet.size;
            };

            const currentMau = getUniqueUsersInRange(0, 29);
            const previousMau = getUniqueUsersInRange(30, 59);

            let mauTrend = '0%';
            if (previousMau > 0) {
                const diff = ((currentMau - previousMau) / previousMau) * 100;
                mauTrend = (diff >= 0 ? '+' : '') + Math.round(diff) + '%';
            } else if (currentMau > 0) {
                mauTrend = '+' + (currentMau * 100) + '%';
            }

            const currentStickiness = currentMau > 0 ? (currentDau / currentMau) * 100 : 0;
            const yesterdayMau = getUniqueUsersInRange(1, 30);
            const yesterdayStickiness = yesterdayMau > 0 ? (yesterdayDau / yesterdayMau) * 100 : 0;

            let stickinessTrend = '0%';
            if (yesterdayStickiness > 0) {
                const diff = currentStickiness - yesterdayStickiness;
                stickinessTrend = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
            } else if (currentStickiness > 0) {
                stickinessTrend = '+' + currentStickiness.toFixed(1) + '%';
            }

            setStats({
                dau: currentDau,
                mau: currentMau,
                stickiness: Number(currentStickiness.toFixed(1)),
                dauTrend,
                mauTrend,
                stickinessTrend
            });

            // 2. Fetch Plan Distribution
            const plans = { Starter: 0, Pro: 0, Enterprise: 0 };
            profileStats?.forEach(p => {
                const plan = (p.plan || 'Starter') as keyof typeof plans;
                if (plans[plan] !== undefined) plans[plan]++;
            });

            const totalUsers = Object.values(plans).reduce((a, b) => a + b, 0);

            setPlanData({
                labels: Object.keys(plans),
                datasets: [{
                    data: Object.values(plans),
                    backgroundColor: ['#1b57b1', '#0ea5e9', '#06b6d4'],
                    borderWidth: 0,
                }],
                totalUsers
            });

            // 3. Fetch Feature Usage
            const rangeStartDate = new Date();
            rangeStartDate.setDate(now.getDate() - rangeDays);
            rangeStartDate.setHours(0, 0, 0, 0);

            const leadsCount = leadsActivity?.filter(item => new Date(item.created_at) >= rangeStartDate).length || 0;
            const campaignsCount = campaignsActivity?.filter(item => new Date(item.created_at) >= rangeStartDate).length || 0;
            const emailsCount = emailsActivity?.filter(item => new Date(item.sent_at) >= rangeStartDate).length || 0;

            setFeatureData({
                labels: ['Scraper', 'Campaigns', 'Emails'],
                datasets: [{
                    label: 'Total Actions',
                    data: [leadsCount, campaignsCount, emailsCount],
                    backgroundColor: 'rgba(27, 87, 177, 0.8)',
                    borderRadius: 8,
                }]
            });

            // 4. Line Chart: DAU over selected period
            const chartLabels: string[] = [];
            const chartDataPoints: number[] = [];
            for (let i = rangeDays - 1; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(now.getDate() - i);
                const key = d.toISOString().split('T')[0];
                chartLabels.push(d.toLocaleDateString('default', { month: 'short', day: 'numeric' }));
                chartDataPoints.push(dateMap[key]?.size || 0);
            }

            setChartData({
                labels: chartLabels,
                datasets: [{
                    fill: true,
                    label: 'Active Users',
                    data: chartDataPoints,
                    borderColor: '#1b57b1',
                    backgroundColor: 'rgba(27, 87, 177, 0.1)',
                    tension: 0.4,
                }]
            });

            // 5. Top Users
            const processedUsers = usersWithLeads?.map(u => ({
                id: u.id,
                name: u.full_name || 'Unnamed',
                email: u.email,
                plan: u.plan || 'Starter',
                credits: u.credits || 0,
                maxCredits: u.max_credits || 20,
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
                                    <span className="text-2xl font-bold text-slate-900">{planData?.totalUsers || 0}</span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center px-10">Total Users</span>
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
                                        <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Credit Usage</th>
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
                                                            style={{ width: `${Math.min((user.credits / user.maxCredits) * 100, 100)}%` }}
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
