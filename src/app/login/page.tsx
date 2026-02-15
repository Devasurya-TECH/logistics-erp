"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('manager');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Mock password check
        if (password !== 'demo123') {
            setError('Invalid password. Try "demo123"');
            return;
        }

        try {
            const success = await login(email, role);
            if (success) {
                router.push(`/${role}`);
            } else {
                setError('User not found. Please check credential matching mock data.');
            }
        } catch (err) {
            setError('Login failed');
        }
    };

    // Helper to auto-fill for demo purposes
    const handleRoleChange = (newRole: UserRole) => {
        setRole(newRole);
        if (newRole === 'manager') setEmail('manager@logistics.com');
        if (newRole === 'supervisor') setEmail('supervisor@logistics.com');
        if (newRole === 'driver') setEmail('driver@logistics.com'); // Default driver
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 bg-[url('/grid.svg')] bg-cover relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 via-white to-purple-50 opacity-80 blur-3xl -z-10"></div>

            <div className="z-10 w-full max-w-md p-8 glass-panel shadow-2xl animate-fade-in-up border border-white/50 bg-white/70 backdrop-blur-xl">
                <div className="mb-8 text-center">
                    <div className="h-16 w-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-3xl shadow-lg shadow-blue-500/30">
                        🚚
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                        LogiTrace Portal
                    </h1>
                    <p className="text-slate-500 text-sm mt-2">Sign in to manage logistics operations</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Select Panel</label>
                        <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-xl">
                            {(['manager', 'supervisor', 'driver'] as UserRole[]).map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => handleRoleChange(r)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${role === r
                                        ? 'bg-white text-slate-800 shadow-md ring-1 ring-black/5'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-gray-200/50'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        {role === 'driver' && (
                            <div className="flex justify-between items-center mt-2 px-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Quick Login:</span>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => { setEmail('driver@logistics.com'); setPassword('demo123'); }} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold hover:bg-blue-100 transition-colors">Rahul</button>
                                    <button type="button" onClick={() => { setEmail('driver2@logistics.com'); setPassword('demo123'); }} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded-full font-bold hover:bg-purple-100 transition-colors">Vishnu</button>
                                    <button type="button" onClick={() => { setEmail('driver3@logistics.com'); setPassword('demo123'); }} className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full font-bold hover:bg-emerald-100 transition-colors">Fasil</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={`${role}@logistics.com`}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 placeholder-gray-400 outline-none transition-all shadow-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="******"
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 placeholder-gray-400 outline-none transition-all shadow-sm"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        Access Dashboard
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-slate-400">
                    <p>© 2026 LogiTrace Inc. • Production Build v1.0.2</p>
                </div>
            </div>
        </div>
    );
}
