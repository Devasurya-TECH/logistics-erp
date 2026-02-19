"use client";

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/lib/store';

const APP_ROLE = process.env.NEXT_PUBLIC_APP_ROLE;
const roleLabels: Record<string, string> = { driver: 'Driver', supervisor: 'Supervisor', manager: 'Admin' };

export default function Header() {
    const { user } = useAuth();
    const alerts = useStore((state) => state.alerts);
    const pathname = usePathname();

    const titleMap: Record<string, { title: string; subtitle: string }> = {
        '/manager': { title: 'Dashboard', subtitle: 'Fleet overview & analytics' },
        '/manager/trips': { title: 'Trips', subtitle: 'Manage all assignments' },
        '/manager/fuel': { title: 'Fuel', subtitle: 'Verification & approvals' },
        '/supervisor': { title: 'Command Center', subtitle: 'Assign & monitor deliveries' },
        '/driver': { title: 'Dashboard', subtitle: 'Your active assignments' },
        '/driver/routes': { title: 'Route Optimizer', subtitle: 'Fuel-efficient navigation' },
    };

    const page = titleMap[pathname] || { title: 'Dashboard', subtitle: '' };
    const unreadAlerts = alerts.filter(a => !a.resolved).length;

    return (
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

            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                {/* Live indicator */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
                </div>

                {/* Notifications */}
                <div className="relative group">
                    <button className="p-2.5 rounded-xl bg-gray-50 text-slate-500 hover:bg-white hover:text-blue-600 border border-transparent hover:border-gray-200 transition-all shadow-sm text-sm active:scale-95">
                        🔔
                    </button>
                    {unreadAlerts > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg shadow-red-200 ring-2 ring-white">
                            {unreadAlerts}
                        </span>
                    )}

                    {/* Desktop dropdown */}
                    <div className="absolute right-0 top-14 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none group-hover:pointer-events-auto origin-top-right z-50 ring-1 ring-black/5 overflow-hidden">
                        <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{alerts.length} total</span>
                        </div>
                        <div className="max-h-72 overflow-y-auto custom-scrollbar">
                            {alerts.length === 0 ? (
                                <div className="p-8 text-center">
                                    <span className="text-3xl mb-2 block">🔕</span>
                                    <p className="text-slate-400 text-xs font-medium">No new alerts</p>
                                </div>
                            ) : (
                                alerts.map(alert => (
                                    <div key={alert.id} className="p-3.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${alert.severity === 'critical' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                alert.severity === 'high' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                                    'bg-blue-50 text-blue-600 border border-blue-100'
                                                }`}>
                                                {alert.type}
                                            </span>
                                            <span className="text-[10px] text-slate-300 font-medium">
                                                {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed font-medium mt-1">{alert.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
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
    );
}
