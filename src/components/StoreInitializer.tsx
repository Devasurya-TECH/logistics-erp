"use client";

import { useStore } from "@/lib/store";
import { useEffect, useRef } from "react";

export function StoreInitializer() {
    const { fetchInitialData } = useStore();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Initial fetch
        fetchInitialData();

        // Poll every 3 seconds so driver sees new trips assigned by supervisor
        intervalRef.current = setInterval(() => {
            fetchInitialData();
        }, 3000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchInitialData]);

    return null;
}
