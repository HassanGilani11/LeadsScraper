import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppContainer from '@/components/layout/AppContainer';
import { Users, Mail, Download, Upload, FileText, Search, ChevronDown, CheckCircle2, Circle, Loader2, Trash2, Edit2, X, ArrowLeft, Copy, MoreVertical, Send, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore, Lead } from '@/store/useStore';
import { toast } from 'sonner';
import BulkEmailModal from '@/components/modals/BulkEmailModal';
import AssignToCampaignModal from '@/components/modals/AssignToCampaignModal';
import { Target } from 'lucide-react';

const LeadsList = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const campaignId = searchParams.get('campaignId');
    const industryFilter = searchParams.get('industry');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const { user, leads, setLeads, addLead, searchQuery, setSearchQuery, addNotification } = useStore();
    const [campaignName, setCampaignName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState('newest');
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [showBulkEmail, setShowBulkEmail] = useState(false);
    const [singleEmailLead, setSingleEmailLead] = useState<Lead | null>(null);
    const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);
    const [emailStatusMap, setEmailStatusMap] = useState<Record<string, { status: 'sent' | 'failed'; error?: string }>>({});
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [leadsToAssign, setLeadsToAssign] = useState<Lead[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [companyFilter, setCompanyFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');

    useEffect(() => {
        if (user) {
            fetchLeads();
            fetchEmailLogs();
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

    const fetchEmailLogs = async () => {
        if (!user) return;
        try {
            const { data } = await supabase
                .from('email_logs')
                .select('lead_id, status, error_message')
                .eq('user_id', user.id)
                .not('lead_id', 'is', null)
                .order('sent_at', { ascending: false });

            if (data) {
                // Keep only the LATEST status per lead
                const map: Record<string, { status: 'sent' | 'failed'; error?: string }> = {};
                data.forEach(row => {
                    if (row.lead_id && !map[row.lead_id]) {
                        map[row.lead_id] = { status: row.status, error: row.error_message || undefined };
                    }
                });
                setEmailStatusMap(map);
            }
        } catch (err) {
            console.error('Error fetching email logs:', err);
        }
    };

    const handleExportCSV = () => {
        const itemsToExport = selectedRows.length > 0 
            ? leads.filter(lead => selectedRows.includes(lead.id))
            : leads;

        if (itemsToExport.length === 0) return;
        
        const headers = ['First Name', 'Last Name', 'Email', 'Company', 'Status', 'Date Created', 'Industry', 'ICP Score'];
        const rows = itemsToExport.map(lead => [
            lead.first_name || '',
            lead.last_name || '',
            lead.email,
            lead.company || '',
            lead.status || 'new',
            lead.created_at || '',
            lead.industry || '',
            lead.icp_score || '0'
        ]);
        
        // Add BOM for Excel compatibility
        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
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

    const handleImportCSV = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            let text = e.target?.result as string;
            if (!text) return;

            // Remove UTF-8 BOM if present
            if (text.startsWith('\uFEFF')) {
                text = text.substring(1);
            }

            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                toast.error('The CSV file is empty or has no data rows.');
                return;
            }

            const parseCSVLine = (line: string) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        if (inQuotes && line[i + 1] === '"') {
                            current += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };

            const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
            const emailIndex = headers.findIndex(h => h.includes('email'));

            if (emailIndex === -1) {
                toast.error('The CSV file must contain an "Email" column. Found: ' + headers.join(', '));
                return;
            }

            const firstNameIndex = headers.findIndex(h => h.includes('first name'));
            const lastNameIndex = headers.findIndex(h => h.includes('last name'));
            const companyIndex = headers.findIndex(h => h.includes('company'));
            const statusIndex = headers.findIndex(h => h.includes('status'));
            const industryIndex = headers.findIndex(h => h.includes('industry'));
            const icpScoreIndex = headers.findIndex(h => h.includes('icp score'));

            const newLeads = [];
            for (let i = 1; i < lines.length; i++) {
                try {
                    const values = parseCSVLine(lines[i]);
                    if (values.length === 0) continue;

                    const email = values[emailIndex];
                    if (!email || !email.includes('@')) continue;

                    newLeads.push({
                        user_id: user.id,
                        email,
                        first_name: firstNameIndex !== -1 ? (values[firstNameIndex] || null) : null,
                        last_name: lastNameIndex !== -1 ? (values[lastNameIndex] || null) : null,
                        company: companyIndex !== -1 ? (values[companyIndex] || null) : null,
                        status: statusIndex !== -1 ? (values[statusIndex]?.toLowerCase() || 'new') : 'new',
                        industry: industryIndex !== -1 ? (values[industryIndex] || null) : null,
                        icp_score: icpScoreIndex !== -1 ? parseInt(values[icpScoreIndex]) || 0 : 0,
                        campaign_id: campaignId || null,
                        source: 'csv'
                    });
                } catch (parseErr) {
                    console.error('Row parsing error at line ' + (i + 1), parseErr);
                }
            }

            if (newLeads.length === 0) {
                toast.error('No valid leads found in the CSV file. Please ensure emails are valid.');
                return;
            }

            const loadingToast = toast.loading(`Importing ${newLeads.length} leads...`);
            try {
                const { error } = await supabase
                    .from('leads')
                    .insert(newLeads);

                if (error) {
                    toast.dismiss(loadingToast);
                    toast.error(`Import failed: ${error.message}`);
                    console.error('Supabase Import Error:', error);
                    return;
                }

                toast.dismiss(loadingToast);
                toast.success(`Successfully imported ${newLeads.length} leads.`);
                fetchLeads();
            } catch (err: any) {
                console.error('Error importing leads:', err);
                toast.dismiss(loadingToast);
                toast.error(`Import failed: ${err.message || 'Check file format'}`);
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleDownloadSampleCSV = () => {
        const headers = ['First Name', 'Last Name', 'Email', 'Company', 'Status', 'Industry', 'ICP Score', 'Source'];
        const sampleData = ['John', 'Doe', 'john.doe@example.com', 'Example Corp', 'New', 'Technology', '85', 'csv'];
        
        const csvContent = '\uFEFF' + [
            headers.join(','),
            sampleData.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'leads_sample_format.csv');
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
                toast.success('Lead duplicated successfully');
            }
        } catch (err) {
            console.error('Error duplicating lead:', err);
            toast.error('Failed to duplicate lead');
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
            toast.success('Lead deleted');
        } catch (error) {
            console.error('Error deleting lead:', error);
            toast.error('Failed to delete lead');
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
            toast.success('Lead updated');
        } catch (error) {
            console.error('Error updating lead:', error);
            toast.error('Failed to update lead');
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

    const uniqueCompanies = Array.from(new Set(leads.map(l => l.company).filter(Boolean))).sort();

    const filteredLeads = leads
        .filter(lead => {
            const text = `${lead.first_name || ''} ${lead.last_name || ''} ${lead.email || ''} ${lead.company || ''}`.toLowerCase();
            const matchesSearch = text.includes(searchQuery.toLowerCase());
            const matchesCompany = companyFilter === 'all' || lead.company === companyFilter;
            const matchesSource = sourceFilter === 'all' || (lead.source || 'scraper') === sourceFilter;
            return matchesSearch && matchesCompany && matchesSource;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (sortBy === 'name') {
                const nameA = (`${a.first_name || ''} ${a.last_name || ''}`.trim()) || a.company || '';
                const nameB = (`${b.first_name || ''} ${b.last_name || ''}`.trim()) || b.company || '';
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
                        {(industryFilter || minScore || maxScore || campaignId || companyFilter !== 'all' || sourceFilter !== 'all') && (
                            <button 
                                onClick={() => {
                                    setSearchParams({});
                                    setCompanyFilter('all');
                                    setSourceFilter('all');
                                }}
                                className="flex-1 sm:flex-none px-4 py-2 border border-red-200 bg-red-50 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                            >
                                <X size={18} />
                                Clear Filter
                            </button>
                        )}
                        <div className="flex items-center gap-3 flex-1 sm:flex-none">
                            <div className="relative group">
                                <button 
                                    onClick={handleImportCSV}
                                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm group whitespace-nowrap"
                                >
                                    <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                                    Import CSV
                                </button>
                                <button 
                                    onClick={handleDownloadSampleCSV}
                                    className="absolute -bottom-5 left-0 right-0 text-[10px] text-[#1b57b1] hover:text-[#154690] hover:underline font-bold text-center transition-all opacity-80 hover:opacity-100 whitespace-nowrap"
                                >
                                    Download Sample Format
                                </button>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept=".csv" 
                                className="hidden" 
                            />
                            <button 
                                onClick={handleExportCSV}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
                            >
                                <Download size={18} />
                                Export CSV
                            </button>
                            <button 
                                onClick={() => setShowBulkEmail(true)}
                                className="px-4 py-2 bg-[#1b57b1] text-white rounded-xl text-sm font-bold hover:bg-[#154690] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1b57b1]/20 cursor-pointer whitespace-nowrap"
                            >
                                <Mail size={18} />
                                Bulk Email
                            </button>
                        </div>
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
                        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                            {selectedRows.length > 0 && (
                                <button
                                    onClick={() => {
                                        const selectedLeads = leads.filter(l => selectedRows.includes(l.id));
                                        setLeadsToAssign(selectedLeads);
                                        setShowAssignModal(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#1b57b1]/5 border border-[#1b57b1] text-[#1b57b1] rounded-xl text-sm font-bold hover:bg-[#1b57b1]/10 transition-all shadow-sm cursor-pointer whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300"
                                >
                                    <Target size={18} />
                                    Assign to Campaign ({selectedRows.length})
                                </button>
                            )}
                            {/* Company Filter */}
                            <div className="relative">
                                <select 
                                    value={companyFilter}
                                    onChange={(e) => setCompanyFilter(e.target.value)}
                                    className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm outline-none focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] min-w-[140px]"
                                >
                                    <option value="all">All Companies</option>
                                    {uniqueCompanies.map(company => (
                                        <option key={company} value={company}>{company}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Source Filter */}
                            <div className="relative">
                                <select 
                                    value={sourceFilter}
                                    onChange={(e) => setSourceFilter(e.target.value)}
                                    className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm outline-none focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] min-w-[140px]"
                                >
                                    <option value="all">All Sources</option>
                                    <option value="csv">CSV Import</option>
                                    <option value="scraper">Lead Scraper</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Sort Filter */}
                            <div className="relative">
                                <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm outline-none focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] min-w-[160px]"
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
                                     <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Source</th>
                                     <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Email Sent</th>
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
                                                        {(lead.first_name?.[0] || lead.last_name?.[0] || lead.company?.[0] || lead.email[0])}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">
                                                            {lead.first_name || lead.last_name
                                                                ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                                                                : (lead.company || lead.email)}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{lead.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-slate-700">{lead.company}</td>
                                            <td className="p-4">
                                                {getStatusBadge(lead.status)}
                                            </td>
                                             <td className="p-4 text-sm text-slate-500 font-medium whitespace-nowrap">{lead.created_at}</td>
                                             {/* Source Column */}
                                             <td className="p-4">
                                                 {lead.source === 'csv' ? (
                                                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-100 whitespace-nowrap">
                                                         <FileText size={12} />
                                                         CSV Import
                                                     </span>
                                                 ) : (
                                                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-purple-50 text-purple-700 border-purple-100 whitespace-nowrap">
                                                         <Database size={12} />
                                                         Lead Scraper
                                                     </span>
                                                 )}
                                             </td>
                                             {/* Email Status Column */}
                                             <td className="p-4">
                                                 {emailStatusMap[lead.id]?.status === 'sent' ? (
                                                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
                                                         <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                                                         Sent
                                                     </span>
                                                 ) : emailStatusMap[lead.id]?.status === 'failed' ? (
                                                     <span
                                                         title={emailStatusMap[lead.id]?.error || 'Email delivery failed'}
                                                         className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-red-50 text-red-600 border-red-200 whitespace-nowrap cursor-help"
                                                     >
                                                         <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                                                         Failed ⓘ
                                                     </span>
                                                 ) : (
                                                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-slate-50 text-slate-400 border-slate-200 whitespace-nowrap">
                                                         <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"></span>
                                                         Not Sent
                                                     </span>
                                                 )}
                                             </td>
                                             {/* Actions Dropdown */}
                                             <td className="p-4 text-right">
                                                 <div className="relative inline-block text-left">
                                                     <button
                                                         onClick={(e) => { e.stopPropagation(); setDropdownOpenId(dropdownOpenId === lead.id ? null : lead.id); }}
                                                         className="p-2 text-slate-400 hover:bg-white hover:text-slate-700 rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                                                     >
                                                         <MoreVertical size={16} />
                                                     </button>
                                                     {dropdownOpenId === lead.id && (
                                                         <div
                                                             className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-40 overflow-hidden"
                                                             onClick={(e) => e.stopPropagation()}
                                                         >
                                                             {/* Email options group */}
                                                             <div className="px-2 pt-2 pb-1">
                                                                 <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                                                                 <button
                                                                     onClick={() => { setSingleEmailLead(lead); setDropdownOpenId(null); }}
                                                                     className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-[#1b57b1]/5 hover:text-[#1b57b1] rounded-lg transition-colors"
                                                                 >
                                                                     <Send size={14} />
                                                                     Send Email (1:1)
                                                                 </button>
                                                                 <button
                                                                     onClick={() => { setDropdownOpenId(null); setSelectedRows([lead.id]); setShowBulkEmail(true); }}
                                                                     className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-[#1b57b1]/5 hover:text-[#1b57b1] rounded-lg transition-colors"
                                                                 >
                                                                     <Mail size={14} />
                                                                     Add to Bulk Email
                                                                 </button>
                                                             </div>
                                                             <div className="border-t border-slate-100 mx-2 my-1"></div>
                                                             {/* Lead management group */}
                                                             <div className="px-2 pb-2">
                                                                 <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lead</p>
                                                                 <button
                                                                      onClick={() => { setEditingLead(lead); setDropdownOpenId(null); }}
                                                                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                                                  >
                                                                      <Edit2 size={14} />
                                                                      Edit Lead
                                                                  </button>
                                                                  <button
                                                                      onClick={() => { setLeadsToAssign([lead]); setShowAssignModal(true); setDropdownOpenId(null); }}
                                                                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                                                  >
                                                                      <Target size={14} />
                                                                      Assign to Campaign
                                                                  </button>
                                                                  <button
                                                                      onClick={() => { handleDuplicateLead(lead); setDropdownOpenId(null); }}
                                                                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                                                  >
                                                                     <Copy size={14} />
                                                                     Duplicate
                                                                 </button>
                                                                 <button
                                                                     onClick={() => { handleDeleteLead(lead.id); setDropdownOpenId(null); }}
                                                                     className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                 >
                                                                     <Trash2 size={14} />
                                                                     Delete
                                                                 </button>
                                                             </div>
                                                         </div>
                                                     )}
                                                 </div>
                                             </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-500">
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

            {/* Click-outside overlay to close dropdown */}
            {dropdownOpenId && (
                <div className="fixed inset-0 z-30" onClick={() => setDropdownOpenId(null)} />
            )}

            {/* Bulk Email Modal (multiple leads) */}
            {showBulkEmail && user && (
                <BulkEmailModal
                    leads={filteredLeads}
                    selectedIds={selectedRows}
                    senderName={user.full_name || ''}
                    senderEmail={user.email || ''}
                    userId={user.id}
                    onClose={() => setShowBulkEmail(false)}
                    onSuccess={(sent) => {
                        setShowBulkEmail(false);
                        setSelectedRows([]);
                        fetchEmailLogs();
                        addNotification({
                            title: 'Bulk Email Sent',
                            message: `Successfully sent emails to ${sent} lead${sent !== 1 ? 's' : ''}.`,
                            type: 'success',
                        });
                    }}
                />
            )}

            {/* Single Lead Email Modal (1:1) */}
            {singleEmailLead && user && (
                <BulkEmailModal
                    leads={[singleEmailLead]}
                    selectedIds={[singleEmailLead.id]}
                    senderName={user.full_name || ''}
                    senderEmail={user.email || ''}
                    userId={user.id}
                    onClose={() => setSingleEmailLead(null)}
                    onSuccess={(sent) => {
                        setSingleEmailLead(null);
                        fetchEmailLogs();
                        addNotification({
                            title: 'Email Sent',
                            message: `Email successfully sent to ${singleEmailLead.email}.`,
                            type: 'success',
                        });
                        toast.success(`Email sent to ${singleEmailLead.email}`);
                    }}
                />
            )}

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
                                source: formData.get('source') as string,
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
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Lead Source</label>
                                <select 
                                    name="source" 
                                    defaultValue={editingLead.source || 'scraper'} 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all cursor-pointer"
                                >
                                    <option value="scraper">Lead Scraper</option>
                                    <option value="csv">CSV Import</option>
                                </select>
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

            {/* Assign to Campaign Modal */}
            <AssignToCampaignModal 
                open={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                leads={leadsToAssign}
                onSuccess={() => {
                    setShowAssignModal(false);
                    setSelectedRows([]);
                    fetchLeads(); // Refresh leads to show updated campaign association if needed
                }}
            />
        </AppContainer>
    );
};

export default LeadsList;
