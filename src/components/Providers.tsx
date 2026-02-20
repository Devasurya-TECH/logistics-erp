"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import ToastContainer from "@/components/common/ToastContainer";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <ToastContainer />
        </AuthProvider>
    );
}
