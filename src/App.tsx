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

const App = () => {
    const { session, setSession, user, setUser, setLoading, isLoading, setCampaigns } = useStore();
    const navigate = useNavigate();

    useEffect(() => {
        let initialFetchDone = false;

        // Initial session check — primary source of truth on page load
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                initialFetchDone = true;
                fetchProfile(session.user.id, session.user.email!);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes — only re-fetch on explicit sign-in events,
        // NOT on TOKEN_REFRESHED which would cause a race condition that overwrites the correct count
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (session?.user && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) {
                if (!initialFetchDone) {
                    fetchProfile(session.user.id, session.user.email!);
                }
                initialFetchDone = false; // allow future sign-ins to re-fetch
            } else if (!session) {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
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
                const campaignIds = campaigns.map((c: any) => c.id);

                // Fetch all leads for this user's campaigns in one query
                const { data: leadsData, error: leadsError } = await supabase
                    .from('leads')
                    .select('id, campaign_id')
                    .in('campaign_id', campaignIds);

                if (leadsError) {
                    console.error('Error fetching leads for campaigns:', leadsError);
                }

                console.log('Leads fetched for campaigns:', leadsData);

                // Build a count map from the fetched leads
                const countMap: Record<string, number> = {};
                if (leadsData) {
                    leadsData.forEach((lead: { id: string; campaign_id: string }) => {
                        if (lead.campaign_id) {
                            countMap[lead.campaign_id] = (countMap[lead.campaign_id] || 0) + 1;
                        }
                    });
                }

                console.log('Lead count map:', countMap);

                const campaignsWithCounts = campaigns.map((camp: any) => ({
                    ...camp,
                    leads: countMap[camp.id] ?? 0,
                    tags: camp.target_keywords || []
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
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (data) {
                let currentCredits = data.credits;
                let lastReset = new Date(data.last_reset_date || data.created_at);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - lastReset.getTime());
                const diffDays = diffTime / (1000 * 60 * 60 * 24);

                let needsReset = false;
                let newMaxCredits = data.max_credits || 20;

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
                    await supabase
                        .from('profiles')
                        .update({ 
                            credits: currentCredits, 
                            max_credits: newMaxCredits,
                            last_reset_date: now.toISOString() 
                        })
                        .eq('id', userId);
                }

                setUser({
                    id: data.id,
                    email: data.email,
                    full_name: data.full_name,
                    role: data.role || 'Member',
                    plan: data.plan || 'Starter',
                    credits: needsReset ? currentCredits : data.credits || 0,
                    max_credits: needsReset ? newMaxCredits : data.max_credits || 20,
                    company: data.company || '',
                    avatar_url: data.avatar_url || '',
                    last_reset_date: needsReset ? now.toISOString() : data.last_reset_date,
                    status: data.status || 'Active',
                });
                await fetchCampaigns(data.id);
            } else if (!error) {
                // If profile doesn't exist, create a default one
                const newProfile = {
                    id: userId,
                    user_id: userId,
                    email: email,
                    full_name: 'New User',
                    role: 'Member',
                    plan: 'Starter' as const,
                    credits: 0,
                    max_credits: 20,
                    last_reset_date: new Date().toISOString(),
                    status: 'Active'
                };
                await supabase.from('profiles').insert(newProfile);
                setUser({
                    id: newProfile.id,
                    email: newProfile.email,
                    full_name: newProfile.full_name,
                    role: newProfile.role,
                    plan: newProfile.plan,
                    credits: newProfile.credits,
                    max_credits: newProfile.max_credits,
                    company: '',
                    avatar_url: '',
                    last_reset_date: newProfile.last_reset_date,
                    status: newProfile.status
                });
                await fetchCampaigns(newProfile.id);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
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
                
                <Route 
                    path="/auth" 
                    element={
                        <PublicRoute>
                            <Auth />
                        </PublicRoute>
                    } 
                />

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
