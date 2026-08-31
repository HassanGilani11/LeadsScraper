import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { Toaster } from 'sonner';
import Dashboard from '@/pages/Dashboard';
import Campaigns from '@/pages/Campaigns';
import LeadScraper from '@/pages/LeadScraper';
import LeadsList from '@/pages/LeadsList';
import Settings from '@/pages/Settings';
import Auth from '@/pages/Auth';
import ResetPassword from '@/pages/ResetPassword';
import Notifications from '@/pages/Notifications';
import LandingPage from '@/pages/LandingPage';
import BillingSuccess from '@/pages/BillingSuccess';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PublicRoute from '@/components/auth/PublicRoute';
import UserManagement from '@/pages/admin/UserManagement';
import AuditLogs from '@/pages/admin/AuditLogs';
import UsageAnalytics from '@/pages/admin/UsageAnalytics';
import RevenueMetrics from '@/pages/admin/RevenueMetrics';
import DataQuality from '@/pages/admin/DataQuality';
import ContactEnquiries from '@/pages/admin/ContactEnquiries';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import Contact from '@/pages/Contact';
import AuthCallback from '@/pages/AuthCallback';

const App = () => {
    const { session, setSession, user, setUser, setLoading, isLoading, setCampaigns, siteSettings, setSiteSettings } = useStore();
    const navigate = useNavigate();

    // Fetch site settings exactly once on app load
    useEffect(() => {
        const fetchSiteSettings = async () => {
            try {
                const { data, error } = await supabase.from('site_settings').select('*').single();
                if (data && !error) {
                    setSiteSettings(data);
                }
            } catch (err) {
                console.error('Error fetching site settings:', err);
            }
        };
        fetchSiteSettings();
    }, []);

    // Apply site settings to the document head automatically
    useEffect(() => {
        if (siteSettings) {
            document.title = siteSettings.meta_description 
                ? `${siteSettings.site_title || 'SyntexDev'} - ${siteSettings.meta_description}`
                : (siteSettings.site_title || 'SyntexDev');
            
            // Meta Description
            let metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute('content', siteSettings.meta_description || '');
            } else if (siteSettings.meta_description) {
                metaDesc = document.createElement('meta');
                metaDesc.setAttribute('name', 'description');
                metaDesc.setAttribute('content', siteSettings.meta_description);
                document.head.appendChild(metaDesc);
            }

            // Favicon
            if (siteSettings.favicon_url) {
                let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link') as HTMLLinkElement;
                    link.rel = 'icon';
                    document.head.appendChild(link);
                }
                link.href = siteSettings.favicon_url;
            }
        }
    }, [siteSettings]);

    useEffect(() => {
        let mounted = true;
        let isFetchingProfile = false;

        const loadUserSession = async (currentSession: any) => {
            if (!currentSession?.user) {
                if (mounted) {
                    setSession(null);
                    setUser(null);
                    setLoading(false);
                }
                return;
            }

            if (mounted) {
                setSession(currentSession);
            }

            if (!isFetchingProfile) {
                isFetchingProfile = true;
                try {
                    await fetchProfile(currentSession.user.id, currentSession.user.email || '');
                } finally {
                    isFetchingProfile = false;
                }
            }
        };

        // Safety fallback timer: guarantee page loading is NEVER stuck indefinitely
        const fallbackTimer = setTimeout(() => {
            if (mounted) {
                setLoading(false);
            }
        }, 3000);

        // 1. Initial Session Check
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (!mounted) return;
            if (error || !session) {
                setSession(null);
                setUser(null);
                setLoading(false);
            } else {
                loadUserSession(session);
            }
        }).catch((err) => {
            console.error("Auth init error:", err);
            if (mounted) {
                setSession(null);
                setUser(null);
                setLoading(false);
            }
        });

        // 2. Auth State Change Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (event === 'SIGNED_OUT' || !session) {
                setSession(null);
                setUser(null);
                setLoading(false);
                return;
            }

            if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED' || !user) {
                await loadUserSession(session);
            } else {
                setSession(session);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(fallbackTimer);
            subscription.unsubscribe();
        };
    }, []);

    const fetchCampaigns = async (userId: string) => {
        try {
            const { data: campaigns, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (campaigns && campaigns.length > 0) {
                // Fetch lead counts via RPC for fast single-roundtrip performance
                try {
                    const { data: leadCounts, error: rpcError } = await supabase
                        .rpc('get_campaign_lead_counts', { p_user_id: userId });

                    if (!rpcError && leadCounts) {
                        const countMap = new Map<string, number>();
                        leadCounts.forEach((row: any) => {
                            countMap.set(row.campaign_id, Number(row.lead_count) || 0);
                        });

                        const campaignsWithCounts = campaigns.map((camp: any) => ({
                            ...camp,
                            leads: countMap.get(camp.id) || 0,
                            tags: camp.target_keywords || []
                        }));

                        setCampaigns(campaignsWithCounts);
                        return;
                    }
                } catch (rpcErr) {
                    console.warn('RPC count failed, falling back to batch count queries:', rpcErr);
                }

                // Fallback if RPC is unavailable
                const campaignsWithCounts = await Promise.all(campaigns.map(async (camp: any) => {
                    const { count, error: countError } = await supabase
                        .from('leads')
                        .select('*', { count: 'exact', head: true })
                        .eq('campaign_id', camp.id);
                    
                    if (countError) console.error(`Error counting leads for campaign ${camp.id}:`, countError);
                    
                    return {
                        ...camp,
                        leads: count ?? 0,
                        tags: camp.target_keywords || []
                    };
                }));

                setCampaigns(campaignsWithCounts);
            } else if (campaigns) {
                setCampaigns([]);
            }
        } catch (err) {
            console.error('Error fetching campaigns:', err);
        }
    };

    const fetchProfile = async (userId: string, email: string) => {
        try {
            // Query by id first, fallback to email to guarantee profile matching
            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (!data && email) {
                const { data: emailData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('email', email)
                    .maybeSingle();
                if (emailData) {
                    data = emailData;
                    error = null;
                }
            }

            if (data) {
                // If user is not Active, terminate session immediately
                if (data.status !== 'Active') {
                    console.warn(`App Startup: User status is ${data.status}. Terminating session...`);
                    await supabase.auth.signOut();
                    setSession(null);
                    setUser(null);
                    setLoading(false);
                    navigate('/auth', { 
                        state: { 
                            error: `Your account is ${data.status.toLowerCase()}. Please contact support.` 
                        },
                        replace: true
                    });
                    return;
                }

                let currentCredits = data.credits ?? 0;
                let lastReset = new Date(data.last_reset_date || data.created_at);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - lastReset.getTime());
                const diffDays = diffTime / (1000 * 60 * 60 * 24);

                let needsReset = false;
                let newMaxCredits = data.max_credits || (data.plan === 'Enterprise' ? 500 : data.plan === 'Pro' ? 100 : 20);

                // Reset logic
                if (data.plan === 'Starter' && diffDays >= 1) {
                    currentCredits = 0;
                    newMaxCredits = 20;
                    needsReset = true;
                } else if ((data.plan === 'Pro' || data.plan === 'Enterprise') && diffDays >= 30) {
                    currentCredits = 0;
                    newMaxCredits = data.plan === 'Pro' ? 100 : 500;
                    needsReset = true;
                }

                if (needsReset) {
                    supabase
                        .from('profiles')
                        .update({ 
                            credits: currentCredits, 
                            max_credits: newMaxCredits,
                            last_reset_date: now.toISOString() 
                        })
                        .eq('id', data.id)
                        .then(() => {}, (err: any) => console.error('Reset credit error:', err));
                }

                setUser({
                    id: data.id,
                    email: data.email || email,
                    full_name: data.full_name || email.split('@')[0],
                    role: data.role || 'Member',
                    plan: data.plan || 'Starter',
                    credits: needsReset ? currentCredits : (data.credits ?? 0),
                    max_credits: needsReset ? newMaxCredits : (data.max_credits || (data.plan === 'Enterprise' ? 500 : data.plan === 'Pro' ? 100 : 20)),
                    company: data.company || '',
                    avatar_url: data.avatar_url || '',
                    last_reset_date: needsReset ? now.toISOString() : data.last_reset_date,
                    status: data.status || 'Active',
                    webhook_url: data.webhook_url || '',
                    webhook_enabled: data.webhook_enabled || false
                });
                
                // Release loading screen immediately, fetch campaigns in background
                setLoading(false);
                fetchCampaigns(data.id).catch(cErr => console.error('Background campaigns fetch error:', cErr));
            } else {
                console.warn('Profile not found for user:', userId, email);
                setLoading(false);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b57b1]"></div>
            </div>
        );
    }

    return (
        <>
            <Routes>
                <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                
                <Route 
                    path="/auth" 
                    element={
                        <PublicRoute>
                            <Auth />
                        </PublicRoute>
                    } 
                />

                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/contact" element={<Contact />} />

                <Route 
                    path="/reset-password" 
                    element={
                        <ProtectedRoute>
                            <ResetPassword />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/dashboard" 
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/scraper" 
                    element={
                        <ProtectedRoute>
                            <LeadScraper />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/campaigns" 
                    element={
                        <ProtectedRoute>
                            <Campaigns />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/leads" 
                    element={
                        <ProtectedRoute>
                            <LeadsList />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/settings" 
                    element={
                        <ProtectedRoute>
                            <Settings />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/notifications" 
                    element={
                        <ProtectedRoute>
                            <Notifications />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/billing/success" 
                    element={
                        <ProtectedRoute>
                            <BillingSuccess />
                        </ProtectedRoute>
                    } 
                />

                {/* Admin Routes */}
                <Route 
                    path="/admin/users" 
                    element={
                        <ProtectedRoute>
                            {user?.role === 'Admin' ? <UserManagement /> : <Navigate to="/dashboard" replace />}
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/admin/audit-logs" 
                    element={
                        <ProtectedRoute>
                            {user?.role === 'Admin' ? <AuditLogs /> : <Navigate to="/dashboard" replace />}
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/admin/usage" 
                    element={
                        <ProtectedRoute>
                            {user?.role === 'Admin' ? <UsageAnalytics /> : <Navigate to="/dashboard" replace />}
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/admin/revenue" 
                    element={
                        <ProtectedRoute>
                            {user?.role === 'Admin' ? <RevenueMetrics /> : <Navigate to="/dashboard" replace />}
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/admin/data-quality" 
                    element={
                        <ProtectedRoute>
                            {user?.role === 'Admin' ? <DataQuality /> : <Navigate to="/dashboard" replace />}
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/admin/enquiries" 
                    element={
                        <ProtectedRoute>
                            {user?.role === 'Admin' ? <ContactEnquiries /> : <Navigate to="/dashboard" replace />}
                        </ProtectedRoute>
                    } 
                />
                
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster
                position="bottom-right"
                expand={false}
                richColors
                closeButton
                toastOptions={{
                    style: { fontFamily: 'inherit', borderRadius: '12px', fontSize: '14px' },
                    duration: 4000,
                }}
            />
        </>
    );
};

export default App;
