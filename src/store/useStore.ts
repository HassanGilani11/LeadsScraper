import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: string;
    plan: 'Starter' | 'Pro' | 'Enterprise';
    credits: number;
    max_credits: number;
    company?: string;
    avatar_url?: string;
    last_reset_date?: string;
    status?: string;
}

export interface Campaign {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
    leads: number;
    tags: string[];
    created_at: string;
}

export interface Lead {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    company: string;
    status: string;
    created_at: string;
    campaign_id?: string;
    icp_score?: number;
    industry?: string;
    source?: string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
    read: boolean;
    created_at: string;
}

export interface SiteSettings {
    id: string;
    site_title: string;
    meta_description: string;
    favicon_url: string | null;
}

interface AppState {
    session: Session | null;
    user: UserProfile | null;
    siteSettings: SiteSettings | null;
    isLoading: boolean;
    campaigns: Campaign[];
    leads: Lead[];
    searchQuery: string;
    notifications: Notification[];
    setSession: (session: Session | null) => void;
    setUser: (user: UserProfile | null) => void;
    setSiteSettings: (settings: SiteSettings | null) => void;
    setCampaigns: (campaigns: Campaign[]) => void;
    setLeads: (leads: Lead[]) => void;
    setLoading: (loading: boolean) => void;
    setSearchQuery: (query: string) => void;
    setNotifications: (notifications: Notification[]) => void;
    addNotification: (notification: Omit<Notification, 'id' | 'read' | 'created_at'>) => void;
    markNotificationAsRead: (id: string) => void;
    clearNotifications: () => void;
    addCampaign: (campaign: Campaign) => void;
    updateCampaign: (campaign: Campaign) => void;
    addLead: (lead: Lead) => void;
    updateLead: (lead: Lead) => void;
    removeLead: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
    session: null,
    user: null,
    siteSettings: null,
    isLoading: false,
    campaigns: [],
    leads: [],

    searchQuery: '',
    notifications: [],
    setSession: (session: Session | null) => set({ session }),
    setUser: (user: UserProfile | null) => set({ user }),
    setSiteSettings: (siteSettings: SiteSettings | null) => set({ siteSettings }),
    setCampaigns: (campaigns: Campaign[]) => set({ campaigns }),
    setLeads: (leads: Lead[]) => set({ leads }),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setSearchQuery: (searchQuery: string) => set({ searchQuery }),
    setNotifications: (notifications: Notification[]) => set({ notifications }),
    addNotification: (notification) => set((state) => ({
        notifications: [
            {
                ...notification,
                id: Math.random().toString(36).substr(2, 9),
                read: false,
                created_at: new Date().toISOString()
            },
            ...state.notifications
        ]
    })),
    markNotificationAsRead: (id: string) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    })),
    clearNotifications: () => set({ notifications: [] }),
    addCampaign: (campaign: Campaign) => set((state) => ({ 
        campaigns: [campaign, ...state.campaigns] 
    })),
    updateCampaign: (campaign: Campaign) => set((state) => ({
        campaigns: state.campaigns.map(c => c.id === campaign.id ? campaign : c)
    })),
    addLead: (lead: Lead) => set((state) => ({
        leads: [lead, ...state.leads]
    })),
    updateLead: (lead: Lead) => set((state) => ({
        leads: state.leads.map(l => l.id === lead.id ? lead : l)
    })),
    removeLead: (id: string) => set((state) => ({
        leads: state.leads.filter(l => l.id !== id)
    })),
}));
