"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

const REFRESH_INTERVAL_MS = 8000;

export function StoreInitializer() {
  const { fetchInitialData } = useStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        fetchInitialData();
      }
    };

    fetchInitialData();
    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener("focus", refresh);
    };
  }, [fetchInitialData]);

  return null;
}
