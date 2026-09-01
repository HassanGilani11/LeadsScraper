import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { session, user, isLoading, setSession, setUser } = useStore();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!session?.user) return;

        const syncProfile = async () => {
            try {
                let { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (!data && session.user.email) {
                    const { data: emailData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('email', session.user.email)
                        .maybeSingle();
                    if (emailData) data = emailData;
                }

                if (data) {
                    if (data.status !== 'Active') {
                        console.warn(`Protected Route: User status is ${data.status}. Logging out...`);
                        await supabase.auth.signOut();
                        setSession(null);
                        setUser(null);
                        navigate('/auth', { 
                            state: { 
                                error: `Your account is ${data.status.toLowerCase()}. Please contact support.` 
                            },
                            replace: true
                        });
                        return;
                    }

                    setUser({
                        id: data.id,
                        email: data.email || session.user.email || '',
                        full_name: data.full_name || session.user.email?.split('@')[0] || 'User',
                        role: data.role || 'Member',
                        plan: data.plan || 'Starter',
                        credits: data.credits ?? 0,
                        max_credits: data.max_credits || (data.plan === 'Enterprise' ? 500 : data.plan === 'Pro' ? 100 : 20),
                        company: data.company || '',
                        avatar_url: data.avatar_url || '',
                        last_reset_date: data.last_reset_date,
                        status: data.status || 'Active',
                        webhook_url: data.webhook_url || '',
                        webhook_enabled: data.webhook_enabled || false
                    });
                }
            } catch (err) {
                console.error("Error checking user status/profile in ProtectedRoute:", err);
            }
        };

        if (!user || user.id !== session.user.id) {
            syncProfile();
        }
    }, [location.pathname, session, user, navigate, setSession, setUser]);

    if (isLoading || (session && !user)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b57b1]"></div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
