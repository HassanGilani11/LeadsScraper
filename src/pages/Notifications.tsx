import React from 'react';
import { useStore } from '@/store/useStore';
import AppContainer from '@/components/layout/AppContainer';
import { Bell, CheckCircle2, Trash2, Clock, Info, AlertCircle, CheckCircle } from 'lucide-react';

const Notifications = () => {
    const { notifications, markNotificationAsRead, clearNotifications, setNotifications } = useStore();

    const markAllAsRead = () => {
        const updated = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updated);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="text-emerald-500" size={18} />;
            case 'warning': return <AlertCircle className="text-amber-500" size={18} />;
            case 'error': return <AlertCircle className="text-red-500" size={18} />;
            default: return <Info className="text-blue-500" size={18} />;
        }
    };

    return (
        <AppContainer title="Notifications">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">All Notifications</h2>
                        <p className="text-sm text-slate-500">Manage your alerts and activity updates.</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-[#1b57b1] hover:bg-[#1b57b1]/5 rounded-xl transition-all border border-slate-200 cursor-pointer"
                        >
                            <CheckCircle2 size={16} />
                            Mark all as read
                        </button>
                        <button 
                            onClick={clearNotifications}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all border border-red-100 cursor-pointer"
                        >
                            <Trash2 size={16} />
                            Clear All
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    {notifications.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {notifications.map((n) => (
                                <div 
                                    key={n.id} 
                                    className={`p-6 hover:bg-slate-50 transition-colors flex gap-4 ${!n.read ? 'bg-blue-50/30' : ''}`}
                                >
                                    <div className="mt-1">
                                        {getTypeIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`text-sm font-bold truncate ${!n.read ? 'text-[#1b57b1]' : 'text-slate-900'}`}>
                                                {n.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                                                <Clock size={12} />
                                                {new Date(n.created_at).toLocaleDateString([], { 
                                                    month: 'short', 
                                                    day: 'numeric', 
                                                    hour: '2-digit', 
                                                    minute: '2-digit' 
                                                })}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">{n.message}</p>
                                        {!n.read && (
                                            <button 
                                                onClick={() => markNotificationAsRead(n.id)}
                                                className="mt-3 text-xs font-bold text-[#1b57b1] hover:underline cursor-pointer"
                                            >
                                                Mark as read
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                                <Bell size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">No notifications</h3>
                            <p className="text-slate-500 mt-1 max-w-xs mx-auto">
                                You're all caught up! New updates and alerts will appear here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AppContainer>
    );
};

export default Notifications;
