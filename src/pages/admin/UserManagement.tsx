import React, { useState, useEffect } from 'react';
import { 
    Users, 
    UserCheck, 
    UserPlus, 
    UserMinus, 
    Search, 
    MoreVertical, 
    Eye, 
    UserCog, 
    Ban, 
    ChevronLeft, 
    ChevronRight,
    ArrowUpDown,
    Download,
    Trash2,
    Loader2
} from 'lucide-react';
import AppContainer from '@/components/layout/AppContainer';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';

const UserManagement = () => {
    const { user: currentUser, addNotification } = useStore();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState('All');
    const [planFilter, setPlanFilter] = useState('All');
    const [timeTab, setTimeTab] = useState('All');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    
    // UI States
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [isImpersonateModalOpen, setIsImpersonateModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [banReason, setBanReason] = useState('');
    const [inviteData, setInviteData] = useState({
        fullName: '',
        email: '',
        plan: 'Starter',
        status: 'Pending'
    });
    const [inviteError, setInviteError] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        premium: 0,
        banned: 0
    });

    useEffect(() => {
        if (currentUser?.role === 'Admin') {
            fetchUsers();
        }
    }, [currentUser, statusFilter, planFilter, timeTab, sortBy, page]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('*, leads(count)', { count: 'exact' });

            // Filtering
            if (statusFilter !== 'All') {
                query = query.eq('status', statusFilter);
            }
            if (planFilter !== 'All') {
                query = query.eq('plan', planFilter);
            }

            // Time Filtering
            if (timeTab === 'Today') {
                const today = new Date();
                today.setHours(0,0,0,0);
                query = query.gte('created_at', today.toISOString());
            } else if (timeTab === 'Week') {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                query = query.gte('created_at', weekAgo.toISOString());
            }

            // Sorting
            if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
            else if (sortBy === 'oldest') query = query.order('created_at', { ascending: true });
            else if (sortBy === 'name') query = query.order('full_name', { ascending: true });

            // Pagination
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) {
                console.error('Initial query error:', error);
                // Fallback: Try without the join if the join failed
                if (error.code === 'PGRST200') {
                    console.log('Retrying without leads join due to relationship error...');
                    const fallbackQuery = supabase
                        .from('profiles')
                        .select('*', { count: 'exact' });
                    
                    // Re-apply same filters/sort/range
                    if (statusFilter !== 'All') fallbackQuery.eq('status', statusFilter);
                    if (planFilter !== 'All') fallbackQuery.eq('plan', planFilter);
                    if (timeTab === 'Today') {
                        const today = new Date(); today.setHours(0,0,0,0);
                        fallbackQuery.gte('created_at', today.toISOString());
                    } else if (timeTab === 'Week') {
                        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
                        fallbackQuery.gte('created_at', weekAgo.toISOString());
                    }
                    if (sortBy === 'newest') fallbackQuery.order('created_at', { ascending: false });
                    else if (sortBy === 'oldest') fallbackQuery.order('created_at', { ascending: true });
                    else if (sortBy === 'name') fallbackQuery.order('full_name', { ascending: true });
                    
                    const from = (page - 1) * pageSize;
                    const to = from + pageSize - 1;
                    fallbackQuery.range(from, to);

                    const { data: fbData, error: fbError, count: fbCount } = await fallbackQuery;
                    if (fbError) throw fbError;
                    
                    if (fbData) {
                        setUsers(fbData.map(u => ({ ...u, leads_scraped: '...' })));
                        if (fbCount !== null) setTotalCount(fbCount);
                    }
                } else {
                    throw error;
                }
            } else if (data) {
                const processedUsers = data.map(u => ({
                    ...u,
                    leads_scraped: u.leads?.[0]?.count || 0
                }));
                
                setUsers(processedUsers);
                if (count !== null) setTotalCount(count);
            }

            // Always fetch header stats regardless of table success
            const { data: allStats } = await supabase
                .from('profiles')
                .select('status, plan');
            
            if (allStats) {
                setStats({
                    total: allStats.length,
                    active: allStats.filter(u => u.status === 'Active').length,
                    premium: allStats.filter(u => u.plan === 'Pro' || u.plan === 'Enterprise').length,
                    banned: allStats.filter(u => u.status === 'Banned').length
                });
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            addNotification({ title: 'Error', message: 'Failed to fetch users', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (user: any, reason?: string) => {
        const newStatus = user.status === 'Banned' ? 'Active' : 'Banned';
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    status: newStatus,
                    ban_reason: newStatus === 'Banned' ? reason : null
                })
                .eq('id', user.id);

            if (error) throw error;

            setUsers(users.map(u => u.id === user.id ? { 
                ...u, 
                status: newStatus,
                ban_reason: newStatus === 'Banned' ? reason : null
            } : u));
            addNotification({ 
                title: 'Success', 
                message: `User ${user.full_name} is now ${newStatus}`, 
                type: newStatus === 'Active' ? 'success' : 'warning' 
            });
        } catch (err) {
            console.error('Error updating user status:', err);
            addNotification({ title: 'Error', message: 'Failed to update user status', type: 'error' });
        }
    };

    const handleBan = (user: any) => {
        setSelectedUser(user);
        setBanReason(user.ban_reason || '');
        setIsBanModalOpen(true);
    };

    const handleImpersonate = (user: any) => {
        setSelectedUser(user);
        setIsImpersonateModalOpen(true);
    };

    const handleResetPassword = async (user: any) => {
        try {
            setLoading(true);
            const { data, error } = await supabase.functions.invoke('admin-create-user', {
                body: { 
                    type: 'reset-password',
                    userId: user.id
                }
            });

            if (error || data?.error) throw error || new Error(data.error);

            addNotification({ 
                title: 'Success', 
                message: `Password reset link triggered for ${user.full_name}`, 
                type: 'success' 
            });
        } catch (err: any) {
            addNotification({ title: 'Error', message: err.message || 'Failed to reset password', type: 'error' });
        } finally {
            setLoading(false);
            setActiveDropdown(null);
        }
    };

    const handleDeleteUser = async (user: any) => {
        if (!confirm(`Are you sure you want to delete ${user.full_name}? This cannot be undone.`)) return;

        try {
            setLoading(true);
            const { data, error } = await supabase.functions.invoke('admin-create-user', {
                body: { 
                    type: 'delete-user',
                    userId: user.id
                }
            });

            if (error || data?.error) throw error || new Error(data.error);

            addNotification({ title: 'Success', message: 'User deleted successfully', type: 'success' });
            fetchUsers();
        } catch (err: any) {
            addNotification({ title: 'Error', message: err.message || 'Failed to delete user', type: 'error' });
        } finally {
            setLoading(false);
            setActiveDropdown(null);
        }
    };

    const statCards = [
        { label: 'Total Users', value: stats.total.toLocaleString(), icon: <Users className="text-[#1b57b1]" />, trend: 'Overall' },
        { label: 'Active Users', value: stats.active.toLocaleString(), icon: <UserCheck className="text-emerald-600" />, trend: 'System Access' },
        { label: 'Pro/Ent Users', value: stats.premium.toLocaleString(), icon: <UserPlus className="text-amber-600" />, trend: 'Paid Plans' },
        { label: 'Banned Users', value: stats.banned.toLocaleString(), icon: <UserMinus className="text-rose-600" />, trend: 'Restricted' },
    ];

    const filteredUsers = users.filter(u => 
        (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.company?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const toggleRow = (id: string) => {
        setSelectedRows(prev => 
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedRows.length === filteredUsers.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filteredUsers.map(u => u.id));
        }
    };

    const confirmImpersonate = () => {
        // In a real app, this would swap the session or token
        addNotification({ 
            title: 'Impersonation Started', 
            message: `You are now viewing the dashboard as ${selectedUser?.full_name}`, 
            type: 'info' 
        });
        setIsImpersonateModalOpen(false);
    };

    const handleBulkBan = async () => {
        if (selectedRows.length === 0) return;
        
        const confirm = window.confirm(`Are you sure you want to ban ${selectedRows.length} users?`);
        if (!confirm) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: 'Banned' })
                .in('id', selectedRows);

            if (error) throw error;

            addNotification({ title: 'Success', message: `${selectedRows.length} users banned`, type: 'success' });
            setSelectedRows([]);
            fetchUsers();
        } catch (err) {
            addNotification({ title: 'Error', message: 'Failed to bulk ban users', type: 'error' });
        }
    };

    return (
        <AppContainer title="Admin: User Management">
            <div className="space-y-6 pb-20">
                {/* Stats Row - Matching Dashboard KPICards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
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

                {/* Filter Bar - Matching Dashboard styling */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                            {['All', 'Today', 'Week'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setTimeTab(tab)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsInviteModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#1b57b1] text-white rounded-xl text-xs font-bold hover:bg-[#154690] transition-all shadow-lg shadow-[#1b57b1]/20"
                            >
                                <UserPlus size={16} /> Invite User
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
                                <Download size={16} /> Export CSV
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search by name, email or company..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-3">
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] transition-all appearance-none cursor-pointer"
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                            >
                                <option value="All">All Plans</option>
                                <option value="Starter">Starter</option>
                                <option value="Pro">Pro</option>
                                <option value="Enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] transition-all appearance-none cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active Only</option>
                                <option value="Banned">Banned Only</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <div className="relative">
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] transition-all appearance-none cursor-pointer font-bold"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="newest">Joined: Newest</option>
                                    <option value="oldest">Joined: Oldest</option>
                                    <option value="name">Sort: Name</option>
                                </select>
                                <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table Container */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm relative min-h-[400px]">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
                            <Loader2 className="animate-spin text-[#1b57b1]" size={40} />
                        </div>
                    )}

                    {/* Bulk Actions */}
                    {selectedRows.length > 0 && (
                        <div className="absolute top-0 inset-x-0 h-16 bg-[#1b57b1] z-10 flex items-center justify-between px-6 animate-in slide-in-from-top duration-300">
                            <div className="flex items-center gap-4 text-white">
                                <span className="text-sm font-bold">{selectedRows.length} users selected</span>
                                <div className="h-6 w-px bg-white/20"></div>
                                <button 
                                    onClick={handleBulkBan}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                                >
                                    <Ban size={14} /> Ban Selected
                                </button>
                                <button className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-100 text-xs font-bold transition-all flex items-center gap-2">
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                            <button onClick={() => setSelectedRows([])} className="text-white/80 hover:text-white text-xs font-bold transition-colors">Deselect All</button>
                        </div>
                    )}

                    <div className="overflow-x-auto pb-48 -mb-48">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="px-6 py-4 w-10 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300 text-[#1b57b1] focus:ring-[#1b57b1]/20 cursor-pointer"
                                            checked={selectedRows.length === filteredUsers.length && filteredUsers.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Profile</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Plan</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Joined</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Leads Scraped</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Active</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                    <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${selectedRows.includes(user.id) ? 'bg-[#1b57b1]/5' : ''}`}>
                                        <td className="px-6 py-4 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-slate-300 text-[#1b57b1] focus:ring-[#1b57b1]/20 cursor-pointer" 
                                                checked={selectedRows.includes(user.id)}
                                                onChange={() => toggleRow(user.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#1b57b1] font-bold text-xs uppercase border border-slate-200">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                                                    ) : (
                                                        (user.full_name || 'U').split(' ').map((n: string) => n[0]).join('')
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900 leading-none mb-1">{user.full_name || 'Unnamed User'}</span>
                                                    <span className="text-xs text-slate-500">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                user.plan === 'Enterprise' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                user.plan === 'Pro' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                'bg-slate-50 text-slate-700 border-slate-100'
                                            }`}>
                                                {user.plan || 'Starter'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                                {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-slate-900">{(user.leads_scraped || 0).toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all inline-block ${
                                                user.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                user.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                'bg-rose-50 text-rose-700 border-rose-100'
                                            }`}>
                                                {user.status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <div 
                                                    onClick={() => user.status !== 'Banned' ? handleBan(user) : handleToggleStatus(user)}
                                                    className={`w-12 h-6 rounded-full p-1 transition-all cursor-pointer relative ${user.status !== 'Banned' ? 'bg-emerald-100' : 'bg-slate-200'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ${user.status !== 'Banned' ? 'translate-x-6 bg-emerald-600' : 'translate-x-0 bg-slate-400'}`}></div>
                                                </div>
                                            </div>
                                        </td>
                                         <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 relative">
                                                <button 
                                                    onClick={() => { setSelectedUser(user); setIsDetailModalOpen(true); }}
                                                    title="View Details" 
                                                    className="p-2 text-slate-400 hover:text-[#1b57b1] hover:bg-slate-50 rounded-lg transition-all"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => handleImpersonate(user)} title="Impersonate" className="p-2 text-slate-400 hover:text-[#1b57b1] hover:bg-blue-50 rounded-lg transition-all">
                                                    <UserCog size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleBan(user)} 
                                                    disabled={user.id === currentUser?.id}
                                                    title={user.id === currentUser?.id ? "You cannot ban yourself" : "Ban User"} 
                                                    className={`p-2 transition-all rounded-lg ${user.id === currentUser?.id ? 'opacity-20 cursor-not-allowed text-slate-300' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                                                >
                                                    <Ban size={18} />
                                                </button>
                                                 <div className="relative">
                                                    <button 
                                                        onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                                                        className={`p-2 transition-all rounded-lg ${activeDropdown === user.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>
                                                    
                                                    {activeDropdown === user.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)}></div>
                                                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                                <div className="px-4 py-2 border-b border-slate-50 mb-1">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Actions</p>
                                                                </div>
                                                                <button 
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(user.id);
                                                                        addNotification({ title: 'Copied', message: 'User ID copied to clipboard', type: 'success' });
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                                >
                                                                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#1b57b1]">
                                                                        <MoreVertical size={12} className="rotate-90" />
                                                                    </div>
                                                                    Copy User ID
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        handleResetPassword(user);
                                                                    }}
                                                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                                >
                                                                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                                                        <Loader2 size={12} />
                                                                    </div>
                                                                    Reset Password
                                                                </button>
                                                                <div className="h-px bg-slate-100 my-1"></div>
                                                                <button 
                                                                    onClick={() => {
                                                                        handleDeleteUser(user);
                                                                    }}
                                                                    disabled={user.id === currentUser?.id}
                                                                    className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-3 transition-colors ${user.id === currentUser?.id ? 'opacity-30 cursor-not-allowed text-slate-400' : 'text-rose-600 hover:bg-rose-50'}`}
                                                                >
                                                                    <div className={`w-6 h-6 rounded flex items-center justify-center ${user.id === currentUser?.id ? 'bg-slate-100 text-slate-300' : 'bg-rose-50 text-rose-400'}`}>
                                                                        <Trash2 size={12} />
                                                                    </div>
                                                                    {user.id === currentUser?.id ? 'Cannot Delete Self' : 'Delete User'}
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )) : !loading && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                                                <Search size={40} className="opacity-20" />
                                                <p className="text-sm font-medium text-slate-500">No users found matching your filters.</p>
                                                <button onClick={() => { setSearchTerm(''); setStatusFilter('All'); setPlanFilter('All'); setTimeTab('All'); }} className="text-[#1b57b1] text-xs font-bold hover:underline">Clear all filters</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-slate-500 font-medium">Showing <span className="text-slate-900 font-bold">{Math.min((page-1)*pageSize + 1, totalCount)}-{Math.min(page*pageSize, totalCount)}</span> of <span className="text-slate-900 font-bold">{totalCount}</span> users</p>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.ceil(totalCount / pageSize) }).map((_, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => setPage(i + 1)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${page === i + 1 ? 'bg-[#1b57b1] text-white shadow-lg shadow-[#1b57b1]/20' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button 
                                onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                                disabled={page >= Math.ceil(totalCount / pageSize)}
                                className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-30"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Impersonate Modal */}
            {isImpersonateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsImpersonateModalOpen(false)}></div>
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 relative shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="w-16 h-16 bg-[#1b57b1]/10 rounded-2xl flex items-center justify-center text-[#1b57b1] mb-6">
                            <UserCog size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Impersonate User?</h3>
                        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                            You are about to log in as <span className="text-slate-900 font-bold">{selectedUser?.full_name}</span>. 
                            You will have full access to their account and data. This action is logged for security audits.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setIsImpersonateModalOpen(false)} className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">Cancel</button>
                            <button 
                                onClick={confirmImpersonate}
                                className="px-6 py-3 bg-[#1b57b1] rounded-xl text-white text-sm font-bold hover:bg-[#154690] shadow-xl shadow-[#1b57b1]/20 transition-all"
                            > Confirm Access </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ban Modal */}
            {isBanModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsBanModalOpen(false)}></div>
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 relative shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-6">
                            <Ban size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Ban User Access</h3>
                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                            Please provide a reason for banning <span className="text-slate-900 font-bold">{selectedUser?.full_name}</span>. 
                            The user will be restricted from accessing core platform features.
                        </p>
                        <div className="mb-8">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Reason for Ban</label>
                            <textarea 
                                placeholder="e.g. Violation of Terms of Service..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500/50 min-h-[100px] transition-all resize-none shadow-inner"
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                            ></textarea>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setIsBanModalOpen(false)} className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">Cancel</button>
                            <button 
                                onClick={() => {
                                    handleToggleStatus(selectedUser, banReason);
                                    setIsBanModalOpen(false);
                                }}
                                className="px-6 py-3 bg-rose-600 rounded-xl text-white text-sm font-bold hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all"
                            > Confirm Ban </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Invite User Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsInviteModalOpen(false); setInviteError(''); }}></div>
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 relative shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="w-16 h-16 bg-[#1b57b1]/10 rounded-2xl flex items-center justify-center text-[#1b57b1] mb-6">
                            <UserPlus size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Invite New User</h3>
                        <p className="text-slate-500 text-sm mb-6">Enter user details to create a new platform profile.</p>

                        {inviteError && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-medium flex items-start gap-3">
                                <div className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-rose-200 text-rose-600 flex items-center justify-center font-bold text-[10px]">!</div>
                                <p>{inviteError}</p>
                            </div>
                        )}
                        
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setLoading(true);
                            setInviteError('');
                            try {
                                const { data: { session } } = await supabase.auth.getSession();
                                console.log("Invoking with token:", session?.access_token?.slice(0, 10) + "...");
                                
                                const { data, error } = await supabase.functions.invoke('admin-create-user', {
                                    body: {
                                        type: 'create',
                                        email: inviteData.email,
                                        fullName: inviteData.fullName,
                                        plan: inviteData.plan,
                                        status: inviteData.status
                                    }
                                });

                                if (error) {
                                    console.error("Supabase Invoke Error:", error);
                                    throw error;
                                }
                                if (data?.error) {
                                    console.error("Edge Function Business Error:", data);
                                    if (data.error.includes("email rate limit exceeded") || data.error.includes("rate limit exceeded")) {
                                        throw new Error("Supabase email rate limit exceeded. Please wait a few minutes before sending another test invitation.");
                                    }
                                    throw new Error(data.error);
                                }

                                addNotification({ title: 'Success', message: 'User profile created successfully', type: 'success' });
                                setIsInviteModalOpen(false);
                                setInviteData({ fullName: '', email: '', plan: 'Starter', status: 'Active' });
                                fetchUsers();
                            } catch (err: any) {
                                console.error("Error creating user:", err);
                                setInviteError(err.message || 'Failed to create user');
                            } finally {
                                setLoading(false);
                            }
                        }} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Full Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#1b57b1]/10"
                                    value={inviteData.fullName}
                                    onChange={(e) => setInviteData({ ...inviteData, fullName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Email address</label>
                                <input 
                                    type="email" 
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#1b57b1]/10"
                                    value={inviteData.email}
                                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Plan</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#1b57b1]/10"
                                        value={inviteData.plan}
                                        onChange={(e) => setInviteData({ ...inviteData, plan: e.target.value })}
                                    >
                                        <option value="Starter">Starter</option>
                                        <option value="Pro">Pro</option>
                                        <option value="Enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Status</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#1b57b1]/10"
                                        value={inviteData.status}
                                        onChange={(e) => setInviteData({ ...inviteData, status: e.target.value })}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Banned">Banned</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">Cancel</button>
                                <button type="submit" className="px-6 py-3 bg-[#1b57b1] rounded-xl text-white text-sm font-bold hover:bg-[#154690] shadow-xl shadow-[#1b57b1]/20 transition-all">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Details Modal */}
            {isDetailModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)}></div>
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-0 relative shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 overflow-hidden">
                        <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-white border-2 border-[#1b57b1] flex items-center justify-center text-[#1b57b1] font-bold text-xl relative overflow-hidden">
                                    {selectedUser?.avatar_url ? (
                                        <img src={selectedUser.avatar_url} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        selectedUser?.full_name?.split(' ').map((n: string) => n[0]).join('')
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{selectedUser?.full_name}</h3>
                                    <p className="text-sm text-slate-500 font-medium">{selectedUser?.email}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedUser?.plan === 'Pro' || selectedUser?.plan === 'Enterprise' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {selectedUser?.plan} Plan
                                </span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedUser?.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {selectedUser?.status}
                                </span>
                            </div>
                        </div>
                        <div className="p-8 grid grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Account Overview</h4>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500">Member Since</span>
                                            <span className="text-xs font-bold text-slate-900">
                                                {selectedUser?.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500">Leads Scraped</span>
                                            <span className="text-xs font-bold text-[#1b57b1]">{selectedUser?.leads_scraped?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500">Account Role</span>
                                            <span className="text-xs font-bold text-slate-900">{selectedUser?.role || 'Member'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quick Actions</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        <button onClick={() => { setIsDetailModalOpen(false); handleImpersonate(selectedUser); }} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                            <UserCog size={14} /> Impersonate Account
                                        </button>
                                        <button 
                                            onClick={() => { setIsDetailModalOpen(false); handleBan(selectedUser); }}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Ban size={14} /> {selectedUser?.status === 'Active' ? 'Suspend Account' : 'Lift Suspension'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button onClick={() => setIsDetailModalOpen(false)} className="px-6 py-2.5 bg-[#1b57b1] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#1b57b1]/20 hover:bg-[#154690] transition-all">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </AppContainer>
    );
};

export default UserManagement;
