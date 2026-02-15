"use client";

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/lib/store';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline'; // Need check if installed now? 
// I used text emojis before, but I can use HeroIcons now that I installed them. But I'll stick to emojis or simple SVG if not sure.
// Wait, I installed @heroicons/react earlier. I can use them.

export default function Header() {
    const { user } = useAuth();
    const alerts = useStore((state) => state.alerts);
    const pathname = usePathname();

    const titleMap: Record<string, string> = {
        '/manager': 'Dashboard Overview',
        '/manager/trips': 'Trip Management',
        '/manager/fuel': 'Fuel Verification',
        '/supervisor': 'Supervisor Command Center',
        '/driver': 'Driver Dashboard',
    };

    const title = titleMap[pathname] || 'Dashboard';
    const unreadAlerts = alerts.filter(a => !a.resolved).length;

    return (
        <header className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
            <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                    {title}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">Welcome back, {user?.name}</p>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative group cursor-pointer">
                    <div className="p-2 rounded-full bg-gray-50 text-slate-600 hover:bg-white hover:text-blue-600 border border-transparent hover:border-gray-200 transition-all shadow-sm">
                        🔔
                    </div>
                    {unreadAlerts > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-bounce">
                            {unreadAlerts}
                        </span>
                    )}

                    {/* Dropdown */}
                    <div className="absolute right-0 top-12 w-80 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none group-hover:pointer-events-auto origin-top-right z-50 ring-1 ring-black/5">
                        <div className="p-3 border-b border-gray-50">
                            <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
                        </div>
                        <div className="max-h-64 overflow-y-auto bg-gray-50/50">
                            {alerts.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-xs">No new alerts</div>
                            ) : (
                                alerts.map(alert => (
                                    <div key={alert.id} className="p-3 hover:bg-white border-b border-gray-100 last:border-0 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${alert.severity === 'critical' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                    alert.severity === 'high' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                                        'bg-blue-50 text-blue-600 border border-blue-100'
                                                }`}>
                                                {alert.type}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 line-clamp-2">{alert.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold border border-white shadow-sm ring-2 ring-gray-50">
                        {user?.name.charAt(0)}
                    </div>
                </div>
            </div>
        </header>
    );
}
