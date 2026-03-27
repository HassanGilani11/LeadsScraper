import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, UserCircle, Settings as SettingsIcon, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

interface TopBarProps {
    onMenuClick: () => void;
    title?: string;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick, title }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { 
        user, 
        session, 
        setSession, 
        setUser, 
        searchQuery,
        setSearchQuery,
        notifications,
        markNotificationAsRead,
        leads,
        campaigns,
        setLeads,
        setCampaigns
    } = useStore();

    const unreadCount = notifications.filter(n => !n.read).length;

    // Fetch data if needed for global search
    useEffect(() => {
        if (user && session && (leads.length === 0 || campaigns.length === 0)) {
            const fetchData = async () => {
                const { data: leadsData } = await supabase.from('leads').select('*').eq('user_id', user.id);
                const { data: campaignsData } = await supabase.from('campaigns').select('*').eq('user_id', user.id);
                if (leadsData) setLeads(leadsData);
                if (campaignsData) setCampaigns(campaignsData || []);
            };
            fetchData();
        }
    }, [user, session]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
        };

        if (dropdownOpen || notificationsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownOpen, notificationsOpen]);

    const handleNavigation = (path: string) => {
        navigate(path);
        setDropdownOpen(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        navigate('/auth');
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/leads?q=${encodeURIComponent(searchQuery)}`);
            // The leads page will use the global searchQuery from the store
            // but we add it to the URL for clarity/bookmarking
        }
    };

    const filteredGlobalLeads = searchQuery.length > 1 ? leads.filter(l => 
        `${l.first_name || ''} ${l.last_name || ''} ${l.email || ''} ${l.company || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5) : [];

    const filteredGlobalCampaigns = searchQuery.length > 1 ? campaigns.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3) : [];

    return (
        <header className="h-16 border-b border-slate-200 bg-white px-4 md:px-8 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                <button
                    onClick={onMenuClick}
                    className="p-2 md:hidden text-slate-600 h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                >
                    <Menu size={20} />
                </button>
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 truncate">{title || "Analytics"}</h2>
            </div>

            <div className="flex-1 flex items-center justify-end gap-2 md:gap-4 ml-2">
                <div className="relative w-full max-w-[40px] xs:max-w-[140px] sm:max-w-xs md:max-w-md transition-all duration-300">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Search size={16} />
                    </div>
                    <input
                        className="w-full bg-slate-100 border-none rounded-lg pl-9 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-[#1b57b1]/20 outline-none transition-all placeholder:text-slate-400"
                        placeholder="Search leads, campaigns..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    />
                    
                    {/* Global Search Results Dropdown */}
                    {isSearchFocused && searchQuery.length > 1 && (filteredGlobalLeads.length > 0 || filteredGlobalCampaigns.length > 0) && (
                        <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                            {filteredGlobalCampaigns.length > 0 && (
                                <div>
                                    <div className="px-3 py-1 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campaigns</div>
                                    {filteredGlobalCampaigns.map(c => (
                                        <div 
                                            key={c.id} 
                                            className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                                            onClick={() => {
                                                navigate(`/leads?campaignId=${c.id}`);
                                                setSearchQuery('');
                                            }}
                                        >
                                            <span className="text-sm font-bold text-slate-700 truncate">{c.name}</span>
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{c.status}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {filteredGlobalLeads.length > 0 && (
                                <div className={filteredGlobalCampaigns.length > 0 ? "border-t border-slate-100" : ""}>
                                    <div className="px-3 py-1 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Leads</div>
                                    {filteredGlobalLeads.map(l => (
                                        <div 
                                            key={l.id} 
                                            className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex flex-col"
                                            onClick={() => {
                                                navigate('/leads');
                                                // searchQuery is already set, LeadsList will filter
                                            }}
                                        >
                                            <span className="text-sm font-bold text-slate-700 truncate">{l.first_name || l.last_name ? `${l.first_name || ''} ${l.last_name || ''}`.trim() : (l.company || l.email)}</span>
                                            <span className="text-[10px] text-slate-400 truncate">{l.email} • {l.company || 'Unknown Co'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50 text-center">
                                <button 
                                    onClick={() => navigate('/leads')}
                                    className="text-[10px] font-bold text-[#1b57b1] hover:underline cursor-pointer"
                                >
                                    View All Results
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative" ref={notificationsRef}>
                    <button 
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className={`h-10 w-10 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors cursor-pointer relative ${notificationsOpen ? 'bg-slate-200 text-[#1b57b1]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {notificationsOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] bg-[#1b57b1] text-white px-1.5 py-0.5 rounded-full font-bold">{unreadCount} New</span>
                                )}
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map((n) => (
                                        <div 
                                            key={n.id} 
                                            className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0 ${!n.read ? 'bg-blue-50/50' : ''}`}
                                            onClick={() => {
                                                markNotificationAsRead(n.id);
                                                // Optional: navigate or perform action
                                            }}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-sm font-bold text-slate-900 leading-tight">{n.title}</p>
                                                {!n.read && <div className="size-2 bg-blue-600 rounded-full mt-1"></div>}
                                            </div>
                                            <p className="text-xs text-slate-600 line-clamp-2 mb-1">{n.message}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-8 text-center">
                                        <Bell size={24} className="mx-auto text-slate-200 mb-2" />
                                        <p className="text-sm text-slate-400">No notifications yet</p>
                                    </div>
                                )}
                            </div>
                            <div className="px-4 py-2 border-t border-slate-100 text-center">
                                <button 
                                    onClick={() => {
                                        navigate('/notifications');
                                        setNotificationsOpen(false);
                                    }}
                                    className="text-[10px] font-bold text-[#1b57b1] uppercase tracking-wider hover:underline cursor-pointer"
                                >
                                    View All Notifications
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative" ref={dropdownRef}>
                    <div 
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className={`flex items-center gap-3 cursor-pointer p-1.5 rounded-full transition-all ${dropdownOpen ? 'bg-slate-100 ring-2 ring-[#1b57b1]/20' : 'hover:bg-slate-50'}`}
                    >
                        <div className="hidden lg:block text-right">
                            <p className="text-sm font-bold leading-tight text-slate-900">{user?.full_name || session?.user?.email?.split('@')[0] || 'User'}</p>
                            <p className="text-[10px] font-bold text-[#1b57b1] bg-[#1b57b1]/10 px-1.5 py-0.5 rounded-md uppercase tracking-wide inline-block mt-0.5">{user?.role || 'Member'}</p>
                        </div>
                        <div
                            className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-[#1b57b1] font-bold text-xs"
                        >
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="User Avatar" className="w-full h-full object-cover" />
                            ) : (
                                user?.full_name 
                                    ? user.full_name.split(' ').map(n => n[0]).join('') 
                                    : (session?.user?.email?.charAt(0).toUpperCase() || '?')
                            )}
                        </div>
                    </div>

                    {/* Admin Dropdown Menu */}
                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-3 border-b border-slate-100 mb-1 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 flex items-center justify-center text-[#1b57b1] font-bold text-xs uppercase">
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        user?.full_name?.split(' ').map(n => n[0]).join('') || '?'
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">{user?.full_name || session?.user?.email?.split('@')[0] || 'User'}</p>
                                    <p className="text-[10px] text-slate-500 font-medium truncate">{session?.user?.email || ''}</p>
                                </div>
                            </div>
                            
                            <div className="px-2 space-y-0.5 flex flex-col">
                                <button 
                                    onClick={() => handleNavigation('/settings')}
                                    className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors text-left w-full cursor-pointer"
                                >
                                    <UserCircle size={16} className="text-slate-400" />
                                    My Profile
                                </button>
                                <button 
                                    onClick={() => handleNavigation('/settings')}
                                    className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors text-left w-full cursor-pointer"
                                >
                                    <SettingsIcon size={16} className="text-slate-400" />
                                    Account Settings
                                </button>
                                
                                <button 
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors text-left w-full cursor-pointer"
                                >
                                    <LogOut size={16} className="text-red-500" />
                                    Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopBar;
