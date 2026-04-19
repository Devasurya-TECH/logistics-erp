"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { normalizeRole, roleToPath } from '@/lib/roles';

// Which role is this deployment for? If not set, show all roles (local dev)
const APP_ROLE = normalizeRole(process.env.NEXT_PUBLIC_APP_ROLE);

const roleConfig: Record<UserRole, { icon: string; gradient: string; label: string; tagline: string; users: { name: string; email: string; color: string }[] }> = {
    driver: {
        icon: '🚚',
        gradient: 'from-blue-600 to-indigo-700',
        label: 'Driver',
        tagline: 'Navigate, deliver, log fuel — all in one place',
        users: [
            { name: 'Rahul', email: 'driver@logistics.com', color: 'blue' },
            { name: 'Vishnu', email: 'driver2@logistics.com', color: 'purple' },
            { name: 'Fasil', email: 'driver3@logistics.com', color: 'emerald' },
        ],
    },
    supervisor: {
        icon: '📋',
        gradient: 'from-amber-500 to-orange-600',
        label: 'Supervisor',
        tagline: 'Assign trips, verify fuel, track progress',
        users: [
            { name: 'Supervisor', email: 'supervisor@logistics.com', color: 'amber' },
        ],
    },
    manager: {
        icon: '📊',
        gradient: 'from-emerald-600 to-teal-700',
        label: 'Admin',
        tagline: 'Fleet analytics, costs, and operational oversight',
        users: [
            { name: 'Manager', email: 'manager@logistics.com', color: 'emerald' },
        ],
    },
};

const quickLoginStyles: Record<string, { active: string; inactive: string }> = {
    blue: {
        active: 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm',
        inactive: 'bg-gray-50 text-slate-500 border-gray-200 hover:bg-white hover:border-gray-300',
    },
    purple: {
        active: 'bg-violet-50 text-violet-600 border-violet-200 shadow-sm',
        inactive: 'bg-gray-50 text-slate-500 border-gray-200 hover:bg-white hover:border-gray-300',
    },
    emerald: {
        active: 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm',
        inactive: 'bg-gray-50 text-slate-500 border-gray-200 hover:bg-white hover:border-gray-300',
    },
    amber: {
        active: 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm',
        inactive: 'bg-gray-50 text-slate-500 border-gray-200 hover:bg-white hover:border-gray-300',
    },
};

