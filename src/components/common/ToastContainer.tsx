"use client";

import { useNotifications } from "@/lib/notifications";
import { useEffect, useState } from "react";
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    XCircleIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

const iconMap = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon,
};

const colorMap = {
    success: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-800',
        icon: 'text-emerald-500',
        progress: 'bg-emerald-400',
    },
    error: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'text-red-500',
        progress: 'bg-red-400',
    },
    warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        icon: 'text-amber-500',
        progress: 'bg-amber-400',
    },
    info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-500',
        progress: 'bg-blue-400',
    },
};

function ToastItem({ toast, onDismiss }: { toast: any; onDismiss: () => void }) {
    const [progress, setProgress] = useState(100);
    const Icon = iconMap[toast.type as keyof typeof iconMap];
    const colors = colorMap[toast.type as keyof typeof colorMap];

    useEffect(() => {
        if (!toast.autoClose) return;
        const start = Date.now();
        const duration = 4000;
        const interval = setInterval(() => {
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);
            if (remaining <= 0) clearInterval(interval);
        }, 50);
        return () => clearInterval(interval);
    }, [toast.autoClose]);

    return (
        <div className={`relative flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-xl overflow-hidden animate-slide-in-right ${colors.bg} ${colors.border}`}>
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.icon}`} />
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${colors.text}`}>{toast.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/50 transition-colors"
            >
                <XMarkIcon className="w-4 h-4 text-slate-400" />
            </button>
            {/* Auto-close progress bar */}
            {toast.autoClose && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30">
                    <div
                        className={`h-full ${colors.progress} transition-all duration-100 ease-linear`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}

export default function ToastContainer() {
    const { toasts, dismissToast } = useNotifications();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-[360px] max-w-[calc(100vw-2rem)]">
            {toasts.map(toast => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onDismiss={() => dismissToast(toast.id)}
                />
            ))}
        </div>
    );
}
