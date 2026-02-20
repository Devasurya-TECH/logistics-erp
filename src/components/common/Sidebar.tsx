"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

const roles = {
    manager: [
        { name: 'Overview', href: '/manager', icon: '📊', desc: 'KPIs & Fleet' },
        { name: 'Trips', href: '/manager/trips', icon: '🚚', desc: 'All trips' },
        { name: 'Vehicles', href: '/manager/vehicles', icon: '🚛', desc: 'Fleet status' },
    ],
    supervisor: [
        { name: 'Dashboard', href: '/supervisor', icon: '📊', desc: 'Command Center' },
        { name: 'Drivers', href: '/supervisor/drivers', icon: '👤', desc: 'Manage drivers' },
        { name: 'Deliveries', href: '/supervisor/deliveries', icon: '📦', desc: 'All deliveries' },
        { name: 'Trips', href: '/supervisor/trips', icon: '🚚', desc: 'Trip management' },
        { name: 'Tracking', href: '/supervisor/tracking', icon: '📡', desc: 'Live fleet GPS' },
        { name: 'Fuel', href: '/supervisor/fuel', icon: '⛽', desc: 'Fuel verification' },
        { name: 'Reports', href: '/supervisor/reports', icon: '📈', desc: 'Analytics & exports' },
        { name: 'Activity', href: '/supervisor/activity', icon: '📋', desc: 'Audit trail' },
        { name: 'Settings', href: '/supervisor/settings', icon: '⚙️', desc: 'Preferences' },
    ],
    driver: [
        { name: 'My Dashboard', href: '/driver', icon: '🏠', desc: 'Active trips' },
        { name: 'Route Optimizer', href: '/driver/routes', icon: '⚡', desc: 'Navigate' },
        { name: 'Log Fuel', href: '/driver?tab=fuel', icon: '⛽', desc: 'Bills & receipts' },
        { name: 'Activity', href: '/driver/activity', icon: '📋', desc: 'Audit trail' },
        { name: 'Settings', href: '/driver/settings', icon: '⚙️', desc: 'Preferences' },
    ]
};

export default function Sidebar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    if (!user) return null;

    const navigation = roles[user.role as keyof typeof roles] || [];

    return (
        <>
            {/* Mobile Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-[60] md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-safe pb-safe">
                <div className="flex items-center justify-around px-2 py-1 mb-0.5">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href.includes('?') && pathname === item.href.split('?')[0]);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all min-h-[56px] ${isActive
                                    ? 'text-blue-600'
                                    : 'text-slate-400 active:text-slate-600'
                                    }`}
                            >
                                <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                                <span className={`text-[10px] font-semibold tracking-tight ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {item.name.split(' ').pop()}
                                </span>
                                {isActive && (
                                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-0.5"></span>
                                )}
                            </Link>
                        );
                    })}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl text-slate-400 active:text-slate-600 min-h-[56px]"
                    >
                        <span className="text-xl">⚙️</span>
                        <span className="text-[10px] font-semibold tracking-tight">More</span>
                    </button>
                </div>
            </nav>

            {/* Mobile "More" Panel */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[65] md:hidden animate-fade-in"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="fixed bottom-0 left-0 right-0 z-[66] md:hidden bg-white rounded-t-3xl shadow-2xl animate-slide-up safe-bottom">
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1.5 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="p-6 pt-2">
                            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-200">
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-base">{user.name}</p>
                                    <p className="text-xs text-slate-400 capitalize font-medium">{user.role} · LogiTrace</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { logout(); setIsOpen(false); }}
                                className="w-full flex items-center justify-center gap-3 px-4 py-4 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-colors border border-red-100 active:scale-95"
                            >
                                🚪 Sign Out
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col w-[260px] h-screen bg-white border-r border-gray-100 text-slate-800 shadow-sm flex-shrink-0">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-200">
                            LT
                        </div>
                        <div>
                            <h1 className="text-lg font-extrabold gradient-text tracking-tight">LogiTrace</h1>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{user.role}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${isActive
                                    ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm shadow-blue-50'
                                    : 'text-slate-500 hover:bg-gray-50 hover:text-slate-800'
                                    }`}
                            >
                                <span className={`text-lg transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}>
                                    {item.icon}
                                </span>
                                <div>
                                    <span className="block">{item.name}</span>
                                    <span className={`text-[10px] ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>{item.desc}</span>
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-sm border border-white shadow-sm ring-2 ring-gray-50">
                            {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-400 capitalize truncate">{user.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                    >
                        🚪 Sign Out
                    </button>
                </div>
            </div>
        </>
    );
}
