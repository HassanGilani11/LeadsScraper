import React, { useState, useEffect } from 'react';
import AppContainer from '@/components/layout/AppContainer';
import { Search, Globe, Filter, AlertCircle, CheckCircle2, Loader2, ArrowRight, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PlanUpgradeModal from '@/components/modals/PlanUpgradeModal';
import { logAuditAction } from '@/utils/auditLogger';

const LeadScraper = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const navigate = useNavigate();
    const { user, campaigns, addLead, updateCampaign, setUser } = useStore();
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
    const [stats, setStats] = useState({ totalLeads: 0, avgMatch: 0 });

    useEffect(() => {
        if (!selectedCampaignId && campaigns.length > 0) {
            setSelectedCampaignId(campaigns[0].id);
        }
    }, [campaigns, selectedCampaignId]);

    useEffect(() => {
        if (user) {
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const { data: leads, error } = await supabase
                .from('leads')
                .select('icp_score')
                .eq('user_id', user!.id);

            if (leads) {
                const total = leads.length;
                const avg = total > 0 
                    ? Math.round((leads.reduce((acc, curr) => acc + (Number(curr.icp_score) || 0), 0) / total) * 10)
                    : 0;
                setStats({ totalLeads: total, avgMatch: avg });
            }
        } catch (err) {
            console.error('Error fetching scraper stats:', err);
        }
    };

    const handleScrape = async () => {
        if (!url.trim()) {
            setError('Please enter a valid domain or search keyword.');
            return;
        }

        try {
            setError(null);
            setSuccess(null);
            toast.loading(`Starting extraction for ${url}...`, { id: 'scrape-toast' });

            if (!user) {
                setError('You must be logged in to scrape leads.');
                return;
            }

            // Credit Check
            if (user.credits >= user.max_credits) {
                setIsUpgradeModalOpen(true);
                return;
            }

            const payload = {
                url,
                textContent: `Analyze website: ${url}`,
                campaignId: selectedCampaignId || null,
                userId: user.id
            };

            const response = await supabase.functions.invoke('extract-leads', {
                body: payload
            });
            
            const { data, error: functionError } = response;

            if (functionError) {
                console.error("Function error:", functionError);
                
                let errorMsg = "Failed to reach extraction service.";
                
                if (functionError instanceof Error) {
                    errorMsg = `Extraction error: ${functionError.message}`;
                } else if (typeof functionError === 'object' && functionError !== null) {
                    const errObj = functionError as any;
                    errorMsg = `Server error (${errObj.status || 'unknown'}): ${errObj.message || 'Check Supabase logs'}`;
                }
                
                throw new Error(errorMsg);
            }

            if (data?.success) {
                setSuccess(data.message);
                toast.success(`Success! Extracted ${data.leads?.length || 0} leads.`, { id: 'scrape-toast' });
                
                // Add new leads to store and update campaign count
                if (data.leads && Array.isArray(data.leads)) {
                    data.leads.forEach((l: any) => addLead(l));
                    
                    const extractedCount = data.leads.length;

                    // Deduct (increment used) credits
                    const newCredits = user.credits + extractedCount;
                    
                    // Update database
                    await supabase
                        .from('profiles')
                        .update({ credits: newCredits })
                        .eq('id', user.id);
                    
                    // Update store
                    setUser({
                        ...user,
                        credits: newCredits
                    });

                    if (selectedCampaignId) {
                        const campaign = campaigns.find(c => c.id === selectedCampaignId);
                        if (campaign) {
                            updateCampaign({
                                ...campaign,
                                leads: (campaign.leads || 0) + data.leads.length
                            });
                        }
                    }

                    await logAuditAction({
                        actionType: 'DATA_EXTRACTION_SUCCESS',
                        targetEntity: url,
                        beforeValue: {},
                        afterValue: { 
                            leadsCount: data.leads.length,
                            url,
                            campaignId: selectedCampaignId
                        },
                        note: `Successfully extracted ${data.leads.length} leads from ${url}`,
                        metadata: { 
                            url,
                            leadsCount: data.leads.length,
                            campaignId: selectedCampaignId
                        }
                    });
                }
            } else {
                setError(data?.error || 'Failed to extract leads.');
            }

        } catch (err: any) {
            console.error('Scraping error:', err);
            setError(err.message || 'An unexpected error occurred during scraping.');
            toast.error(err.message || 'Failed to extract leads', { id: 'scrape-toast' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppContainer title="Lead Scraper">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-8 w-full mx-auto">
                <div className="text-center mb-6 md:mb-10">
                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Find Your Ideal Leads</h3>
                    <p className="text-sm text-slate-500">Enter a website URL or keyword to find prospects.</p>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Assign to Campaign</label>
                            <div className="relative">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select
                                    value={selectedCampaignId}
                                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 md:py-4 text-sm focus:ring-2 focus:ring-[#1b57b1]/20 outline-none transition-all appearance-none cursor-pointer font-medium text-slate-700"
                                >
                                    <option value="">No Campaign (General)</option>
                                    {campaigns.map(camp => (
                                        <option key={camp.id} value={camp.id}>
                                            {camp.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Target Domain or Keywords</label>
                            <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                                    placeholder="Enter domain or keyword"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 md:py-4 text-sm focus:ring-2 focus:ring-[#1b57b1]/20 outline-none transition-all shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                            <AlertCircle size={16} className="shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-green-50 p-4 rounded-xl border border-green-100">
                            <div className="flex items-center gap-3 text-green-700">
                                <CheckCircle2 size={20} className="shrink-0" />
                                <div>
                                    <p className="font-bold">{success}</p>
                                    <p className="text-green-600/80 mt-0.5">We processed {url} successfully.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => navigate('/leads')}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white text-green-700 border border-green-200 rounded-lg font-bold hover:bg-green-50 transition-colors shrink-0"
                            >
                                View Leads
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                        <button 
                            onClick={handleScrape}
                            disabled={loading}
                            className="flex-1 px-6 py-3.5 md:py-4 bg-[#1b57b1] text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-[#1b57b1]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Search size={18} />
                                    Start Scraping
                                </>
                            )}
                        </button>
                        <button className="px-6 py-3.5 md:py-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer">
                            <Filter size={18} />
                            Advanced
                        </button>
                    </div>
                </div>

                <div className="mt-8 md:mt-12 pt-8 md:pt-10 border-t border-slate-100 grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
                    <div>
                        <p className="text-xl md:text-2xl font-bold text-slate-900">{stats.totalLeads.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Leads Analyzed</p>
                    </div>
                    <div>
                        <p className="text-xl md:text-2xl font-bold text-slate-900">{stats.avgMatch}%</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Match Rate</p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <p className="text-xl md:text-2xl font-bold text-slate-900">{campaigns.length}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Active Campaigns</p>
                    </div>
                </div>
            </div>

            <PlanUpgradeModal 
                isOpen={isUpgradeModalOpen} 
                onClose={() => setIsUpgradeModalOpen(false)} 
                currentPlan={user?.plan || 'Starter'}
            />
        </AppContainer>
    );
};

export default LeadScraper;
