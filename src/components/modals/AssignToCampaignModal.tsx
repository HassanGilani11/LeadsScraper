import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore, Campaign, Lead } from '@/store/useStore';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    X,
    Loader2,
    Check,
    Target,
    ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface AssignToCampaignModalProps {
    open: boolean;
    onClose: () => void;
    leads: Lead[];
    onSuccess: () => void;
}

const AssignToCampaignModal: React.FC<AssignToCampaignModalProps> = ({ open, onClose, leads, onSuccess }) => {
    const { campaigns, updateLead } = useStore();
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAssign = async () => {
        if (!selectedCampaignId) return;
        setLoading(true);

        try {
            const leadIds = leads.map(l => l.id);
            const { error } = await supabase
                .from('leads')
                .update({ campaign_id: selectedCampaignId })
                .in('id', leadIds);

            if (error) throw error;

            // Update local state
            leads.forEach(lead => {
                updateLead({ ...lead, campaign_id: selectedCampaignId });
            });

            toast.success(`Successfully assigned ${leads.length} lead${leads.length !== 1 ? 's' : ''} to campaign`);
            onSuccess();
        } catch (err) {
            console.error('Error assigning leads to campaign:', err);
            toast.error('Failed to assign leads to campaign');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                className: "rounded-2xl shadow-2xl overflow-hidden"
            }}
        >
            <DialogTitle className="m-0 p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Assign to Campaign</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Select a campaign to assign {leads.length} lead{leads.length !== 1 ? 's' : ''}.
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                >
                    <X size={20} />
                </button>
            </DialogTitle>

            <DialogContent className="p-4 bg-white max-h-[400px] overflow-y-auto">
                <div className="space-y-2">
                    {campaigns.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-slate-500">No campaigns found. Please create a campaign first.</p>
                        </div>
                    ) : (
                        campaigns.map((campaign) => (
                            <button
                                key={campaign.id}
                                onClick={() => setSelectedCampaignId(campaign.id)}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${
                                    selectedCampaignId === campaign.id
                                        ? 'bg-[#1b57b1]/5 border-[#1b57b1] shadow-sm'
                                        : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                        selectedCampaignId === campaign.id ? 'bg-[#1b57b1] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                                    }`}>
                                        <Target size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className={`text-sm font-bold ${selectedCampaignId === campaign.id ? 'text-[#1b57b1]' : 'text-slate-900'}`}>{campaign.name}</p>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{campaign.status}</p>
                                    </div>
                                </div>
                                {selectedCampaignId === campaign.id ? (
                                    <div className="w-6 h-6 rounded-full bg-[#1b57b1] text-white flex items-center justify-center">
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                ) : (
                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-400" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </DialogContent>

            <DialogActions className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleAssign}
                    disabled={loading || !selectedCampaignId}
                    className="px-6 py-2 bg-[#1b57b1] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[#1b57b1]/20 cursor-pointer flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    {loading ? 'Assigning...' : 'Assign Leads'}
                </button>
            </DialogActions>
        </Dialog>
    );
};

export default AssignToCampaignModal;
