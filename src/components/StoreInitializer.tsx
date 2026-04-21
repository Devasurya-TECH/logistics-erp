"use client";

import { useStore } from "@/lib/store";
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import type { Alert, Driver, FuelEntry, Trip, Vehicle } from "@/lib/types";

export function StoreInitializer() {
    const { fetchInitialData, clearData } = useStore();
    const { user, isLoading } = useAuth();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightRef = useRef(false);
    const pendingRef = useRef(false);

    const getDriverCacheKey = (userId: string) => `driver-bootstrap-cache:${userId}`;

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

        if (typeof window !== "undefined" && user.role === "driver") {
            try {
                const cached = window.localStorage.getItem(getDriverCacheKey(user.id));
                if (cached) {
                    const parsed = JSON.parse(cached) as {
                        trips?: Trip[];
                        drivers?: Driver[];
                        vehicles?: Vehicle[];
                        fuelEntries?: FuelEntry[];
                        alerts?: Alert[];
                    };
                    const current = useStore.getState();
                    if (
                        current.trips.length === 0 &&
                        current.drivers.length === 0 &&
                        current.vehicles.length === 0
                    ) {
                        useStore.setState({
                            trips: Array.isArray(parsed.trips) ? parsed.trips : [],
                            drivers: Array.isArray(parsed.drivers) ? parsed.drivers : [],
                            vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
                            fuelEntries: Array.isArray(parsed.fuelEntries) ? parsed.fuelEntries : [],
                            alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
                            isLoading: false,
                        });
                    }
                }
            } catch {
                window.localStorage.removeItem(getDriverCacheKey(user.id));
            }
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

        const unsubscribe = useStore.subscribe((state) => {
            if (typeof window === "undefined" || user.role !== "driver") return;
            window.localStorage.setItem(
                getDriverCacheKey(user.id),
                JSON.stringify({
                    trips: state.trips.filter((trip) => trip.driverId === user.id),
                    drivers: state.drivers.filter((driver) => driver.id === user.id),
                    vehicles: state.vehicles,
                    fuelEntries: state.fuelEntries.filter((entry) => entry.driverId === user.id).slice(0, 20),
                    alerts: state.alerts
                        .filter((alert) => !alert.tripId || state.trips.some((trip) => trip.id === alert.tripId && trip.driverId === user.id))
                        .slice(0, 20),
                }),
            );
        });

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
            unsubscribe();
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
