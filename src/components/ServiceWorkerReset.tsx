"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") return;
        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker
            .register("/sw.js", { scope: "/" })
            .then((registration) => {
                registration.update().catch(() => {
                    // no-op
                });
            })
            .catch(() => {
                // no-op
            });
    }, []);

    return null;
}
