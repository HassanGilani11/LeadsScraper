import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppContainer from '@/components/layout/AppContainer';
import { Users, Mail, Download, Search, MoreVertical, ChevronDown, CheckCircle2, Circle, Loader2, Trash2, Edit2, X, ArrowLeft, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore, Lead } from '@/store/useStore';

const LeadsList = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const campaignId = searchParams.get('campaignId');
    const industryFilter = searchParams.get('industry');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const { user, leads, setLeads, addLead, searchQuery, setSearchQuery } = useStore();
    const [campaignName, setCampaignName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState('newest');
    const [editingLead, setEditingLead] = useState<Lead | null>(null);

    useEffect(() => {
        if (user) {
            fetchLeads();
            if (campaignId) fetchCampaignName();
        }
    }, [user, campaignId, industryFilter, minScore, maxScore]);

    // Handle URL search parameter
    useEffect(() => {
        const queryParam = searchParams.get('q');
        if (queryParam) {
            setSearchQuery(queryParam);
        }
    }, [searchParams]);

    const fetchCampaignName = async () => {
        const { data } = await supabase
            .from('campaigns')
            .select('name')
            .eq('id', campaignId)
            .single();
        if (data) setCampaignName(data.name);
    };

    const fetchLeads = async () => {
        if (!user) return;
        setLoading(true);
        try {
            let query = supabase
                .from('leads')
                .select('*')
                .eq('user_id', user.id);

            if (campaignId) {
                query = query.eq('campaign_id', campaignId);
            }

            if (industryFilter) {
                query = query.eq('industry', industryFilter);
            }

            if (minScore) {
                query = query.gte('icp_score', parseInt(minScore));
            }

            if (maxScore) {
                query = query.lte('icp_score', parseInt(maxScore));
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            
            // Format dates
            const formattedLeads = data?.map(lead => ({
                ...lead,
                created_at: new Date(lead.created_at).toISOString().split('T')[0]
            })) || [];
            
            setLeads(formattedLeads);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        const itemsToExport = selectedRows.length > 0 
            ? leads.filter(lead => selectedRows.includes(lead.id))
            : leads;

        if (itemsToExport.length === 0) return;
        
        const headers = ['First Name', 'Last Name', 'Email', 'Company', 'Status', 'Date Created'];
        const rows = itemsToExport.map(lead => [
            lead.first_name || '',
            lead.last_name || '',
            lead.email,
            lead.company || '',
            lead.status || 'new',
            lead.created_at || ''
        ]);
        
        // Add BOM for Excel compatibility
        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDuplicateLead = async (lead: Lead) => {
        if (!user) return;

        const { id, created_at, ...leadData } = lead;
        const newLead = {
            ...leadData,
            user_id: user.id
        };

        try {
            const { data, error } = await supabase
                .from('leads')
                .insert([newLead])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                addLead({
                    ...data,
                    created_at: new Date(data.created_at).toISOString().split('T')[0]
                });
            }
        } catch (err) {
            console.error('Error duplicating lead:', err);
            alert('Failed to duplicate lead.');
        }
    };

    const handleDeleteLead = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this lead?')) return;
        
        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            setLeads(leads.filter(lead => lead.id !== id));
            setSelectedRows(selectedRows.filter(rowId => rowId !== id));
        } catch (error) {
            console.error('Error deleting lead:', error);
            alert('Failed to delete lead. Please try again.');
        }
    };

    const handleUpdateLead = async (updatedLead: Partial<Lead>) => {
        if (!editingLead) return;
        
        try {
            const { error } = await supabase
                .from('leads')
                .update(updatedLead)
                .eq('id', editingLead.id);
                
            if (error) throw error;
            
            setLeads(leads.map(lead => 
                lead.id === editingLead.id ? { ...lead, ...updatedLead } : lead
            ));
            setEditingLead(null);
        } catch (error) {
            console.error('Error updating lead:', error);
            alert('Failed to update lead.');
        }
    };

    const toggleRow = (id: string) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(rowId => rowId !== id));
        } else {
            setSelectedRows([...selectedRows, id]);
        }
    };

    const toggleAll = () => {
        if (selectedRows.length === leads.length && leads.length > 0) {
            setSelectedRows([]);
        } else {
            setSelectedRows(leads.map(lead => lead.id));
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            new: 'bg-blue-50 text-blue-700 border-blue-200',
            contacted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            interested: 'bg-purple-50 text-purple-700 border-purple-200',
            closed: 'bg-green-50 text-green-700 border-green-200',
        };
        const defaultStyle = 'bg-slate-50 text-slate-700 border-slate-200';
        const normalizedStatus = status ? status.toLowerCase() : 'new';
        return (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[normalizedStatus] || defaultStyle}`}>
                {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
            </span>
        );
    };

    const filteredLeads = leads
        .filter(lead => {
            const text = `${lead.first_name || ''} ${lead.last_name || ''} ${lead.email || ''} ${lead.company || ''}`.toLowerCase();
            return text.includes(searchQuery.toLowerCase());
        })
        .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (sortBy === 'name') {
                const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
                const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
                return nameA.localeCompare(nameB);
            }
            if (sortBy === 'company') return (a.company || '').localeCompare(b.company || '');
            if (sortBy === 'score') return (Number(b.icp_score) || 0) - (Number(a.icp_score) || 0);
            return 0;
        });

    return (
        <AppContainer title="Leads List">
            <div className="flex flex-col gap-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#1b57b1]/10 flex items-center justify-center text-[#1b57b1] shadow-inner">
                            <Users size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                {campaignId && (
                                    <button 
                                        onClick={() => window.history.back()}
                                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                                        title="Back to Campaigns"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                )}
                                <h3 className="text-xl font-bold text-slate-900 leading-tight">
                                    {campaignName ? `Leads for ${campaignName}` : (
                                        industryFilter ? `Industry: ${industryFilter}` : 
                                        (minScore || maxScore) ? `ICP Score: ${minScore || 0}-${maxScore || 10}` :
                                        `${leads.length.toLocaleString()} ${leads.length === 1 ? 'Verified Lead' : 'Verified Leads'}`
                                    )}
                                </h3>
                            </div>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">
                                {campaignName ? `Showing leads extracted for this campaign.` : 
                                 industryFilter ? `Showing leads in the ${industryFilter} industry.` :
                                 (minScore || maxScore) ? `Showing leads matching your ICP criteria.` :
                                 'Manage and export your extracted business contacts.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        {(industryFilter || minScore || maxScore || campaignId) && (
                            <button 
                                onClick={() => setSearchParams({})}
                                className="flex-1 sm:flex-none px-4 py-2 border border-red-200 bg-red-50 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <X size={18} />
                                Clear Filter
                            </button>
                        )}
                        <button 
                            onClick={handleExportCSV}
                            className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                            <Download size={18} />
                            Export CSV
                        </button>
                        <button className="flex-1 sm:flex-none px-4 py-2 bg-[#1b57b1] text-white rounded-xl text-sm font-bold hover:bg-[#154690] transition-all flex items-center justify-center gap-2 cursor-not-allowed opacity-70 shadow-lg shadow-[#1b57b1]/20">
                            <Mail size={18} />
                            Bulk Email
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                        <div className="relative w-full sm:w-80 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1b57b1] transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search leads by name, email, or company..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative">
                                <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm outline-none focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] w-full sm:w-auto min-w-[160px]"
                                >
                                    <option value="newest">Sort by: Newest</option>
                                    <option value="oldest">Sort by: Oldest</option>
                                    <option value="name">Sort by: Name (A-Z)</option>
                                    <option value="company">Sort by: Company (A-Z)</option>
                                    <option value="score">Sort by: ICP Score</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80">
                                    <th className="p-4 w-12 text-center">
                                        <button onClick={toggleAll} className="text-slate-400 hover:text-[#1b57b1] transition-colors focus:outline-none">
                                            {selectedRows.length === leads.length && leads.length > 0 ? (
                                                <CheckCircle2 size={20} className="text-[#1b57b1] fill-[#1b57b1]/10" />
                                            ) : (
                                                <Circle size={20} />
                                            )}
                                        </button>
                                    </th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Name</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Company</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date Created</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.length > 0 ? (
                                    filteredLeads.map((lead, index) => (
                                        <tr 
                                            key={lead.id} 
                                            className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors group ${index === filteredLeads.length - 1 ? 'border-none' : ''} ${selectedRows.includes(lead.id) ? 'bg-blue-50/30' : ''}`}
                                        >
                                            <td className="p-4 text-center">
                                                <button onClick={() => toggleRow(lead.id)} className="text-slate-300 group-hover:text-slate-400 hover:!text-[#1b57b1] transition-colors focus:outline-none">
                                                    {selectedRows.includes(lead.id) ? (
                                                        <CheckCircle2 size={20} className="text-[#1b57b1] fill-[#1b57b1]/10" />
                                                    ) : (
                                                        <Circle size={20} />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 uppercase">
                                                        {(lead.first_name?.[0] || '')}{(lead.last_name?.[0] || '')}
                                                        {(!lead.first_name && !lead.last_name) && lead.email[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">
                                                            {lead.first_name || lead.last_name ? `${lead.first_name || ''} ${lead.last_name || ''}` : (
                                                                <span className="flex items-center gap-2">
                                                                    Unnamed Lead
                                                                    <button 
                                                                        onClick={() => setEditingLead(lead)}
                                                                        className="text-[10px] bg-[#1b57b1]/10 text-[#1b57b1] px-1.5 py-0.5 rounded-md hover:bg-[#1b57b1]/20 transition-all font-bold"
                                                                    >
                                                                        Set Name
                                                                    </button>
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{lead.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-slate-700">{lead.company}</td>
                                            <td className="p-4">
                                                {getStatusBadge(lead.status)}
                                            </td>
                                            <td className="p-4 text-sm text-slate-500 font-medium">{lead.created_at}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleDuplicateLead(lead)}
                                                        className="p-2 text-slate-400 hover:bg-white hover:text-[#1b57b1] rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 transition-all focus:opacity-100 cursor-pointer"
                                                        title="Duplicate Lead"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => setEditingLead(lead)}
                                                        className="p-2 text-slate-400 hover:bg-white hover:text-[#1b57b1] rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 transition-all focus:opacity-100 cursor-pointer"
                                                        title="Edit Lead"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteLead(lead.id)}
                                                        className="p-2 text-slate-400 hover:bg-white hover:text-red-600 rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 transition-all focus:opacity-100 cursor-pointer"
                                                        title="Delete Lead"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                {loading ? (
                                                    <Loader2 className="animate-spin text-[#1b57b1]" size={32} />
                                                ) : (
                                                    <>
                                                        <Search size={32} className="text-slate-300" />
                                                        <p className="font-medium text-slate-600">No leads found</p>
                                                        <p className="text-sm">Try tweaking your search query.</p>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm bg-slate-50/50">
                        <span className="text-slate-500 font-medium">
                            Showing <span className="text-slate-900 font-bold">1-{filteredLeads.length}</span> of <span className="text-slate-900 font-bold">{leads.length.toLocaleString()}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <button className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-white disabled:opacity-50 transition-all disabled:cursor-not-allowed" disabled>Previous</button>
                            <button className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-white transition-all bg-white shadow-sm ring-1 ring-slate-200">1</button>
                            <button className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-white transition-all disabled:opacity-50" disabled>Next</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Lead Modal */}
            {editingLead && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900">Edit Lead Details</h3>
                            <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleUpdateLead({
                                first_name: formData.get('first_name') as string,
                                last_name: formData.get('last_name') as string,
                                company: formData.get('company') as string,
                            });
                        }} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">First Name</label>
                                    <input 
                                        name="first_name" 
                                        defaultValue={editingLead.first_name || ''} 
                                        placeholder="Enter first name"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Last Name</label>
                                    <input 
                                        name="last_name" 
                                        defaultValue={editingLead.last_name || ''} 
                                        placeholder="Enter last name"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Company</label>
                                <input 
                                    name="company" 
                                    defaultValue={editingLead.company || ''} 
                                    placeholder="Enter company name"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5 opacity-60">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Email (Read Only)</label>
                                <input 
                                    value={editingLead.email} 
                                    disabled 
                                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setEditingLead(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#1b57b1] text-white rounded-xl text-sm font-bold hover:bg-[#154690] transition-all shadow-lg shadow-[#1b57b1]/20">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppContainer>
    );
};

export default LeadsList;
