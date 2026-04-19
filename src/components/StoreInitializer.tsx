"use client";

import { useStore } from "@/lib/store";
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";

export function StoreInitializer() {
    const { fetchInitialData, clearData } = useStore();
    const { user, isLoading } = useAuth();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightRef = useRef(false);
    const pendingRef = useRef(false);

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
            clearData();
            return;
        }

        const supabase = createClient();

        const runSync = async () => {
            if (inFlightRef.current) {
                pendingRef.current = true;
                return;
            }

            inFlightRef.current = true;
            try {
                await fetchInitialData();
            } finally {
                inFlightRef.current = false;
                if (pendingRef.current) {
                    pendingRef.current = false;
                    void runSync();
                }
            }
        };

        const queueSync = () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            debounceRef.current = setTimeout(() => {
                void runSync();
            }, 350);
        };

        const startPolling = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            const intervalMs = document.visibilityState === "visible" ? 12000 : 30000;
            intervalRef.current = setInterval(() => {
                void runSync();
            }, intervalMs);
        };

        void runSync();
        startPolling();

        const channel = supabase
            .channel(`fleet-sync-${user.id}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "trips" },
                queueSync,
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "profiles" },
                queueSync,
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "vehicles" },
                queueSync,
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "fuel_entries" },
                queueSync,
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "alerts" },
                queueSync,
            )
            .subscribe();

        const handleVisibility = () => {
            void runSync();
            startPolling();
        };

        const handleFocus = () => {
            void runSync();
        };

        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("focus", handleFocus);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            void supabase.removeChannel(channel);
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("focus", handleFocus);
        };
    }, [clearData, fetchInitialData, isLoading, user]);

    return null;
}
