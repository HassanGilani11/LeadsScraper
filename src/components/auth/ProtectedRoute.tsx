import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { session, isLoading, setSession, setUser } = useStore();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!session?.user?.id) return;

        const checkUserStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('status')
                    .eq('id', session.user.id)
                    .single();

                if (data && data.status !== 'Active') {
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
                }
            } catch (err) {
                console.error("Error checking user status in ProtectedRoute:", err);
            }
        };

        checkUserStatus();
    }, [location.pathname, session, navigate, setSession, setUser]);

    if (isLoading) {
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
