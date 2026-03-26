import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    TrendingUp,
    Activity,
    CreditCard,
    Users,
    LineChart,
    Loader2,
    Download
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TooltipItem
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import AppContainer from '@/components/layout/AppContainer';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

// Register ChartJS plugins
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface Profile {
    id: string;
    email: string;
    full_name: string;
    plan: string;
    created_at: string;
    role: string;
}

const PLAN_PRICES: Record<string, number> = {
    'Starter': 29,
    'Pro': 99,
    'Enterprise': 299,
};

const RevenueMetrics = () => {
    const { addNotification } = useStore();
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [dateFilter, setDateFilter] = useState<string>('12M');
    
    // Summary Metrics
    const [metrics, setMetrics] = useState({
        mrr: 0,
        mrrChange: 0, // percentage MoM
        arr: 0,
        newMrrThisMonth: 0,
        subscribers: 0
    });

    // Chart data
    const [chartData, setChartData] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (profiles.length > 0) {
            prepareChartData(profiles);
        }
    }, [dateFilter, profiles]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all profiles to calculate revenue dynamically
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, plan, created_at, role')
                .eq('role', 'Member') // Exclude Admins from revenue for accuracy
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const fetchedProfiles = (data || []) as Profile[];
            setProfiles(fetchedProfiles);

            // Process Metrics
            calculateMetrics(fetchedProfiles);
            
            // Process Chart 
            prepareChartData(fetchedProfiles);

        } catch (err) {
            console.error('Error fetching revenue data:', err);
            addNotification({ title: 'Error', message: 'Failed to load revenue metrics', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const calculateMetrics = (allProfiles: Profile[]) => {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        
        let totalMrr = 0;
        let lastMonthTotalMrr = 0;
        let newMrrThisMonth = 0;
        let activeSubscribers = 0;

        allProfiles.forEach(profile => {
            const joinedDate = new Date(profile.created_at);
            const planPrice = PLAN_PRICES[profile.plan || 'Starter'] || 29;
            
            totalMrr += planPrice;
            activeSubscribers++;

            if (joinedDate < currentMonthStart) {
                lastMonthTotalMrr += planPrice;
            }

            if (joinedDate >= currentMonthStart) {
                newMrrThisMonth += planPrice;
            }
        });

        const arr = totalMrr * 12;
        const mrrChange = lastMonthTotalMrr > 0 
            ? ((totalMrr - lastMonthTotalMrr) / lastMonthTotalMrr) * 100 
            : 0;

        setMetrics({
            mrr: totalMrr,
            mrrChange,
            arr,
            newMrrThisMonth,
            subscribers: activeSubscribers
        });
    };

    const prepareChartData = (allProfiles: Profile[]) => {
        const labels: string[] = [];
        const monthKeys: string[] = [];
        
        const now = new Date();
        let monthsCount = 12;

        if (dateFilter === '1M') monthsCount = 1;
        else if (dateFilter === '3M') monthsCount = 3;
        else if (dateFilter === '6M') monthsCount = 6;
        else if (dateFilter === '12M') monthsCount = 12;
        else if (dateFilter === 'Lifetime') {
            const oldest = allProfiles.length > 0 ? new Date(allProfiles[allProfiles.length - 1].created_at) : now;
            const diffMonths = (now.getFullYear() - oldest.getFullYear()) * 12 + (now.getMonth() - oldest.getMonth()) + 1;
            monthsCount = Math.max(12, diffMonths); // At least 12 months for visual scale
        }

        // Generate the trailing months
        // If 1M is selected, add a few extra data points by treating them as weeks? 
        // For simplicity and correctness with MRR, we maintain monthly aggregation but just show fewer points.
        // If monthsCount is 1, a line chart with 1 point looks broken. Minimum 2 points for a line.
        const effectiveMonthsCount = Math.max(2, monthsCount);

        for (let i = effectiveMonthsCount - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' })); // e.g., Jan 24
            monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`);
        }

        const chartDatasets = {
            'Starter': [] as number[],
            'Pro': [] as number[],
            'Enterprise': [] as number[]
        };

        // For cumulative MRR, we just sum profiles created up to the end of that month
        monthKeys.forEach((monthKey) => {
            const [y, m] = monthKey.split('-').map(Number);
            // End of the target month
            const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59);

            let starterMrr = 0;
            let proMrr = 0;
            let enterpriseMrr = 0;

            allProfiles.forEach(p => {
                const joinedDate = new Date(p.created_at);
                if (joinedDate <= endOfMonth) {
                    const planName = p.plan || 'Starter';
                    const price = PLAN_PRICES[planName] || 29;
                    if (planName === 'Enterprise') enterpriseMrr += price;
                    else if (planName === 'Pro') proMrr += price;
                    else starterMrr += price;
                }
            });

            chartDatasets.Starter.push(starterMrr);
            chartDatasets.Pro.push(proMrr);
            chartDatasets.Enterprise.push(enterpriseMrr);
        });

        setChartData({
            labels,
            datasets: [
                {
                    label: 'Enterprise',
                    data: chartDatasets.Enterprise,
                    backgroundColor: 'rgba(124, 58, 237, 0.2)', // Purple
                    borderColor: 'rgb(124, 58, 237)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Pro',
                    data: chartDatasets.Pro,
                    backgroundColor: 'rgba(14, 165, 233, 0.2)', // Sky Blue
                    borderColor: 'rgb(14, 165, 233)',
                    fill: '-1',
                    tension: 0.4
                },
                {
                    label: 'Starter',
                    data: chartDatasets.Starter,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald
                    borderColor: 'rgb(16, 185, 129)',
                    fill: '-1',
                    tension: 0.4
                }
            ]
        });
    };

    const handleExportCSV = () => {
        const headers = ['Signup Date', 'Profile Name', 'Email', 'Plan Tier', 'MRR Contribution'];
        const rows = profiles.map(p => {
            const price = PLAN_PRICES[p.plan || 'Starter'] || 29;
            return [
                `"${new Date(p.created_at).toISOString().split('T')[0]}"`,
                `"${p.full_name || 'Unknown User'}"`,
                `"${p.email}"`,
                `"${p.plan || 'Starter'}"`,
                price
            ].join(',');
        });
        
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `revenue_metrics_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addNotification({ title: 'Success', message: 'Data exported to CSV', type: 'success' });
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Math.abs(val));
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: '#64748b',
                    usePointStyle: true,
                    padding: 20,
                    font: { size: 12, family: "'Inter', sans-serif", weight: 'bold' as const }
                }
            },
            tooltip: {
                backgroundColor: '#fff',
                titleColor: '#1e293b',
                bodyColor: '#64748b',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                titleFont: { size: 13, weight: 'bold' as const },
                bodyFont: { size: 12 },
                callbacks: {
                    label: function(context: TooltipItem<'line'>) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: { color: '#94a3b8', font: { size: 11 } }
            },
            y: {
                stacked: true,
                grid: {
                    color: '#f1f5f9',
                },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 11 },
                    callback: function(value: any) {
                        return '$' + value;
                    }
                }
            }
        }
    };

    return (
        <AppContainer title="Admin: Revenue Metrics">
            <div className="space-y-6 pb-20">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-none flex items-center gap-2">
                            <Activity className="text-[#1b57b1]" size={24} />
                            Revenue Metrics
                        </h1>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Real-time SaaS financial performance and subscriber analytics.</p>
                    </div>

                    {/* Filter & Export Actions */}
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                            {['1M', '3M', '6M', '12M', 'Lifetime'].map(range => (
                                <button
                                    key={range}
                                    onClick={() => setDateFilter(range)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${dateFilter === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={handleExportCSV} 
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                         <Loader2 className="animate-spin text-[#1b57b1]" size={32} />
                    </div>
                ) : (
                    <>
                        {/* Top Metrics Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* MRR */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Monthly MRR</p>
                                    <div className="p-1.5 bg-emerald-50 rounded-lg">
                                        <DollarSign size={16} className="text-emerald-600" />
                                    </div>
                                </div>
                                <div className="flex items-end justify-between">
                                    <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(metrics.mrr)}</h3>
                                </div>
                                <div className="mt-2 text-xs font-semibold">
                                    <span className={metrics.mrrChange >= 0 ? "text-emerald-600" : "text-red-600"}>
                                        {metrics.mrrChange > 0 ? '+' : ''}{metrics.mrrChange.toFixed(1)}% MoM
                                    </span>
                                </div>
                            </div>
                            
                            {/* ARR */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ARR (MRR &times; 12)</p>
                                    <div className="p-1.5 bg-blue-50 rounded-lg">
                                        <LineChart size={16} className="text-blue-600" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(metrics.arr)}</h3>
                            </div>

                            {/* New MRR */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">New MRR (This Month)</p>
                                    <div className="p-1.5 bg-purple-50 rounded-lg">
                                        <TrendingUp size={16} className="text-purple-600" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(metrics.newMrrThisMonth)}</h3>
                            </div>

                            {/* Active Subscribers */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Subscribers</p>
                                    <div className="p-1.5 bg-amber-50 rounded-lg">
                                        <Users size={16} className="text-amber-600" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900">{metrics.subscribers.toLocaleString()}</h3>
                                <div className="mt-2 text-xs text-slate-500 font-medium">
                                    ~{formatCurrency(metrics.subscribers > 0 ? metrics.mrr / metrics.subscribers : 0)} ARPU
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* MRR Growth Chart */}
                            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Activity size={14} className="text-[#1b57b1]" />
                                        MRR Growth ({dateFilter === 'Lifetime' ? 'Lifetime' : `${dateFilter} Months`}, Cumulative)
                                    </h3>
                                </div>
                                <div className="h-[350px]">
                                    {chartData && <Line data={chartData} options={chartOptions} />}
                                </div>
                            </div>

                            {/* Recent Subscribers List */}
                            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col max-h-[460px]">
                                <div className="flex justify-between items-center mb-6 shrink-0">
                                    <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <CreditCard size={14} className="text-[#1b57b1]" />
                                        Recent Subscribers
                                    </h3>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="space-y-4">
                                        {profiles.slice(0, 20).map(profile => {
                                            const tierPrice = PLAN_PRICES[profile.plan || 'Starter'] || 29;
                                            return (
                                                <div key={profile.id} className="flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-bold border border-slate-100 text-[#1b57b1] uppercase shrink-0">
                                                            {profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U'}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <p className="text-xs font-bold text-slate-900 leading-none mb-1 line-clamp-1">
                                                                {profile.full_name || 'Unknown User'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 font-medium">
                                                                {new Date(profile.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xs font-bold text-slate-900">
                                                            {formatCurrency(tierPrice)}
                                                        </p>
                                                        <p className={`text-[9px] uppercase tracking-wider font-bold mt-0.5 ${
                                                            profile.plan === 'Enterprise' ? 'text-purple-600' :
                                                            profile.plan === 'Pro' ? 'text-sky-600' :
                                                            'text-emerald-600'
                                                        }`}>
                                                            {profile.plan || 'Starter'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {profiles.length === 0 && (
                                            <div className="text-center py-10 text-slate-500 text-xs font-medium">
                                                No profiles found.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(241, 245, 249, 1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(203, 213, 225, 1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(148, 163, 184, 1);
                }
            `}} />
        </AppContainer>
    );
};

export default RevenueMetrics;
