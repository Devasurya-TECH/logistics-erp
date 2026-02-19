"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
                <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                    <div className="absolute inset-0 rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-200 animate-ping opacity-20"></div>
                </div>
                <p className="text-slate-400 text-sm font-medium animate-pulse">Loading LogiTrace...</p>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="flex h-screen bg-gray-50 text-slate-800 overflow-hidden font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden relative w-full min-w-0">
                <Header />
                <main className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-8 relative z-0 custom-scrollbar">
                    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-fade-in-up">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
