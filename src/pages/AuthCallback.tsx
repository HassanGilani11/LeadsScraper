import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const AuthCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            // Get URL params/hash
            const hash = window.location.hash || window.location.search;
            console.log("AuthCallback received hash/query:", hash);
            
            // Check if this is an invite or recovery type link
            const isInviteOrRecovery = hash.includes('type=invite') || 
                                      hash.includes('type=recovery') || 
                                      hash.includes('recovery');
            
            // Wait for session to be established by Supabase client
            const { data: { session } } = await supabase.auth.getSession();
            
            if (isInviteOrRecovery) {
                console.log("Redirecting to password setup page...");
                navigate('/reset-password', { replace: true });
            } else if (session) {
                console.log("Redirecting to dashboard...");
                navigate('/dashboard', { replace: true });
            } else {
                console.log("Redirecting to auth...");
                navigate('/auth', { replace: true });
            }
        };
        handleCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b57b1]"></div>
        </div>
    );
};

export default AuthCallback;
