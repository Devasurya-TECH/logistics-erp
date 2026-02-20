"use client";

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/lib/store';
import { useNotifications } from '@/lib/notifications';
import { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import NotificationCenter from './NotificationCenter';
import GlobalSearch from './GlobalSearch';

const APP_ROLE = process.env.NEXT_PUBLIC_APP_ROLE;
const roleLabels: Record<string, string> = { driver: 'Driver', supervisor: 'Supervisor', manager: 'Admin' };

export default function Header() {
    const { user } = useAuth();
    const alerts = useStore((state) => state.alerts);
    const { notifications } = useNotifications();
    const pathname = usePathname();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    const titleMap: Record<string, { title: string; subtitle: string }> = {
        '/manager': { title: 'Dashboard', subtitle: 'Fleet overview & analytics' },
        '/manager/trips': { title: 'Trips', subtitle: 'Manage all assignments' },
        '/manager/fuel': { title: 'Fuel', subtitle: 'Verification & approvals' },
        '/supervisor': { title: 'Command Center', subtitle: 'Assign & monitor deliveries' },
        '/supervisor/drivers': { title: 'Driver Management', subtitle: 'Monitor all fleet drivers' },
        '/supervisor/deliveries': { title: 'Delivery Management', subtitle: 'Track all deliveries' },
        '/supervisor/trips': { title: 'Trip Management', subtitle: 'View & manage trips' },
        '/supervisor/fuel': { title: 'Fuel Verification', subtitle: 'Review fuel claims' },
        '/supervisor/tracking': { title: 'Live Tracking', subtitle: 'Real-time fleet GPS positions' },
        '/supervisor/reports': { title: 'Reports & Analytics', subtitle: 'Fleet performance insights' },
        '/supervisor/activity': { title: 'Activity Log', subtitle: 'Complete audit trail' },
        '/supervisor/settings': { title: 'Settings', subtitle: 'Manage preferences & account' },
        '/driver': { title: 'Dashboard', subtitle: 'Your active assignments' },
        '/driver/routes': { title: 'Route Optimizer', subtitle: 'Fuel-efficient navigation' },
        '/driver/activity': { title: 'Activity Log', subtitle: 'Complete audit trail' },
        '/driver/settings': { title: 'Settings', subtitle: 'Manage preferences & account' },
    };

    const page = titleMap[pathname] || { title: 'Dashboard', subtitle: '' };
    const unreadAlerts = alerts.filter(a => !a.resolved).length;
    const unreadNotifications = notifications.filter(n => !n.read).length;
    const totalUnread = unreadAlerts + unreadNotifications;

    // Keyboard shortcut: Ctrl/Cmd + K for search
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(prev => !prev);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    return (
        <>
            <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-gray-100 bg-white/90 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
                {/* Left side */}
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight truncate">
                        {page.title}
                    </h2>
                    <p className="text-slate-400 text-[10px] md:text-xs mt-0.5 truncate font-medium hidden sm:block">
                        {page.subtitle}
                    </p>
                </div>

                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                    {/* Live indicator */}
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
                    </div>

                    {/* Search button */}
                    <button
                        onClick={() => setShowSearch(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-slate-400 hover:bg-white hover:text-slate-600 border border-transparent hover:border-gray-200 transition-all shadow-sm text-sm active:scale-95"
                    >
                        <MagnifyingGlassIcon className="w-4 h-4" />
                        <span className="hidden md:block text-xs font-medium">Search</span>
                        <kbd className="hidden lg:block text-[9px] font-bold text-slate-300 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">⌘K</kbd>
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(true)}
                            className="p-2.5 rounded-xl bg-gray-50 text-slate-500 hover:bg-white hover:text-blue-600 border border-transparent hover:border-gray-200 transition-all shadow-sm text-sm active:scale-95"
                        >
                            🔔
                        </button>
                        {totalUnread > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg shadow-red-200 ring-2 ring-white">
                                {totalUnread > 9 ? '9+' : totalUnread}
                            </span>
                        )}
                    </div>

                    {/* User Info — desktop only */}
                    <div className="hidden md:flex items-center gap-3 pl-4 border-l border-gray-100">
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                            <p className="text-[10px] text-slate-400 capitalize font-medium">{user?.role}</p>
                        </div>
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-200">
                            {user?.name.charAt(0)}
                        </div>
                    </div>
                </div>
            </header>

            {/* Notification Center Panel */}
            <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

            {/* Global Search Modal */}
            <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
        </>
    );
}
