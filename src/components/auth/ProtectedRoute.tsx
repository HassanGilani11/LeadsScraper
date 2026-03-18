import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { session, user, isLoading } = useStore();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b57b1]"></div>
            </div>
        );
    }

    if (!session) {
        // Redirect to /auth but save the current location they were trying to access
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    if (user?.status === 'Pending' && location.pathname !== '/reset-password') {
        return <Navigate to="/reset-password" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
