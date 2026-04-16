"use client";

import { useEffect } from "react";

export default function ServiceWorkerReset() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker
            .getRegistrations()
            .then((registrations) => {
                registrations.forEach((registration) => {
                    registration.unregister().catch(() => {
                        // no-op
                    });
                });
            })
            .catch(() => {
                // no-op
            });
    }, []);

    return null;
}

