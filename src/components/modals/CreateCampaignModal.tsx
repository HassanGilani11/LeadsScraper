import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore, Campaign } from '@/store/useStore';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Switch,
} from '@mui/material';
import {
    X,
    Plus,
    Rocket,
    Info,
    Loader2,
    Save,
    Trash2,
    Clock,
    Mail,
    ChevronRight
} from 'lucide-react';
import { logAuditAction } from '@/utils/auditLogger';

interface CreateCampaignModalProps {
    open: boolean;
    onClose: () => void;
    campaign?: Campaign | null;
}

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ open, onClose, campaign }) => {
    const { user, addCampaign, updateCampaign } = useStore();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'sequence'>('general');
    const [steps, setSteps] = useState<any[]>([]);
    
    useEffect(() => {
        if (campaign) {
            setName(campaign.name);
            setDescription(campaign.description || '');
            setTags(campaign.tags || []);
            setIsActive(campaign.status === 'running');
            fetchSteps(campaign.id);
        } else {
            setName('');
            setDescription('');
            setTags([]);
            setIsActive(true);
            setSteps([{ step_number: 1, subject: '', body_html: '', delay_days: 0 }]); // Default first step
        }
    }, [campaign, open]);

    const fetchSteps = async (campaignId: string) => {
        const { data, error } = await supabase
            .from('campaign_steps')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('step_number', { ascending: true });
        
        if (data && data.length > 0) {
            setSteps(data);
        } else if (!error) {
            setSteps([{ step_number: 1, subject: '', body_html: '', delay_days: 0 }]);
        }
    };

    const handleAddStep = () => {
        const nextNum = steps.length + 1;
        setSteps([...steps, { step_number: nextNum, subject: '', body_html: '', delay_days: 3 }]);
    };

    const handleRemoveStep = (index: number) => {
        const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_number: i + 1 }));
        setSteps(newSteps);
    };

    const updateStep = (index: number, field: string, value: any) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setSteps(newSteps);
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        if (!user) return;

        try {
            setLoading(true);
            const campaignData = {
                user_id: user.id,
                name: name.trim(),
                description: description.trim(),
                status: isActive ? 'running' : 'paused',
                target_keywords: tags,
            } as any;

            if (campaign) {
                // Update Campaign
                const { data, error } = await supabase
                    .from('campaigns')
                    .update(campaignData)
                    .eq('id', campaign.id)
                    .select()
                    .single();

                if (error) throw error;

                if (data) {
                    // Update Steps
                    await supabase.from('campaign_steps').delete().eq('campaign_id', campaign.id);
                    const stepsToInsert = steps.map(s => ({
                        campaign_id: data.id,
                        user_id: user.id,
                        step_number: s.step_number,
                        subject: s.subject || 'No Subject',
                        body_html: s.body_html || '',
                        delay_days: s.delay_days || 0
                    }));
                    await supabase.from('campaign_steps').insert(stepsToInsert);

                    updateCampaign({
                        ...data,
                        leads: campaign.leads,
                        tags: data.target_keywords || []
                    });
                    
                    onClose();
                }
            } else {
                // Create Campaign
                const { data, error } = await supabase
                    .from('campaigns')
                    .insert({ ...campaignData, created_at: new Date().toISOString() })
                    .select()
                    .single();

                if (error) throw error;

                if (data) {
                    // Insert Steps
                    const stepsToInsert = steps.map(s => ({
                        campaign_id: data.id,
                        user_id: user.id,
                        step_number: s.step_number,
                        subject: s.subject || 'No Subject',
                        body_html: s.body_html || '',
                        delay_days: s.delay_days || 0
                    }));
                    await supabase.from('campaign_steps').insert(stepsToInsert);

                    addCampaign({
                        ...data,
                        leads: 0,
                        tags: data.target_keywords || []
                    });

                    onClose();
                }
            }
        } catch (err) {
            console.error('Error saving campaign:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTag = (tagToDelete: string) => {
        setTags(tags.filter(tag => tag !== tagToDelete));
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newTag.trim()) {
            if (!tags.includes(newTag.trim())) {
                setTags([...tags, newTag.trim()]);
            }
            setNewTag('');
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                className: "rounded-2xl shadow-2xl overflow-hidden"
            }}
        >
            <DialogTitle className="m-0 p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">{campaign ? 'Edit Campaign' : 'Create New Campaign'}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        {campaign ? 'Update your campaign details and strategy.' : 'Define your lead generation parameters and strategy.'}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                >
                    <X size={20} />
                </button>
            </DialogTitle>

            <DialogContent className="p-0 flex flex-col bg-white overflow-hidden h-[600px]">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-100 bg-slate-50/50 px-6">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'general' ? 'border-[#1b57b1] text-[#1b57b1]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        General Info
                    </button>
                    <button
                        onClick={() => setActiveTab('sequence')}
                        className={`px-4 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'sequence' ? 'border-[#1b57b1] text-[#1b57b1]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Email Sequence
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeTab === 'general' ? (
                        <>
                            {/* Campaign Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 block">Campaign Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Q1 SaaS Outreach"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1b57b1]/20 focus:border-[#1b57b1] outline-none transition-all"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 block">Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="Describe the goal of this campaign..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1b57b1]/20 focus:border-[#1b57b1] outline-none transition-all resize-none"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            {/* Target Audience Tags */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-end mb-1">
                                    <label className="text-sm font-bold text-slate-700">Target Audience</label>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add interests or job titles</span>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-2 min-h-[100px] align-top transition-all focus-within:ring-2 focus-within:ring-[#1b57b1]/10 focus-within:border-[#1b57b1]/30">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b57b1]/10 text-[#1b57b1] text-xs font-bold rounded-lg group animate-in fade-in zoom-in duration-200"
                                        >
                                            {tag}
                                            <button
                                                onClick={() => handleDeleteTag(tag)}
                                                className="p-0.5 hover:bg-[#1b57b1]/20 rounded-full cursor-pointer transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        placeholder="Add custom tag..."
                                        className="bg-transparent border-none outline-none text-sm p-1 flex-1 min-w-[150px] text-slate-600 placeholder:text-slate-400"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyDown={handleAddTag}
                                    />
                                </div>
                            </div>

                            {/* Active Status Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#1b57b1]/5 border border-[#1b57b1]/10">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#1b57b1]/10 flex items-center justify-center text-[#1b57b1]">
                                        <Rocket size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Active Status</p>
                                        <p className="text-xs text-slate-500 font-medium">Automatically start scraping leads after creation</p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={isActive} 
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#1b57b1' },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1b57b1' },
                                    }} 
                                />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-bold text-slate-700">Outreach Sequence</label>
                                    <p className="text-xs text-slate-500">Define the automated follow-up steps for this campaign.</p>
                                </div>
                                <button
                                    onClick={handleAddStep}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b57b1] text-white text-xs font-bold rounded-lg hover:bg-[#154690] transition-all"
                                >
                                    <Plus size={14} /> Add Step
                                </button>
                            </div>

                            <div className="space-y-4">
                                {steps.map((step, index) => (
                                    <div key={index} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-[#1b57b1] text-white flex items-center justify-center text-[10px] font-bold">
                                                    {index + 1}
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">
                                                    {index === 0 ? 'First Touch' : `Follow-up #${index}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {index > 0 && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Wait</span>
                                                        <input 
                                                            type="number" 
                                                            value={step.delay_days}
                                                            onChange={(e) => updateStep(index, 'delay_days', parseInt(e.target.value))}
                                                            className="w-12 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold text-[#1b57b1]"
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Days</span>
                                                    </div>
                                                )}
                                                {index > 0 && (
                                                    <button onClick={() => handleRemoveStep(index)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <input
                                                type="text"
                                                placeholder="Email Subject..."
                                                value={step.subject}
                                                onChange={(e) => updateStep(index, 'subject', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all"
                                            />
                                            <textarea
                                                rows={4}
                                                placeholder="Email Content... (Use {{first_name}}, {{company}} etc.)"
                                                value={step.body_html}
                                                onChange={(e) => updateStep(index, 'body_html', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {activeTab === 'general' && (
                    <div className="px-6 py-3 bg-amber-50/50 border-t border-amber-100 flex items-center gap-2">
                        <Info size={14} className="text-amber-600" />
                        <p className="text-[10px] text-amber-700 font-medium">
                            Each lead will be automatically enrolled in your sequence after extraction.
                        </p>
                    </div>
                )}
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
                    onClick={handleSave}
                    disabled={loading || !name.trim()}
                    className="px-6 py-2 bg-[#1b57b1] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[#1b57b1]/20 cursor-pointer flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : (campaign ? <Save size={18} /> : <Plus size={18} />)}
                    {loading ? (campaign ? 'Saving...' : 'Creating...') : (campaign ? 'Save Changes' : 'Create Campaign')}
                </button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateCampaignModal;
