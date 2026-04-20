"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownTrayIcon, ShareIcon, XMarkIcon } from "@heroicons/react/24/outline";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "driver-pwa-install-dismissed";

export default function DriverInstallPrompt() {
    const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [dismissed, setDismissed] = useState(true);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
        const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

        setIsStandalone(standalone);
        setIsIos(ios);
        setDismissed(localStorage.getItem(DISMISS_KEY) === "1");

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallEvent(event as BeforeInstallPromptEvent);
        };

        const handleInstalled = () => {
            setInstallEvent(null);
            setDismissed(true);
            localStorage.setItem(DISMISS_KEY, "1");
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleInstalled);
        };
    }, []);

    const visible = useMemo(() => {
        if (isStandalone) return false;
        if (installEvent) return true;
        return isIos && !dismissed;
    }, [dismissed, installEvent, isIos, isStandalone]);

    useEffect(() => {
        if (installEvent && !isStandalone) {
            setDismissed(false);
        }
    }, [installEvent, isStandalone]);

    if (!visible) return null;

    const dismiss = () => {
        setDismissed(true);
        if (typeof window !== "undefined") {
            localStorage.setItem(DISMISS_KEY, "1");
        }
    };

    const install = async () => {
        if (!installEvent) return;

        setInstalling(true);
        try {
            await installEvent.prompt();
            const choice = await installEvent.userChoice;
            if (choice.outcome === "accepted") {
                dismiss();
            }
        } finally {
            setInstallEvent(null);
            setInstalling(false);
        }
    };

    return (
        <div className="md:hidden sticky top-0 z-30 -mx-1">
            <div className="rounded-[24px] border border-blue-200 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-4 text-white shadow-xl ring-1 ring-white/10">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
                        {isIos && !installEvent ? (
                            <ShareIcon className="h-6 w-6" />
                        ) : (
                            <ArrowDownTrayIcon className="h-6 w-6" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-200">Driver app</p>
                        <h2 className="mt-1 text-base font-semibold leading-6">Install LogiTrace on your phone</h2>
                        <p className="mt-1 text-sm leading-5 text-slate-200">
                            {isIos && !installEvent
                                ? "Open Safari share menu, then tap Add to Home Screen to install the driver app."
                                : "Install this driver app for faster launch, full-screen use, and app-style navigation on mobile."}
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                            {installEvent ? (
                                <button
                                    onClick={() => void install()}
                                    disabled={installing}
                                    className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-sm transition active:scale-[0.99] disabled:opacity-60"
                                >
                                    {installing ? "Installing..." : "Install driver app"}
                                </button>
                            ) : (
                                <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-medium text-slate-100">
                                    Share <span className="font-bold text-white">then Add to Home Screen</span>
                                </div>
                            )}
                            <button
                                onClick={dismiss}
                                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold text-slate-100"
                                aria-label="Dismiss install prompt"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
