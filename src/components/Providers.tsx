"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import ToastContainer from "@/components/common/ToastContainer";
import ServiceWorkerReset from "@/components/ServiceWorkerReset";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ServiceWorkerReset />
            {children}
            <ToastContainer />
        </AuthProvider>
    );
}
