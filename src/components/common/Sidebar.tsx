"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';

type NavItem = {
    name: string;
    href: string;
    icon: string;
};

const navigationByRole: Record<UserRole, NavItem[]> = {
    manager: [
        { name: 'Dashboard', href: '/manager', icon: '📊' },
        { name: 'Trips', href: '/manager/trips', icon: '🚚' },
        { name: 'Vehicles', href: '/manager/vehicles', icon: '🚛' },
        { name: 'Fuel', href: '/manager/fuel', icon: '⛽' },
    ],
    supervisor: [
        { name: 'Dashboard', href: '/supervisor', icon: '📊' },
        { name: 'Drivers', href: '/supervisor/drivers', icon: '👤' },
        { name: 'Deliveries', href: '/supervisor/deliveries', icon: '📦' },
        { name: 'Trips', href: '/supervisor/trips', icon: '🚚' },
        { name: 'Tracking', href: '/supervisor/tracking', icon: '📡' },
        { name: 'Fuel', href: '/supervisor/fuel', icon: '⛽' },
        { name: 'Reports', href: '/supervisor/reports', icon: '📈' },
        { name: 'Activity', href: '/supervisor/activity', icon: '📋' },
        { name: 'Settings', href: '/supervisor/settings', icon: '⚙️' },
    ],
    driver: [
        { name: 'Overview', href: '/driver?tab=overview', icon: '🏠' },
        { name: 'Fuel', href: '/driver?tab=fuel', icon: '⛽' },
        { name: 'Routes', href: '/driver/routes', icon: '🧭' },
        { name: 'Settings', href: '/driver/settings', icon: '⚙️' },
    ],
};

export default function Sidebar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    if (!user) return null;

    const navigation = navigationByRole[user.role] || [];

    const isRouteActive = (href: string) => {
        if (pathname === href) return true;
        if (href.includes('?')) {
            const [targetPath, queryString] = href.split('?');
            if (pathname !== targetPath) return false;

            const expectedParams = new URLSearchParams(queryString);
            for (const [key, value] of expectedParams.entries()) {
                if (searchParams.get(key) !== value) {
                    return false;
                }
            }

            return true;
        }
        return false;
    };

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200">
                <div className="flex overflow-x-auto custom-scrollbar">
                    {navigation.map((item) => {
                        const isActive = isRouteActive(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`min-w-[84px] flex flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-semibold ${isActive
                                    ? 'text-blue-600 bg-blue-50'
                                    : 'text-slate-500'
                                    }`}
                            >
                                <span className="text-base">{item.icon}</span>
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={logout}
                        className="min-w-[84px] flex flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-semibold text-rose-600"
                    >
                        <span className="text-base">🚪</span>
                        <span>Logout</span>
                    </button>
                </div>
            </nav>

            <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r border-gray-200 flex-shrink-0">
                <div className="p-5 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                            LT
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900">LogiTrace ERP</h1>
                            <p className="text-xs text-slate-500 capitalize">{user.role} panel</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = isRouteActive(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <span className="text-base">{item.icon}</span>
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full px-3 py-2.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-semibold"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
}
