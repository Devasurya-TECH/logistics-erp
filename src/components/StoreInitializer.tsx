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

        const getFallbackIntervalMs = () => {
            if (document.visibilityState !== "visible") return 0;
            return user.role === "driver" ? 300000 : 90000;
        };

        const startPolling = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            const intervalMs = getFallbackIntervalMs();
            if (!intervalMs) {
                intervalRef.current = null;
                return;
            }
            intervalRef.current = setInterval(() => {
                void runSync();
            }, intervalMs);
        };

        void runSync();
        startPolling();

        let channel = supabase.channel(`fleet-sync-${user.id}`);

        if (user.role === "driver") {
            channel = channel
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "trips", filter: `driver_id=eq.${user.id}` },
                    queueSync,
                )
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
                    queueSync,
                )
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "fuel_entries", filter: `driver_id=eq.${user.id}` },
                    queueSync,
                )
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "alerts", filter: `created_by=eq.${user.id}` },
                    queueSync,
                );
        } else {
            channel = channel
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
                );
        }

        channel = channel.subscribe();

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                void runSync();
            }
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
