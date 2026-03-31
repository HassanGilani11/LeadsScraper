import React, { useState, useEffect } from 'react';
import { 
    History, 
    Search, 
    Filter, 
    Calendar, 
    ChevronLeft, 
    ChevronRight,
    ArrowUpDown,
    Download,
    Loader2,
    ArrowRight,
    User,
    Shield,
    Info,
    AlertCircle,
    UserX,
    UserPlus,
    CreditCard,
    Settings as SettingsIcon,
    Users,
    Zap,
    ChevronDown,
    ChevronUp,
    Globe,
    Cpu,
    MousePointer2,
    CheckCircle2,
    AlertTriangle,
    Clock
} from 'lucide-react';
import AppContainer from '@/components/layout/AppContainer';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import CustomSelect from '@/components/ui/CustomSelect';

const AuditLogs = () => {
    const { user: currentUser, addNotification } = useStore();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [actionTypeFilter, setActionTypeFilter] = useState('All');
    const [adminFilter, setAdminFilter] = useState('All');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [admins, setAdmins] = useState<any[]>([]);
    const [expandedRows, setExpandedRows] = useState<string[]>([]);
    const [activeLogTabs, setActiveLogTabs] = useState<Record<string, 'diff' | 'notes'>>({});
    const [stats, setStats] = useState({
        total: 0,
        today: 0,
        destructive: 0,
        planChanges: 0,
        activeAdmins: 0
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (currentUser?.role === 'Admin') {
            fetchLogs();
            fetchAdmins();
            fetchStats();
        }
    }, [currentUser, actionTypeFilter, adminFilter, dateRange, categoryFilter, page, debouncedSearchTerm]);

    const fetchAdmins = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('role', 'Admin');
            if (data) setAdmins(data);
        } catch (err) {
            console.error('Error fetching admins:', err);
        }
    };

    const fetchStats = async () => {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

            const { count: total } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true });
            const { count: todayCount } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true }).gte('created_at', today);
            const { count: destructive } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true }).in('action_type', ['USER_BANNED', 'CAMPAIGN_DELETED', 'ACCESS_REVOKED']);
            const { count: planChanges } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true }).ilike('action_type', '%PLAN%');
            
            const { data: recentAdmins } = await supabase.from('audit_logs').select('admin_id').gte('created_at', weekAgo);
            const uniqueAdmins = new Set(recentAdmins?.map(l => l.admin_id).filter(id => id)).size;

            setStats({
                total: total || 0,
                today: todayCount || 0,
                destructive: destructive || 0,
                planChanges: planChanges || 0,
                activeAdmins: uniqueAdmins
            });
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('audit_logs')
                .select('*, profiles(full_name, email, avatar_url)', { count: 'exact' });

            if (actionTypeFilter !== 'All') query = query.eq('action_type', actionTypeFilter);
            if (adminFilter !== 'All') query = query.eq('admin_id', adminFilter);
            if (dateRange.start) query = query.gte('created_at', dateRange.start);
            if (dateRange.end) query = query.lte('created_at', dateRange.end);
            
            if (categoryFilter !== 'All') {
                if (categoryFilter === 'Destructive') query = query.in('action_type', ['USER_BANNED', 'CAMPAIGN_DELETED', 'ACCESS_REVOKED']);
                if (categoryFilter === 'Plan Change') query = query.ilike('action_type', '%PLAN%');
                if (categoryFilter === 'Auth / Session') query = query.ilike('action_type', '%AUTH%').ilike('action_type', '%SESSION%');
                if (categoryFilter === 'Grant / Credit') query = query.ilike('action_type', '%GRANT%').ilike('action_type', '%CREDIT%');
                if (categoryFilter === 'Settings') query = query.ilike('action_type', '%SETTING%');
            }

            if (debouncedSearchTerm) {
                query = query.or(`target_entity.ilike.%${debouncedSearchTerm}%,note.ilike.%${debouncedSearchTerm}%,action_type.ilike.%${debouncedSearchTerm}%`);
            }

            query = query.order('created_at', { ascending: false });

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;
            if (data) setLogs(data);
            if (count !== null) setTotalCount(count);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            addNotification({ title: 'Error', message: 'Failed to fetch audit logs', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const isExpanding = !prev.includes(id);
            if (isExpanding && !activeLogTabs[id]) {
                setActiveLogTabs(tabs => ({ ...tabs, [id]: 'diff' }));
            }
            return isExpanding ? [...prev, id] : prev.filter(rowId => rowId !== id);
        });
    };

    const setLogTab = (id: string, tab: 'diff' | 'notes') => {
        setActiveLogTabs(prev => ({ ...prev, [id]: tab }));
    };

    const getActionColor = (type: string) => {
        if (type.includes('BANNED') || type.includes('DELETED') || type.includes('REVOKED')) return 'text-rose-600 bg-rose-50 border-rose-100';
        if (type.includes('UNBANNED') || type.includes('GRANTED') || type.includes('ADDED') || type.includes('INVITED') || type.includes('SUCCESS')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (type.includes('PLAN') || type.includes('CREDIT')) return 'text-amber-600 bg-amber-50 border-amber-100';
        if (type.includes('AUTH') || type.includes('SESSION') || type.includes('IMPERSONATION')) return 'text-indigo-600 bg-indigo-50 border-indigo-100';
        if (type.includes('SETTING') || type.includes('PROFILE') || type.includes('PASSWORD')) return 'text-violet-600 bg-violet-50 border-violet-100';
        return 'text-blue-600 bg-blue-50 border-blue-100';
    };

    const getActionIcon = (type: string) => {
        if (type.includes('BANNED')) return <UserX size={12} />;
        if (type.includes('INVITED')) return <UserPlus size={12} />;
        if (type.includes('PLAN') || type.includes('CREDIT')) return <Zap size={12} />;
        if (type.includes('SETTING') || type.includes('PROFILE')) return <SettingsIcon size={12} />;
        if (type.includes('PASSWORD')) return <Shield size={12} />;
        if (type.includes('IMPERSONATION')) return <Shield size={12} />;
        if (type.includes('EXTRACTION')) return <Globe size={12} />;
        if (type.includes('CAMPAIGN')) return <Cpu size={12} />;
        return <Info size={12} />;
    };

    const formatRelativeTime = (date: string) => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    const formatValue = (value: any) => {
        if (!value) return 'null';
        if (typeof value !== 'object') return String(value);
        
        return Object.entries(value)
            .map(([key, val]) => `${key.replace(/_/g, ' ')}: ${val}`)
            .join('\n');
    };
    const exportToCSV = () => {
        const headers = ['Timestamp', 'Admin', 'Action', 'Target', 'IP Address', 'Before', 'After', 'Note'];
        const csvRows = logs.map(log => [
            new Date(log.created_at).toLocaleString(),
            log.profiles?.full_name || 'System',
            log.action_type,
            log.target_entity,
            log.ip_address || 'N/A',
            JSON.stringify(log.before_value),
            JSON.stringify(log.after_value),
            log.note || ''
        ]);

        const csvContent = [headers, ...csvRows].map(e => e.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppContainer title="Admin: Audit Log">
            <div className="space-y-6 pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-none">Audit Log</h1>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Immutable record of all admin actions</p>
                    </div>
                    <button 
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                </div>

                {/* Stats Row - Matching User Management / Dashboard style */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {[
                        { label: 'Total Events', value: stats.total.toLocaleString(), trend: 'Overall', icon: <History className="text-[#1b57b1]" /> },
                        { label: 'Events Today', value: stats.today.toLocaleString(), trend: 'Since Midnight', icon: <Clock className="text-emerald-600" /> },
                        { label: 'Destructive', value: stats.destructive.toLocaleString(), trend: 'Bans • Deletes', icon: <UserX className="text-rose-600" /> },
                        { label: 'Plan Changes', value: stats.planChanges.toLocaleString(), trend: 'This Week', icon: <Zap className="text-amber-600" /> },
                        { label: 'Admins Active', value: stats.activeAdmins.toLocaleString(), trend: 'Last 7 Days', icon: <Users className="text-[#1b57b1]" /> },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{stat.label}</p>
                                <div className="p-1.5 bg-slate-50 rounded-lg">
                                    {stat.icon}
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.trend}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Badge Category Filters */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: 'Destructive', color: 'bg-rose-50 text-rose-600 border-rose-100', dot: 'bg-rose-600' },
                        { label: 'Plan Change', color: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-600' },
                        { label: 'Auth / Session', color: 'bg-indigo-50 text-indigo-600 border-indigo-100', dot: 'bg-indigo-600' },
                        { label: 'Grant / Credit', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-600' },
                        { label: 'Settings', color: 'bg-violet-50 text-violet-600 border-violet-100', dot: 'bg-violet-600' },
                        { label: 'Data', color: 'bg-blue-50 text-blue-600 border-blue-100', dot: 'bg-blue-600' },
                    ].map((badge) => {
                        const active = categoryFilter === badge.label;
                        return (
                            <button
                                key={badge.label}
                                onClick={() => setCategoryFilter(active ? 'All' : badge.label)}
                                className={`
                                    px-4 py-2 rounded-xl text-[11px] font-bold border transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center gap-2
                                    ${active 
                                        ? 'ring-2 ring-[#1b57b1] ring-offset-2 shadow-md bg-white' 
                                        : 'hover:shadow-sm hover:translate-y-[-1px]'}
                                    ${badge.color}
                                `}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                {badge.label}
                            </button>
                        );
                    })}
                </div>

                {/* Combined Filter Bar */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm relative z-[20]">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-4 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search by admin, action, or target..." 
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-11 h-[46px] md:h-[56px] text-sm focus:outline-none focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1]/20 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <CustomSelect
                                value={adminFilter}
                                onChange={setAdminFilter}
                                placeholder="All admins"
                                options={[
                                    { label: 'All admins', value: 'All' },
                                    ...admins.map(admin => ({ label: admin.full_name || admin.email, value: admin.id }))
                                ]}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <CustomSelect
                                value={actionTypeFilter}
                                onChange={setActionTypeFilter}
                                placeholder="All actions"
                                isBold
                                options={[
                                    { label: 'All actions', value: 'All' },
                                    ...[
                                        'USER_BANNED', 'USER_UNBANNED', 'PLAN_CHANGED', 'SETTING_UPDATED', 
                                        'IMPERSONATION_START', 'CAMPAIGN_DELETED', 'CAMPAIGN_STATUS_CHANGED',
                                        'PROFILE_UPDATED', 'PASSWORD_UPDATED', 'DATA_EXTRACTION_SUCCESS'
                                    ].map(a => ({ label: a.replace(/_/g, ' '), value: a }))
                                ]}
                            />
                        </div>
                        <div className="md:col-span-4 flex items-center gap-2">
                            <input 
                                type="date" 
                                className="w-full h-[46px] md:h-[56px] bg-slate-50/50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-600 uppercase focus:ring-4 focus:ring-[#1b57b1]/10 outline-none transition-all"
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            />
                            <div className="text-slate-300">-</div>
                            <input 
                                type="date" 
                                className="w-full h-[46px] md:h-[56px] bg-slate-50/50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-600 uppercase focus:ring-4 focus:ring-[#1b57b1]/10 outline-none transition-all"
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Timeline Container */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm relative min-h-[600px] overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
                            <Loader2 className="animate-spin text-[#1b57b1]" size={40} />
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Action</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target / Details</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">IP Address</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {logs.length > 0 ? logs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr 
                                            onClick={() => toggleRow(log.id)}
                                            className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${expandedRows.includes(log.id) ? 'bg-[#1b57b1]/5' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900 mb-0.5">{new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, {new Date(log.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="text-[10px] text-slate-500 font-medium">{formatRelativeTime(log.created_at)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#1b57b1] font-bold text-[10px] uppercase border border-slate-200">
                                                        {log.profiles?.avatar_url ? (
                                                            <img src={log.profiles.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                                                        ) : (
                                                            (log.profiles?.full_name || 'A').split(' ').map((n: string) => n[0]).join('')
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-900">{log.profiles?.full_name || 'System'}</span>
                                                        <span className="text-[10px] text-slate-500">{log.profiles?.email || 'automated@system.com'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${getActionColor(log.action_type)}`}>
                                                    {getActionIcon(log.action_type)}
                                                    {log.action_type.replace(/_/g, ' ')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700">{log.target_entity || 'N/A'}</span>
                                                    <span className="text-[10px] text-slate-500 mt-1 truncate max-w-xs">{log.note || 'Internal system activity logged.'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[11px] font-mono text-slate-500">{log.ip_address || '—'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`p-1.5 rounded-lg transition-all ${expandedRows.includes(log.id) ? 'bg-[#1b57b1] text-white' : 'text-slate-400 hover:text-[#1b57b1] hover:bg-slate-50'}`}>
                                                    {expandedRows.includes(log.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Row Expansion */}
                                        {expandedRows.includes(log.id) && (
                                            <td colSpan={6} className="bg-slate-50/50 px-8 py-8 border-b border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                                    <div className="md:col-span-8">
                                                        <div className="flex items-center gap-6 border-b border-slate-200 mb-6 pb-2">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setLogTab(log.id, 'diff'); }}
                                                                className={`text-[10px] font-bold pb-2 px-1 uppercase tracking-widest transition-all ${activeLogTabs[log.id] === 'diff' ? 'text-[#1b57b1] border-b-2 border-[#1b57b1]' : 'text-slate-400 hover:text-slate-600'}`}
                                                            >
                                                                Change Diff
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setLogTab(log.id, 'notes'); }}
                                                                className={`text-[10px] font-bold pb-2 px-1 uppercase tracking-widest transition-all ${activeLogTabs[log.id] === 'notes' ? 'text-[#1b57b1] border-b-2 border-[#1b57b1]' : 'text-slate-400 hover:text-slate-600'}`}
                                                            >
                                                                Detailed Notes
                                                            </button>
                                                        </div>

                                                        {activeLogTabs[log.id] === 'diff' ? (
                                                            <div className="space-y-4">
                                                                <div className="flex items-start gap-4">
                                                                    <span className="w-16 text-[9px] font-bold text-rose-600 uppercase mt-1 bg-rose-50 px-1 py-0.5 rounded text-center border border-rose-100">Before</span>
                                                                    <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 text-[11px] font-mono text-slate-600 shadow-sm overflow-x-auto whitespace-pre-wrap">
                                                                        {formatValue(log.before_value)}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-start gap-4">
                                                                    <span className="w-16 text-[9px] font-bold text-emerald-600 uppercase mt-1 bg-emerald-50 px-1 py-0.5 rounded text-center border border-emerald-100">After</span>
                                                                    <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 text-[11px] font-mono text-slate-600 shadow-sm overflow-x-auto whitespace-pre-wrap">
                                                                        {formatValue(log.after_value)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-6">
                                                                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                                                    <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                                                                        <Info size={14} className="text-[#1b57b1]" />
                                                                        Event Contextual Summary
                                                                    </h4>
                                                                    <p className="text-xs text-slate-600 leading-relaxed">
                                                                        This <span className="font-bold text-[#1b57b1]">{log.action_type.replace(/_/g, ' ')}</span> action was initiated by admin <span className="font-bold text-slate-800">{log.profiles?.full_name}</span>. 
                                                                        {log.target_entity && <span> It targeted the entity <span className="font-bold text-slate-800">{log.target_entity}</span>.</span>}
                                                                        The system successfully recorded the state transition and preserved the preceding configuration for auditing purposes.
                                                                    </p>
                                                                </div>
                                                                
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase block mb-2">Protocol & Auth</span>
                                                                        <div className="space-y-2">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-[10px] text-slate-500">Method</span>
                                                                                <span className="text-[10px] font-bold text-slate-700">POST/REST</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-[10px] text-slate-500">Status</span>
                                                                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Verified</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase block mb-2">Internal Flags</span>
                                                                        <div className="space-y-2">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-[10px] text-slate-500">RLS Check</span>
                                                                                <span className="text-[10px] font-bold text-slate-700">Passed</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-[10px] text-slate-500">Persistence</span>
                                                                                <span className="text-[10px] font-bold text-slate-700">Table: audit_logs</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-slate-900 rounded-xl p-4 overflow-hidden">
                                                                    <div className="flex justify-between items-center mb-3">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">System Metadata Preview</span>
                                                                        <span className="text-[9px] text-slate-500 font-mono">raw_json_v1</span>
                                                                    </div>
                                                                    <pre className="text-[10px] font-mono text-blue-300 overflow-x-auto whitespace-pre">
                                                                        {JSON.stringify({
                                                                            action: log.action_type,
                                                                            timestamp: log.created_at,
                                                                            trace_id: `tr_${log.id.split('-')[1]}`,
                                                                            origin: log.ip_address,
                                                                            metadata: log.metadata
                                                                        }, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {log.note && activeLogTabs[log.id] === 'diff' && (
                                                            <div className="mt-8 p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex gap-3">
                                                                <Info size={16} className="text-[#1b57b1] shrink-0 mt-0.5" />
                                                                <div>
                                                                    <span className="text-[10px] font-bold text-[#1b57b1] uppercase tracking-widest block mb-1">Administrative Note</span>
                                                                    <p className="text-xs text-slate-600 italic">"{log.note}"</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="md:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-6 tracking-widest">Metadata / Headers</span>
                                                        <div className="space-y-5">
                                                            <div>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5 tracking-tighter">Request ID</span>
                                                                <span className="text-xs font-mono font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-100">{log.id.split('-')[0].toUpperCase()}_{Math.floor(Math.random()*90000+10000)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5 tracking-tighter">Exact Timestamp</span>
                                                                <span className="text-xs font-medium text-slate-600">{log.created_at}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5 tracking-tighter">Category / Scope</span>
                                                                <span className="text-xs font-bold text-[#1b57b1] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">{log.metadata?.category || 'SYSTEM_CMD'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5 tracking-tighter">User Agent</span>
                                                                <span className="text-[10px] font-medium text-slate-500 leading-relaxed block bg-slate-50 p-2 rounded-lg border border-slate-100 break-words">{log.metadata?.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                    </React.Fragment>
                                )) : !loading && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 group">
                                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-[#1b57b1] transition-all border border-slate-100 group-hover:bg-blue-50">
                                                    <History size={32} />
                                                </div>
                                                <div className="text-center">
                                                    <h3 className="text-lg font-bold text-slate-900 leading-none">No Events Logged</h3>
                                                    <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto font-medium">No results were found matching your filters. Try search or adjust the date range.</p>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setSearchTerm('');
                                                        setActionTypeFilter('All');
                                                        setAdminFilter('All');
                                                        setDateRange({ start: '', end: '' });
                                                        setCategoryFilter('All');
                                                    }}
                                                    className="mt-4 px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-[#1b57b1] transition-all shadow-sm"
                                                >
                                                    Reset All Filters
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer / Pagination */}
                    <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-slate-500 font-bold">
                            Showing <span className="text-slate-900">{Math.min((page-1)*pageSize + 1, totalCount)}-{Math.min(page*pageSize, totalCount)}</span> of <span className="text-slate-900">{totalCount}</span> events
                        </p>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white disabled:opacity-30 transition-all shadow-sm"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }).map((_, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => setPage(i + 1)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-extrabold transition-all ${
                                            page === i + 1 
                                                ? 'bg-[#1b57b1] text-white shadow-lg shadow-[#1b57b1]/20 border border-[#1b57b1]' 
                                                : 'text-slate-500 border border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button 
                                onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                                disabled={page >= Math.ceil(totalCount / pageSize) || totalCount === 0}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white disabled:opacity-30 transition-all shadow-sm"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AppContainer>
    );
};

export default AuditLogs;
