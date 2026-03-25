import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import PlanUpgradeModal from '@/components/modals/PlanUpgradeModal';
import {
    Rocket,
    LayoutDashboard,
    Search,
    Megaphone,
    Users,
    Settings,
    HelpCircle,
    LogOut,
    Zap,
    UserCog,
    History
} from 'lucide-react';

const navItems = [
    { text: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '/dashboard' },
    { text: 'Lead Scraper', icon: <Search size={20} />, href: '/scraper' },
    { text: 'Campaigns', icon: <Megaphone size={20} />, href: '/campaigns' },
    { text: 'Leads List', icon: <Users size={20} />, href: '/leads' },
    { text: 'Settings', icon: <Settings size={20} />, href: '/settings' },
];

interface SidebarProps {
    open: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;
    const { user, setUser, setSession } = useStore();
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        navigate('/auth');
    };

    const creditPercentage = user ? Math.round((user.credits / user.max_credits) * 100) : 0;

    return (
        <aside className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}
        `}>
            {/* Logo */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1b57b1] flex items-center justify-center text-white">
                    <Rocket size={24} />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold leading-tight">Leads Scraper</h1>
                    <span className="text-[10px] font-semibold bg-[#1b57b1]/10 text-[#1b57b1] px-1.5 py-0.5 rounded uppercase tracking-wider block w-fit">
                        {user?.plan || 'Starter'} Plan
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
                {navItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                        <Link
                            key={item.text}
                            to={item.href}
                            className={`
                                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                                ${active
                                    ? 'bg-[#1b57b1]/10 text-[#1b57b1]'
                                    : 'text-slate-600 hover:bg-slate-100'}
                            `}
                        >
                            {item.icon}
                            <span>{item.text}</span>
                        </Link>
                    );
                })}

                {/* Admin Support Section */}
                {user?.role === 'Admin' && (
                    <div className="pt-6 mt-6 border-t border-slate-100">
                        <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Control</div>
                        <Link
                            to="/admin/users"
                            className={`
                                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                                ${pathname === '/admin/users'
                                    ? 'bg-[#1b57b1]/10 text-[#1b57b1]'
                                    : 'text-slate-600 hover:bg-slate-100'}
                            `}
                        >
                            <UserCog size={20} />
                            <span>User Management</span>
                        </Link>
                        <Link
                            to="/admin/audit-logs"
                            className={`
                                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer mt-1
                                ${pathname === '/admin/audit-logs'
                                    ? 'bg-[#1b57b1]/10 text-[#1b57b1]'
                                    : 'text-slate-600 hover:bg-slate-100'}
                            `}
                        >
                            <History size={20} />
                            <span>Audit Logs</span>
                        </Link>
                    </div>
                )}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200">
                {/* Credits Card */}
                <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100 shadow-sm">
                    <div className="flex justify-between text-[11px] mb-2 font-bold uppercase text-slate-500 tracking-wider">
                        <span>Credits Used</span>
                        <span>{creditPercentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className="bg-[#1b57b1] h-full transition-all duration-1000 ease-out flex items-center justify-end pr-1 shadow-[0_0_8px_rgba(27,87,177,0.4)]" 
                            style={{ width: `${creditPercentage}%` }}
                        >
                            <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                        </div>
                    </div>
                    <p className="text-[10px] mt-2 text-slate-400 font-medium flex justify-between">
                        <span>{user?.credits?.toLocaleString() || 0} / {user?.max_credits?.toLocaleString() || 0}</span>
                        <span className="italic">
                            {user?.plan === 'Starter' ? 'Resets daily' : 'Resets monthly'}
                        </span>
                    </p>
                </div>



                {/* Upgrade button — hidden for Enterprise */}
                {user?.plan !== 'Enterprise' && (
                    <button
                        onClick={() => setIsUpgradeModalOpen(true)}
                        className="w-full bg-[#1b57b1] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#154690] transition-all mb-4 cursor-pointer shadow-md shadow-[#1b57b1]/10 flex items-center justify-center gap-2"
                    >
                        <Zap size={14} />
                        {user?.plan === 'Pro' ? 'Upgrade to Enterprise' : 'Upgrade Plan'}
                    </button>
                )}

                <PlanUpgradeModal
                    isOpen={isUpgradeModalOpen}
                    onClose={() => setIsUpgradeModalOpen(false)}
                    currentPlan={user?.plan || 'Starter'}
                />

                <div className="space-y-1">
                    <div className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
                        <HelpCircle size={18} />
                        <span className="text-sm">Support</span>
                    </div>
                    <div 
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-red-500 transition-colors cursor-pointer"
                    >
                        <LogOut size={18} />
                        <span className="text-sm">Logout</span>
                    </div>
                </div>
            </div>

            {/* Mobile overlay */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/20 z-[-1] md:hidden"
                    onClick={onClose}
                />
            )}
        </aside>
    );
};

export default Sidebar;
