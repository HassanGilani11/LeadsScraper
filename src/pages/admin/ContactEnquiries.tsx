import React, { useState, useEffect } from 'react';
import { 
    Mail, 
    Search, 
    ChevronLeft, 
    ChevronRight,
    Loader2,
    Trash2,
    Download,
    Calendar,
    User,
    MessageSquare,
    Clock
} from 'lucide-react';
import AppContainer from '@/components/layout/AppContainer';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const ContactEnquiries = () => {
    const { user: currentUser } = useStore();
    const [enquiries, setEnquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        if (currentUser?.role === 'Admin') {
            fetchEnquiries();
        }
    }, [currentUser, page, searchTerm]);

    const fetchEnquiries = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('contact_enquiries')
                .select('*', { count: 'exact' });

            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`);
            }

            query = query.order('created_at', { ascending: false });

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;
            if (data) setEnquiries(data);
            if (count !== null) setTotalCount(count);
        } catch (err: any) {
            console.error('Error fetching enquiries:', err);
            toast.error('Failed to fetch contact enquiries');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            let query = supabase
                .from('contact_enquiries')
                .select('*');

            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`);
            }

            query = query.order('created_at', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;
            if (!data || data.length === 0) {
                toast.error('No enquiries to export');
                return;
            }

            const headers = ['Date', 'Time', 'Full Name', 'Email', 'Subject', 'Message'];
            const csvRows = data.map(item => [
                new Date(item.created_at).toLocaleDateString(),
                new Date(item.created_at).toLocaleTimeString(),
                item.full_name,
                item.email,
                item.subject,
                `"${item.message.replace(/"/g, '""').replace(/\n/g, ' ')}"`
            ]);

            const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `contact-enquiries-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success(`Exported ${data.length} enquiry records`);
        } catch (err) {
            console.error('Error exporting enquiries:', err);
            toast.error('Failed to export enquiries');
        } finally {
            setExporting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this enquiry?')) return;

        try {
            const { error } = await supabase
                .from('contact_enquiries')
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            toast.success('Enquiry deleted successfully');
            fetchEnquiries();
        } catch (err) {
            console.error('Error deleting enquiry:', err);
            toast.error('Failed to delete enquiry');
        }
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

    return (
        <AppContainer title="Admin: Contact Enquiries">
            <div className="space-y-6 pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-none">Contact Enquiries</h1>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Manage incoming messages from the contact form</p>
                    </div>
                    <button 
                        onClick={handleExport}
                        disabled={exporting || enquiries.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
                    >
                        {exporting ? (
                            <Loader2 className="animate-spin" size={14} />
                        ) : (
                            <Download size={14} />
                        )}
                        <span>{exporting ? 'Exporting...' : 'Download CSV'}</span>
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search enquiries..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table Layout */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm relative min-h-[400px] overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
                            <Loader2 className="animate-spin text-[#1b57b1]" size={40} />
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {enquiries.length > 0 ? enquiries.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 mb-0.5">
                                                    {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-medium">
                                                    {new Date(item.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({formatRelativeTime(item.created_at)})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{item.full_name}</span>
                                                <span className="text-[10px] text-slate-500">{item.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-[#1b57b1] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                                                {item.subject}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-md">
                                            <p className="text-xs text-slate-600 line-clamp-2 italic">
                                                "{item.message}"
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <a 
                                                    href={`mailto:${item.email}?subject=Re: ${item.subject}`}
                                                    className="p-2 text-slate-400 hover:text-[#1b57b1] hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Reply via Email"
                                                >
                                                    <Mail size={16} />
                                                </a>
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Delete Enquiry"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : !loading && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100">
                                                    <Mail size={32} />
                                                </div>
                                                <div className="text-center">
                                                    <h3 className="text-lg font-bold text-slate-900 leading-none">No Enquiries Found</h3>
                                                    <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto font-medium">Your contact form enquiries will appear here once submitted.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalCount > pageSize && (
                        <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-500 font-bold">
                                Showing <span className="text-slate-900">{Math.min((page-1)*pageSize + 1, totalCount)}-{Math.min(page*pageSize, totalCount)}</span> of <span className="text-slate-900">{totalCount}</span> enquiries
                            </p>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white disabled:opacity-30 transition-all shadow-sm"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button 
                                    onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                                    disabled={page >= Math.ceil(totalCount / pageSize)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white disabled:opacity-30 transition-all shadow-sm"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppContainer>
    );
};

export default ContactEnquiries;
