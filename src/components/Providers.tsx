"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import ToastContainer from "@/components/common/ToastContainer";
import ServiceWorkerReset from "@/components/ServiceWorkerReset";
import { StoreInitializer } from "@/components/StoreInitializer";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ServiceWorkerReset />
            <StoreInitializer />
            {children}
            <ToastContainer />
        </AuthProvider>
    );
}
