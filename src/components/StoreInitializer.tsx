"use client";

import { useStore } from "@/lib/store";
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function StoreInitializer() {
    const { fetchInitialData, clearData } = useStore();
    const { user, isLoading } = useAuth();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            clearData();
            return;
        }

        const runSync = () => {
            void fetchInitialData();
        };

        const startPolling = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            const intervalMs = document.visibilityState === "visible" ? 2000 : 8000;
            intervalRef.current = setInterval(runSync, intervalMs);
        };

        runSync();
        startPolling();

        const handleVisibility = () => {
            runSync();
            startPolling();
        };

        const handleFocus = () => {
            runSync();
        };

        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("focus", handleFocus);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("focus", handleFocus);
        };
    }, [clearData, fetchInitialData, isLoading, user]);

    return null;
}
