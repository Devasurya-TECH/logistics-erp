"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/lib/types';
import { users } from '@/lib/mock-data';
import { useRouter } from 'next/navigation';

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
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, role: UserRole) => {
        // Mock login delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const foundUser = users.find(u => u.email === email && u.role === role);

        if (foundUser) {
            setUser(foundUser);
            localStorage.setItem('logistics_user', JSON.stringify(foundUser));

            // Redirect based on role
            router.push(`/${role}`);
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
