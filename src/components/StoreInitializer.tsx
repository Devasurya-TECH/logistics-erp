"use client";

import { useStore } from "@/lib/store";
import { useEffect, useRef } from "react";

export function StoreInitializer() {
    const { fetchInitialData } = useStore();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
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
    }, [fetchInitialData]);

    return null;
}
