"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { normalizeRole, roleToPath } from '@/lib/roles';
import { createClient } from '@/utils/supabase/client';
import { mapProfileRow } from '@/lib/supabase-data';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string, role: UserRole) => Promise<boolean>;
    signup: (input: {
        name: string;
        email: string;
        password: string;
        licenseNumber?: string;
    }) => Promise<{ success: boolean; requiresEmailConfirmation: boolean }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const supabase = createClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const refreshUser = async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
            setUser(null);
            return;
        }

        const { data: profileRow, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !profileRow) {
            setUser(null);
            return;
        }

        const profile = mapProfileRow(profileRow);
        setUser({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            avatar: profile.avatar,
        });
    };

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                await refreshUser();
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };

        void load();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            void refreshUser();
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string, role: UserRole) => {
        const normalizedRole = normalizeRole(role);
        if (!normalizedRole) return false;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error || !data.user) {
            return false;
        }

        const { data: profileRow, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profileRow) {
            await supabase.auth.signOut();
            return false;
        }

        const profile = mapProfileRow(profileRow);
        if (profile.role !== normalizedRole) {
            await supabase.auth.signOut();
            return false;
        }

        setUser({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            avatar: profile.avatar,
        });

        router.push(roleToPath(profile.role));
        return true;
    };

    const signup = async ({
        name,
        email,
        password,
        licenseNumber,
    }: {
        name: string;
        email: string;
        password: string;
        licenseNumber?: string;
    }) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    role: 'driver',
                    license_number: licenseNumber || '',
                },
            },
        });

        if (error) {
            throw error;
        }

        if (data.session) {
            await refreshUser();
        }

        return {
            success: true,
            requiresEmailConfirmation: !data.session,
        };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, refreshUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