export default function LoginPage() {
    const { login, signup } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [role, setRole] = useState<UserRole>(APP_ROLE || 'manager');
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const isSingleRole = APP_ROLE !== null;
    const activeRole = mode === 'signup' ? 'driver' : role;
    const config = roleConfig[activeRole];
    const canShowSignup = APP_ROLE === null || APP_ROLE === 'driver';

    useEffect(() => {
        const initialRole = APP_ROLE || role;
        if (APP_ROLE) {
            setRole(APP_ROLE);
        }

        // Auto-fill first user for the active role for easier demo access
        const firstUser = roleConfig[initialRole].users[0];
        if (firstUser) setEmail(firstUser.email);
    }, [role]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsLoading(true);
        setError('');
        setInfo('');

        try {
            if (mode === 'signup') {
                const result = await signup({
                    name,
                    email,
                    password,
                    licenseNumber,
                });

                if (result.requiresEmailConfirmation) {
                    setInfo('Driver account created. Confirm the email in Supabase if email confirmation is enabled, then sign in.');
                    setMode('login');
                } else {
                    router.push(roleToPath('driver'));
                }
                return;
            }

            const success = await login(email, password, role);
            if (success) {
                router.push(roleToPath(role));
            } else {
                setError('Login failed. Check email, password, and role.');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickLogin = (userEmail: string) => {
        setEmail(userEmail);
        setPassword('demo123');
    };

    const handleRoleChange = (newRole: UserRole) => {
        setRole(newRole);
        const firstUser = roleConfig[newRole].users[0];
        if (firstUser) setEmail(firstUser.email);
        setPassword('');
        setError('');
        setInfo('');
    };

    return (
        <div className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center bg-gray-50 relative overflow-hidden p-4">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 -z-10"></div>
            <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br ${config.gradient} opacity-5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl -z-10`}></div>
            <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr ${config.gradient} opacity-5 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl -z-10`}></div>

            <div className="z-10 w-full max-w-md animate-fade-in-up">
                {/* Logo + Title */}
                <div className="text-center mb-6">
                    <div className={`h-16 w-16 md:h-20 md:w-20 bg-gradient-to-br ${config.gradient} rounded-3xl mx-auto mb-4 flex items-center justify-center text-white text-3xl md:text-4xl shadow-xl ring-4 ring-white`}>
                        {config.icon}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                        LogiTrace {isSingleRole ? config.label : ''}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1.5 font-medium">{config.tagline}</p>
                </div>

                {/* Card */}
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100/80 p-5 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Role Selector — only shown in unified mode (local dev) */}
                        {!isSingleRole && mode === 'login' && (
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Select Panel</label>
                                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1.5 rounded-2xl">
                                    {(Object.keys(roleConfig) as UserRole[]).map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => handleRoleChange(r)}
                                            className={`px-3 py-3 md:py-2.5 rounded-xl text-sm font-bold capitalize transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-1.5 ${role === r
                                                ? 'bg-white text-slate-800 shadow-lg ring-1 ring-black/5'
                                                : 'text-slate-400 hover:text-slate-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            <span className="text-lg md:text-base">{roleConfig[r].icon}</span>
                                            <span className="text-xs md:text-sm">{roleConfig[r].label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quick login for multi-user roles */}
                        {mode === 'login' && config.users.length > 1 && (
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Quick Login</label>
                                <div className="flex gap-2 flex-wrap">
                                    {config.users.map((u) => (
                                        <button
                                            key={u.email}
                                            type="button"
                                            onClick={() => handleQuickLogin(u.email)}
                                            className={`text-xs px-3.5 py-2 rounded-xl font-bold transition-all active:scale-95 border ${email === u.email
                                                ? (quickLoginStyles[u.color]?.active ?? quickLoginStyles.blue.active)
                                                : (quickLoginStyles[u.color]?.inactive ?? quickLoginStyles.blue.inactive)
                                                }`}
                                        >
                                            {u.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {mode === 'signup' && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Driver Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter driver name"
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-gray-300 outline-none transition-all text-sm font-medium"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">License Number</label>
                                    <input
                                        type="text"
                                        value={licenseNumber}
                                        onChange={(e) => setLicenseNumber(e.target.value)}
                                        placeholder="Optional"
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-gray-300 outline-none transition-all text-sm font-medium"
                                    />
                                </div>
                            </>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={`${role}@logistics.com`}
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-gray-300 outline-none transition-all text-sm font-medium"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-gray-300 outline-none transition-all text-sm font-medium"
                                required
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-center gap-2 font-medium animate-fade-in">
                                <span>⚠️</span> {error}
                            </div>
                        )}
                        {info && (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs flex items-center gap-2 font-medium animate-fade-in">
                                <span>ℹ️</span> {info}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-4 bg-gradient-to-r ${config.gradient} hover:opacity-90 disabled:opacity-60 text-white font-extrabold rounded-2xl shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.97] text-sm flex items-center justify-center gap-2`}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>{mode === 'signup' ? 'Create Driver Account' : `Access ${config.label} Dashboard`}</>
                            )}
                        </button>
                    </form>

                    {/* Demo hint */}
                    <div className="mt-5 pt-4 border-t border-gray-100 text-center">
                        <p className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">
                            {mode === 'signup' ? 'New signups create driver accounts only' : 'Use your Supabase Auth credentials'}
                        </p>
                        {canShowSignup && (
                            <button
                                type="button"
                                onClick={() => {
                                    const nextMode = mode === 'login' ? 'signup' : 'login';
                                    setMode(nextMode);
                                    setError('');
                                    setInfo('');
                                    setPassword('');
                                    if (nextMode === 'signup') {
                                        setRole('driver');
                                    }
                                }}
                                className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                                {mode === 'login' ? 'Create driver account' : 'Back to sign in'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-[10px] text-slate-300 font-medium">
                    <p>© 2026 LogiTrace · {isSingleRole ? `${config.label} Portal` : 'Logistics Management System'}</p>
                </div>
            </div>
        </div>
    );
}
