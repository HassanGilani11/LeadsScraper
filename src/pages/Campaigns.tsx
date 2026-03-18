import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AppContainer from '@/components/layout/AppContainer';
import { supabase } from '@/lib/supabase';
import { useStore, Campaign } from '@/store/useStore';
import {
    Plus,
    Play,
    Pause,
    Trash2,
    Search,
    Pencil,
    Users,
    ChevronDown,
    Download,
    Copy,
    CheckCircle2,
    Circle
} from 'lucide-react';
import CreateCampaignModal from '@/components/modals/CreateCampaignModal';

const Campaigns = () => {
    const { campaigns, setCampaigns, addCampaign, user, searchQuery, setSearchQuery } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [sortBy, setSortBy] = useState('newest');
    const [selectedRows, setSelectedRows] = useState<string[]>([]);

    const filteredCampaigns = campaigns
        .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'leads') return (b.leads || 0) - (a.leads || 0);
            return 0;
        });

    const handleExportCSV = () => {
        const itemsToExport = selectedRows.length > 0 
            ? campaigns.filter(c => selectedRows.includes(c.id))
            : filteredCampaigns;

        if (itemsToExport.length === 0) return;
        
        const headers = ['Campaign Name', 'Status', 'Leads Extracted', 'Created Date', 'Tags'];
        const rows = itemsToExport.map(c => [
            c.name,
            c.status,
            c.leads || 0,
            new Date(c.created_at).toLocaleDateString(),
            (c.tags || []).join('; ')
        ]);
        
        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${(String(cell) || '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `campaigns_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDuplicateCampaign = async (campaign: Campaign) => {
        if (!user) return;
        
        const newCampaign = {
            name: `${campaign.name} (Copy)`,
            description: campaign.description,
            status: 'draft' as const,
            tags: campaign.tags,
            user_id: user.id,
            leads: 0 // New campaign starts with 0 leads
        };

        try {
            const { data, error } = await supabase
                .from('campaigns')
                .insert([newCampaign])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                addCampaign(data);
            }
        } catch (err) {
            console.error('Error duplicating campaign:', err);
            alert('Failed to duplicate campaign.');
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
        if (selectedRows.length === filteredCampaigns.length && filteredCampaigns.length > 0) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filteredCampaigns.map(c => c.id));
        }
    };

    const handleEdit = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setIsModalOpen(true);
    };

    const handleNewCampaign = () => {
        setSelectedCampaign(null);
        setIsModalOpen(true);
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'running' ? 'paused' : 'running';
        try {
            const { error } = await supabase
                .from('campaigns')
                .update({ status: nextStatus })
                .eq('id', id);
            
            if (error) throw error;

            setCampaigns(campaigns.map(c => 
                c.id === id ? { ...c, status: nextStatus } : c
            ));
        } catch (err) {
            console.error('Error toggling campaign status:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return;
        
        try {
            const { error } = await supabase
                .from('campaigns')
                .delete()
                .eq('id', id);
            
            if (error) throw error;

            setCampaigns(campaigns.filter(c => c.id !== id));
        } catch (err) {
            console.error('Error deleting campaign:', err);
        }
    };

    const totalLeads = campaigns.reduce((acc, c) => acc + (c.leads || 0), 0);

    return (
        <AppContainer title="Campaigns Management">
            <div className="flex flex-col gap-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#1b57b1]/10 flex items-center justify-center text-[#1b57b1] shadow-inner">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 leading-tight">
                                {campaigns.length.toLocaleString()} Active {campaigns.length === 1 ? 'Campaign' : 'Campaigns'}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">
                                Tracking <span className="text-slate-900 font-bold">{totalLeads.toLocaleString()}</span> {totalLeads === 1 ? 'lead' : 'leads'} across your active marketing strategies.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                            onClick={handleExportCSV}
                            className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                            <Download size={18} />
                            Export CSV
                        </button>
                        <button
                            onClick={handleNewCampaign}
                            className="flex-1 sm:flex-none px-4 py-2 bg-[#1b57b1] text-white rounded-xl text-sm font-bold hover:bg-[#154690] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#1b57b1]/20"
                        >
                            <Plus size={18} />
                            New Campaign
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
                                placeholder="Filter campaigns..."
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
                                    <option value="leads">Sort by: Lead Count</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80">
                                    <th className="p-4 w-12 text-center pl-6">
                                        <button onClick={toggleAll} className="text-slate-400 hover:text-[#1b57b1] transition-colors focus:outline-none cursor-pointer">
                                            {selectedRows.length === filteredCampaigns.length && filteredCampaigns.length > 0 ? (
                                                <CheckCircle2 size={20} className="text-[#1b57b1] fill-[#1b57b1]/10" />
                                            ) : (
                                                <Circle size={20} />
                                            )}
                                        </button>
                                    </th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Campaign Name</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Leads Extracted</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date Created</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right pr-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCampaigns.length > 0 ? filteredCampaigns.map((campaign, index) => (
                                    <tr 
                                        key={campaign.id} 
                                        className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors group ${index === filteredCampaigns.length - 1 ? 'border-none' : ''} ${selectedRows.includes(campaign.id) ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <td className="p-4 text-center pl-6">
                                            <button onClick={() => toggleRow(campaign.id)} className="text-slate-300 group-hover:text-slate-400 hover:!text-[#1b57b1] transition-colors focus:outline-none cursor-pointer">
                                                {selectedRows.includes(campaign.id) ? (
                                                    <CheckCircle2 size={20} className="text-[#1b57b1] fill-[#1b57b1]/10" />
                                                ) : (
                                                    <Circle size={20} />
                                                )}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <Link 
                                                    to={`/leads?campaignId=${campaign.id}`}
                                                    className="text-sm font-bold text-slate-900 hover:text-[#1b57b1] transition-colors cursor-pointer"
                                                >
                                                    {campaign.name}
                                                </Link>
                                                {campaign.tags && campaign.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {campaign.tags.map((tag: string) => (
                                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold uppercase tracking-wider">{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <StatusBadge status={campaign.status} />
                                        </td>
                                        <td className="p-4 text-sm font-semibold text-slate-700">
                                            {campaign.leads?.toLocaleString() || 0}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500 font-medium">
                                            {new Date(campaign.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                                                    className="p-2 text-slate-400 hover:bg-white hover:text-[#1b57b1] rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 transition-all focus:opacity-100 cursor-pointer" 
                                                    title={campaign.status === 'running' ? 'Pause' : 'Start'}
                                                >
                                                    {campaign.status === 'running' ? <Pause size={16} /> : <Play size={16} />}
                                                </button>
                                                <button 
                                                    onClick={() => handleDuplicateCampaign(campaign)}
                                                    className="p-2 text-slate-400 hover:bg-white hover:text-[#1b57b1] rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 transition-all focus:opacity-100 cursor-pointer" 
                                                    title="Duplicate Campaign"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleEdit(campaign)}
                                                    className="p-2 text-slate-400 hover:bg-white hover:text-[#1b57b1] rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 transition-all focus:opacity-100 cursor-pointer" 
                                                    title="Edit Campaign"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(campaign.id)}
                                                    className="p-2 text-slate-400 hover:bg-white hover:text-red-600 rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 transition-all focus:opacity-100 cursor-pointer" 
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-500 italic">
                                            No campaigns found. Create your first one to get started!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <CreateCampaignModal 
                open={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedCampaign(null);
                }} 
                campaign={selectedCampaign}
            />
        </AppContainer>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        running: 'bg-green-50 text-green-700 border-green-200',
        paused: 'bg-amber-50 text-amber-700 border-amber-200',
        draft: 'bg-slate-50 text-slate-500 border-slate-200',
        completed: 'bg-blue-50 text-blue-700 border-blue-200',
        failed: 'bg-red-50 text-red-700 border-red-200',
    };

    return (
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${styles[status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
            {status}
        </span>
    );
};

export default Campaigns;
