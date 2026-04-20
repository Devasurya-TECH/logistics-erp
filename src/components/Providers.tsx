"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import ToastContainer from "@/components/common/ToastContainer";
import ServiceWorkerRegistration from "@/components/ServiceWorkerReset";
import { StoreInitializer } from "@/components/StoreInitializer";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ServiceWorkerRegistration />
            <StoreInitializer />
            {children}
            <ToastContainer />
        </AuthProvider>
    );
}
