"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/lib/types';
import { users } from '@/lib/mock-data';
import { useRouter } from 'next/navigation';
import { normalizeRole, roleToPath } from '@/lib/roles';

interface AuthContextType {
    user: User | null;
    login: (email: string, role: UserRole) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check localStorage for persisted session
        const storedUser = localStorage.getItem('logistics_user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser) as Partial<User> | null;
                const normalizedRole = normalizeRole(parsed?.role);
                if (
                    parsed &&
                    typeof parsed.id === 'string' &&
                    typeof parsed.name === 'string' &&
                    typeof parsed.email === 'string' &&
                    normalizedRole
                ) {
                    const normalizedUser: User = {
                        id: parsed.id,
                        name: parsed.name,
                        email: parsed.email,
                        role: normalizedRole,
                        avatar: parsed.avatar,
                    };
                    setUser(normalizedUser);
                    localStorage.setItem('logistics_user', JSON.stringify(normalizedUser));
                } else {
                    localStorage.removeItem('logistics_user');
                }
            } catch {
                localStorage.removeItem('logistics_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, role: UserRole) => {
        // Mock login delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const normalizedRole = normalizeRole(role);
        if (!normalizedRole) return false;

        const foundUser = users.find(u => u.email === email && u.role === normalizedRole);

        if (foundUser) {
            const normalizedUser: User = { ...foundUser, role: normalizedRole };
            setUser(normalizedUser);
            localStorage.setItem('logistics_user', JSON.stringify(normalizedUser));

            // Redirect based on role
            router.push(roleToPath(normalizedRole));
            return true;
        }

        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('logistics_user');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
