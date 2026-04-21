"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import {
    ArrowLeftStartOnRectangleIcon,
    ChartBarSquareIcon,
    Cog6ToothIcon,
    HomeIcon,
    MapIcon,
    TruckIcon,
    UserGroupIcon,
    FireIcon,
    PresentationChartLineIcon,
    ClipboardDocumentListIcon,
    MapPinIcon,
    CreditCardIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = {
    name: string;
    href: string;
    icon: NavIcon;
};

const navigationByRole: Record<UserRole, NavItem[]> = {
    manager: [
        { name: 'Dashboard', href: '/manager', icon: ChartBarSquareIcon },
        { name: 'Trips', href: '/manager/trips', icon: TruckIcon },
        { name: 'Vehicles', href: '/manager/vehicles', icon: MapPinIcon },
        { name: 'Fuel', href: '/manager/fuel', icon: FireIcon },
    ],
    supervisor: [
        { name: 'Dashboard', href: '/supervisor', icon: ChartBarSquareIcon },
        { name: 'Drivers', href: '/supervisor/drivers', icon: UserGroupIcon },
        { name: 'Deliveries', href: '/supervisor/deliveries', icon: ClipboardDocumentListIcon },
        { name: 'Trips', href: '/supervisor/trips', icon: TruckIcon },
        { name: 'Tracking', href: '/supervisor/tracking', icon: MapPinIcon },
        { name: 'Fuel', href: '/supervisor/fuel', icon: FireIcon },
        { name: 'Reports', href: '/supervisor/reports', icon: PresentationChartLineIcon },
        { name: 'Activity', href: '/supervisor/activity', icon: ClipboardDocumentListIcon },
        { name: 'Settings', href: '/supervisor/settings', icon: Cog6ToothIcon },
    ],
    driver: [
        { name: 'Home', href: '/driver?tab=overview', icon: HomeIcon },
        { name: 'Fuel', href: '/driver?tab=fuel', icon: CreditCardIcon },
        { name: 'Routes', href: '/driver/routes', icon: MapIcon },
        { name: 'Settings', href: '/driver/settings', icon: Cog6ToothIcon },
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
            <nav className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${user.role === 'driver' ? 'px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-2' : 'border-t border-gray-200 bg-white px-3 pb-3 pt-2'}`}>
                <div className={`grid grid-cols-5 gap-2 ${user.role === 'driver' ? 'rounded-[30px] border border-white/70 bg-white/92 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl' : ''}`}>
                    {navigation.map((item) => {
                        const isActive = isRouteActive(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition ${
                                    isActive
                                        ? user.role === 'driver'
                                            ? 'bg-slate-950 text-white shadow-sm'
                                            : 'bg-blue-50 text-blue-700'
                                        : 'text-slate-500'
                                }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={logout}
                        className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold text-rose-600 ${user.role === 'driver' ? 'bg-rose-50' : ''}`}
                    >
                        <ArrowLeftStartOnRectangleIcon className="h-5 w-5" />
                        <span>Exit</span>
                    </button>
                </div>
            </nav>

            <aside className="hidden md:flex h-screen w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
                <div className="border-b border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                            LT
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900">LogiTrace ERP</h1>
                            <p className="text-xs text-slate-500 capitalize">{user.role} panel</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                    {navigation.map((item) => {
                        const isActive = isRouteActive(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                                    isActive
                                        ? 'border border-blue-100 bg-blue-50 text-blue-700'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="border-t border-gray-200 p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-sm font-bold text-slate-700">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
}
