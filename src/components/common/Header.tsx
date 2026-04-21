"use client";

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/lib/store';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export default function Header() {
    const { user } = useAuth();
    const alerts = useStore((state) => state.alerts);
    const fetchInitialData = useStore((state) => state.fetchInitialData);
    const pathname = usePathname();

    const titleMap: Record<string, { title: string; subtitle: string }> = {
        '/manager': { title: 'Dashboard', subtitle: 'Fleet overview & analytics' },
        '/manager/trips': { title: 'Trips', subtitle: 'Manage all assignments' },
        '/manager/vehicles': { title: 'Vehicles', subtitle: 'Fleet status & maintenance' },
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
    const isDriver = user?.role === 'driver';

    return (
        <header className={`sticky top-0 z-40 ${isDriver ? 'border-b border-blue-100/70 bg-white/92 px-4 py-3 backdrop-blur-xl' : 'border-b border-gray-200 bg-white px-4 py-3 md:px-6'}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className={`truncate font-bold text-slate-900 ${isDriver ? 'text-base md:text-lg' : 'text-lg'}`}>{page.title}</h2>
                    <p className={`truncate text-slate-500 ${isDriver ? 'text-[11px]' : 'hidden text-xs sm:block'}`}>{page.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`rounded-full border text-[11px] font-semibold ${isDriver ? 'px-2 py-1 bg-blue-50 border-blue-100 text-blue-700' : 'px-2.5 py-1 bg-rose-50 border-rose-200 text-rose-700'}`}>
                        {unreadAlerts} open alerts
                    </div>
                    <button
                        onClick={() => { void fetchInitialData(); }}
                        className={`inline-flex items-center gap-1 border text-slate-700 hover:bg-slate-100 text-sm font-medium ${isDriver ? 'min-h-11 rounded-2xl border-slate-200 px-3 py-2' : 'rounded-lg border-gray-200 px-3 py-2'}`}
                        type="button"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        <span className={isDriver ? 'hidden sm:inline' : ''}>Refresh</span>
                    </button>
                    <div className="hidden md:flex items-center gap-3 pl-4 border-l border-gray-100">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                            {user?.name.charAt(0)}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
