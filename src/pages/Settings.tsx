import React, { useState } from 'react';
import AppContainer from '@/components/layout/AppContainer';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { Settings as SettingsIcon, Shield, CreditCard, Bell, User, Key, LayoutGrid, Loader2, CheckCircle2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import PlanUpgradeModal from '@/components/modals/PlanUpgradeModal';
import { logAuditAction } from '@/utils/auditLogger';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const { user, setUser, siteSettings, setSiteSettings } = useStore();
    const [loading, setLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Form states
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    // Site Settings states
    const [siteTitle, setSiteTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [faviconUrl, setFaviconUrl] = useState('');
    const faviconInputRef = React.useRef<HTMLInputElement>(null);

    // Security states
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Initialize form with user data
    React.useEffect(() => {
        if (user) {
            const names = user.full_name?.split(' ') || [];
            setFirstName(names[0] || '');
            setLastName(names.slice(1).join(' ') || '');
            setEmail(user.email || '');
            setCompany(user.company || '');
            setAvatarUrl(user.avatar_url || '');
        }
    }, [user]);

    React.useEffect(() => {
        if (siteSettings) {
            setSiteTitle(siteSettings.site_title || '');
            setMetaDescription(siteSettings.meta_description || '');
            setFaviconUrl(siteSettings.favicon_url || '');
        }
    }, [siteSettings]);

    const tabs = [
        { id: 'profile', label: 'Profile Information', icon: <User size={18} /> },
        { id: 'security', label: 'Security & Privacy', icon: <Shield size={18} /> },
        { id: 'billing', label: 'Billing & Subscription', icon: <CreditCard size={18} /> },
        { id: 'notifications', label: 'Email Notifications', icon: <Bell size={18} /> },
        { id: 'integrations', label: 'Integrations', icon: <LayoutGrid size={18} /> },
    ];

    if (user?.role === 'Admin') {
        tabs.push({ id: 'site', label: 'Site Settings', icon: <Globe size={18} /> });
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('File size must be less than 2MB');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('Profile')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('Profile')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
            
            // Also update the profile table immediately for the avatar
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setUser({ ...user, avatar_url: publicUrl });
            await logAuditAction({
                actionType: 'AVATAR_UPDATED',
                targetEntity: user.email,
                beforeValue: { avatar_url: user.avatar_url },
                afterValue: { avatar_url: publicUrl },
                note: 'User updated their profile avatar'
            });
            toast.success('Avatar updated successfully');
        } catch (err: any) {
            toast.error(err.message || 'Error uploading avatar');
            console.error('Error uploading avatar:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('File size must be less than 2MB');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `favicon-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('Settings')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('Settings')
                .getPublicUrl(fileName);

            setFaviconUrl(publicUrl);
            toast.success('Favicon uploaded. Click save to apply changes.');
        } catch (err: any) {
            toast.error(err.message || 'Error uploading favicon');
            console.error('Error uploading favicon:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setLoading(true);
        setSaveSuccess(false);
        setError(null);

        try {
            const fullName = `${firstName} ${lastName}`.trim();
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    company: company,
                    avatar_url: avatarUrl
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            const oldProfile = {
                full_name: user.full_name,
                company: user.company,
                avatar_url: user.avatar_url
            };

            setUser({
                ...user,
                full_name: fullName,
                company: company,
                avatar_url: avatarUrl
            });

            await logAuditAction({
                actionType: 'PROFILE_UPDATED',
                targetEntity: user.email,
                beforeValue: oldProfile,
                afterValue: {
                    full_name: fullName,
                    company: company,
                    avatar_url: avatarUrl
                },
                note: 'User updated their profile information'
            });

            toast.success('Profile updated successfully');
        } catch (err: any) {
            toast.error(err.message || 'Error updating profile');
            console.error('Error updating profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSiteSettings = async () => {
        setLoading(true);
        setSaveSuccess(false);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('site_settings')
                .update({
                    site_title: siteTitle,
                    meta_description: metaDescription,
                    favicon_url: faviconUrl
                })
                .eq('id', siteSettings?.id || 1);

            if (updateError) throw updateError;

            const newSettings = {
                id: siteSettings?.id || '1',
                site_title: siteTitle,
                meta_description: metaDescription,
                favicon_url: faviconUrl
            };

            setSiteSettings(newSettings);

            await logAuditAction({
                actionType: 'SETTING_UPDATED',
                targetEntity: 'Global Site Settings',
                beforeValue: { site_title: siteSettings?.site_title, favicon: siteSettings?.favicon_url },
                afterValue: { site_title: siteTitle, favicon: faviconUrl },
                note: `${user?.email} updated global site settings`
            });

            setSaveSuccess(true);
            toast.success('Site settings updated successfully');
        } catch (err: any) {
            toast.error(err.message || 'Error updating site settings');
            console.error('Error updating site settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async () => {
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError(null);
        setSaveSuccess(false);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            setNewPassword('');
            setConfirmPassword('');
            await logAuditAction({
                actionType: 'PASSWORD_UPDATED',
                targetEntity: user?.email,
                beforeValue: { password: '●●●●●●' },
                afterValue: { password: '●●●●●● (Updated)' },
                note: 'User manually updated their account password'
            });
            toast.success('Password updated successfully');
        } catch (err: any) {
            toast.error(err.message || 'Error updating password');
            console.error('Error updating password:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMainAction = () => {
        if (activeTab === 'profile') {
            handleSaveProfile();
        } else if (activeTab === 'security') {
            handlePasswordUpdate();
        } else if (activeTab === 'site') {
            handleSaveSiteSettings();
        }
    };

    const creditPercentage = user ? Math.round((user.credits / user.max_credits) * 100) : 0;

    return (
        <AppContainer title="Settings">
            <div className="w-full mx-auto flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 mb-4">Account Settings</h3>
                    <div className="flex flex-col gap-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                    activeTab === tab.id 
                                        ? 'bg-[#1b57b1]/10 text-[#1b57b1]' 
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <div className={`${activeTab === tab.id ? 'text-[#1b57b1]' : 'text-slate-400'}`}>
                                    {tab.icon}
                                </div>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                        <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-900">
                                {tabs.find(t => t.id === activeTab)?.label}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium mt-1">Manage your {activeTab} preferences and updates.</p>
                        </div>
                        
                        <div className="p-6 md:p-8">
                            {activeTab === 'profile' && (
                                <div className="space-y-6 max-w-2xl">
                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="w-20 h-20 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-[#1b57b1] uppercase overflow-hidden">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('') : '?'}</span>
                                            )}
                                        </div>
                                        <div>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                onChange={handleAvatarUpload} 
                                                accept="image/*" 
                                                className="hidden" 
                                            />
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={loading}
                                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                                            >
                                                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Change Avatar'}
                                            </button>
                                            <p className="text-xs text-slate-500 mt-2 font-medium">JPEG or PNG, max 2MB.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">First Name</label>
                                            <input 
                                                type="text" 
                                                value={firstName} 
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all shadow-sm" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Last Name</label>
                                            <input 
                                                type="text" 
                                                value={lastName} 
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all shadow-sm" 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Email Address</label>
                                        <input 
                                            type="email" 
                                            readOnly
                                            value={email} 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed outline-none shadow-sm" 
                                        />
                                        <p className="text-[10px] text-slate-400 font-medium">Email cannot be changed directly.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Company Name</label>
                                        <input 
                                            type="text" 
                                            value={company} 
                                            onChange={(e) => setCompany(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all shadow-sm" 
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="space-y-6 max-w-2xl">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Change Password</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700">New Password</label>
                                                <input 
                                                    type="password" 
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="••••••••" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all shadow-sm" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700">Confirm New Password</label>
                                                <input 
                                                    type="password" 
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="••••••••" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all shadow-sm" 
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Password must be at least 6 characters long. After updating, you may need to log in again on other devices.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'billing' && (
                                <div className="space-y-6 max-w-2xl">
                                    <div className="p-6 bg-gradient-to-r from-[#1b57b1] to-[#154690] rounded-2xl text-white shadow-lg shadow-[#1b57b1]/20">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="font-bold text-xl">{user?.plan || 'Starter'} Plan</h3>
                                                <p className="text-blue-100 text-sm mt-1">{user?.credits?.toLocaleString() || 0} / {user?.max_credits?.toLocaleString() || 0} credits used</p>
                                            </div>
                                            <div className="text-right">
                                                {user?.plan === 'Starter' && (
                                                    <p className="text-2xl font-bold">Free</p>
                                                )}
                                                {user?.plan === 'Pro' && (
                                                    <p className="text-2xl font-bold">$19<span className="text-sm font-normal text-blue-200">/mo</span></p>
                                                )}
                                                {user?.plan === 'Enterprise' && (
                                                    <p className="text-2xl font-bold">$79<span className="text-sm font-normal text-blue-200">/mo</span></p>
                                                )}
                                                {(!user?.plan || (user?.plan !== 'Starter' && user?.plan !== 'Pro' && user?.plan !== 'Enterprise')) && (
                                                    <p className="text-2xl font-bold">Free</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-full bg-blue-900/50 rounded-full h-2 mb-2">
                                            <div className="bg-white h-2 rounded-full transition-all duration-500" style={{ width: `${creditPercentage}%` }}></div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-blue-200">
                                                {user?.plan === 'Starter' ? 'Resets daily' : 'Resets monthly'}
                                            </p>
                                            <button 
                                                onClick={() => setIsUpgradeModalOpen(true)}
                                                className="text-xs font-bold bg-white text-[#1b57b1] px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                            >
                                                Change Plan
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notifications' && (
                                <div className="space-y-6 max-w-2xl">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Email Preferences</h3>
                                        <div className="space-y-3">
                                            {['Weekly Digest', 'New Lead Alerts', 'Product Updates', 'Security Alerts'].map((item, idx) => (
                                                <div key={item} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">{item}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">Receive notifications about {item.toLowerCase()}.</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" defaultChecked={idx !== 2} />
                                                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-[#1b57b1] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'integrations' && (
                                <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
                                    <LayoutGrid size={40} className="text-slate-300 mb-4" />
                                    <h4 className="font-bold text-slate-900">Advanced Integrations Coming Soon</h4>
                                    <p className="text-sm text-slate-500 max-w-xs mt-1">We're currently building direct connections to Salesforce, HubSpot, and Slack.</p>
                                </div>
                            )}
                            {activeTab === 'site' && user?.role === 'Admin' && (
                                <div className="space-y-6 max-w-2xl">
                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {faviconUrl ? (
                                                <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                                            ) : (
                                                <Globe className="text-slate-400" size={24} />
                                            )}
                                        </div>
                                        <div>
                                            <input 
                                                type="file" 
                                                ref={faviconInputRef} 
                                                onChange={handleFaviconUpload} 
                                                accept=".ico,.png,.jpg,.jpeg,.svg" 
                                                className="hidden" 
                                            />
                                            <button 
                                                onClick={() => faviconInputRef.current?.click()}
                                                disabled={loading}
                                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                                            >
                                                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Upload Favicon'}
                                            </button>
                                            <p className="text-xs text-slate-500 mt-2 font-medium">Use an ICO, PNG or SVG file. Ideal size: 32x32px or 64x64px.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Site Title</label>
                                        <input 
                                            type="text" 
                                            value={siteTitle} 
                                            onChange={(e) => setSiteTitle(e.target.value)}
                                            placeholder="e.g. SyntexDev - Admin Console"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all shadow-sm" 
                                        />
                                        <p className="text-xs text-slate-500 font-medium">This will be displayed in the browser tab and search engines.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Meta Description</label>
                                        <textarea 
                                            value={metaDescription} 
                                            onChange={(e) => setMetaDescription(e.target.value)}
                                            rows={3}
                                            placeholder="AI Powered B2B Lead Generation"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all shadow-sm resize-none" 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-2">
                        {error && (
                            <div className="text-red-500 font-bold text-sm bg-red-50 px-4 py-2 rounded-lg border border-red-100 animate-in fade-in slide-in-from-right-2">
                                {error}
                            </div>
                        )}
                        {saveSuccess && (
                            <div className="flex items-center gap-2 text-green-600 font-bold text-sm animate-in fade-in slide-in-from-right-2">
                                <CheckCircle2 size={18} />
                                {activeTab === 'security' ? 'Password updated!' : (activeTab === 'site' ? 'Settings updated!' : 'Profile updated!')}
                            </div>
                        )}
                        {(activeTab === 'profile' || activeTab === 'security' || activeTab === 'site') && (
                            <>
                                <button 
                                    disabled={loading}
                                    onClick={() => {
                                        if (activeTab === 'profile') {
                                            setFirstName(user?.full_name?.split(' ')[0] || '');
                                            setLastName(user?.full_name?.split(' ').slice(1).join(' ') || '');
                                            setCompany(user?.company || '');
                                        } else if (activeTab === 'security') {
                                            setNewPassword('');
                                            setConfirmPassword('');
                                        } else if (activeTab === 'site') {
                                            setSiteTitle(siteSettings?.site_title || '');
                                            setMetaDescription(siteSettings?.meta_description || '');
                                            setFaviconUrl(siteSettings?.favicon_url || '');
                                        }
                                        setError(null);
                                    }}
                                    className="px-6 py-2.5 border border-slate-200 bg-white rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                    Discard
                                </button>
                                <button 
                                    disabled={loading}
                                    onClick={handleMainAction}
                                    className="px-6 py-2.5 bg-[#1b57b1] text-white rounded-xl font-bold hover:bg-[#154690] transition-all shadow-lg shadow-[#1b57b1]/20 cursor-pointer disabled:opacity-50 flex items-center gap-2 min-w-[140px] justify-center"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <PlanUpgradeModal 
                isOpen={isUpgradeModalOpen} 
                onClose={() => setIsUpgradeModalOpen(false)}
                currentPlan={user?.plan || 'Starter'}
            />
        </AppContainer>
    );
};

export default Settings;
