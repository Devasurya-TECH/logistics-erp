"use client";

import { useStore } from "@/lib/store";
import { useEffect } from "react";

export function StoreInitializer() {
    const { fetchInitialData } = useStore();

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    return null;
}
