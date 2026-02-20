import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    autoClose?: boolean;
}

interface NotificationState {
    notifications: Notification[];
    toasts: Notification[];
    addNotification: (type: NotificationType, title: string, message: string) => void;
    dismissToast: (id: string) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    clearAll: () => void;
}

export const useNotifications = create<NotificationState>((set) => ({
    notifications: [],
    toasts: [],

    addNotification: (type, title, message) => {
        const notification: Notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type,
            title,
            message,
            timestamp: Date.now(),
            read: false,
            autoClose: true,
        };

        set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 50), // Keep last 50
            toasts: [...state.toasts, notification],
        }));

        // Auto-dismiss toast after 4 seconds
        if (notification.autoClose) {
            setTimeout(() => {
                set((state) => ({
                    toasts: state.toasts.filter(t => t.id !== notification.id),
                }));
            }, 4000);
        }
    },

    dismissToast: (id) => set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id),
    })),

    markRead: (id) => set((state) => ({
        notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        ),
    })),

    markAllRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
    })),

    clearAll: () => set({ notifications: [], toasts: [] }),
}));
