"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { UserRole } from '@/lib/types';
import { roleToPath } from '@/lib/roles';
import DriverInstallPrompt from './DriverInstallPrompt';

export default function DashboardLayout({
    children,
    requiredRole,
}: {
    children: React.ReactNode;
    requiredRole?: UserRole;
}) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
            return;
        }

        if (!isLoading && user && requiredRole && user.role !== requiredRole) {
            router.push(roleToPath(user.role));
        }
    }, [user, isLoading, router, requiredRole]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,_#1e3a8a,_#020617_58%)] px-6 text-center text-white">
                <div className="relative">
                    <div className="h-14 w-14 animate-spin rounded-full border-2 border-white/20 border-t-white border-b-blue-300"></div>
                    <div className="absolute inset-2 rounded-full bg-white/10" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-semibold tracking-[0.24em] text-blue-200 uppercase">Driver app</p>
                    <p className="text-base font-semibold text-white/90">Restoring your route data...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className={`flex h-screen overflow-hidden font-sans text-slate-800 ${user.role === 'driver' ? 'bg-[#eef4ff]' : 'bg-slate-50'}`}>
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden relative w-full min-w-0">
                <Header />
                <main className={`flex-1 overflow-y-auto relative z-0 custom-scrollbar ${user.role === 'driver' ? 'px-3 pb-24 pt-3 md:p-5 lg:p-6' : 'p-3 pb-24 md:p-5 md:pb-6 lg:p-6'}`}>
                    <div className={`mx-auto space-y-4 md:space-y-5 ${user.role === 'driver' ? 'max-w-5xl' : 'max-w-7xl'}`}>
                        {user.role === 'driver' ? <DriverInstallPrompt /> : null}
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
