"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const roles = {
    manager: [
        { name: 'Overview', href: '/manager', icon: '📊' },
        { name: 'Trips', href: '/manager/trips', icon: '🚚' },
        // { name: 'Fuel Audits', href: '/manager/fuel', icon: '⛽' },
        { name: 'Vehicles', href: '/manager/vehicles', icon: '🚛' },
    ],
    supervisor: [
        { name: 'Dashboard', href: '/supervisor', icon: '📋' },
        { name: 'Active Trips', href: '/supervisor/trips', icon: '🚚' },
        { name: 'Verify Fuel', href: '/supervisor/fuel', icon: '✅' },
    ],
    driver: [
        { name: 'My Dashboard', href: '/driver', icon: '🏠' },
        { name: 'Route Optimizer', href: '/driver/routes', icon: '⚡' }, // Moved here
        { name: 'Log Fuel', href: '/driver?tab=fuel', icon: '⛽' },
        // { name: 'Expenses', href: '/driver?tab=fuel', icon: '💵' }, 
    ]
};

export default function Sidebar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    if (!user) return null;

    const navigation = roles[user.role as keyof typeof roles] || [];

    return (
        <div className="flex flex-col w-64 h-screen bg-white border-r border-gray-100 text-slate-800 shadow-sm z-10 w-[240px]">
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                    LogiTrace
                </h1>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">{user.role}</p>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'
                                }`}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <span>🚪</span> Sign Out
                </button>
            </div>
        </div>
    );
}
