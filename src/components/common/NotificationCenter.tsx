"use client";

import { useNotifications, Notification as AppNotification } from "@/lib/notifications";
import { useState } from "react";
import {
    XMarkIcon,
    BellIcon,
    BellSlashIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    XCircleIcon,
    TrashIcon,
    CheckIcon,
} from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";

const typeIcons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon,
};

const typeColors = {
    success: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    error: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-500' },
    info: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' },
};

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
    const { notifications, markRead, markAllRead, clearAll } = useNotifications();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
    const unreadCount = notifications.filter(n => !n.read).length;

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70] animate-fade-in"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[71] flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                            <BellIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-800">Notifications</h2>
                            <p className="text-xs text-slate-400">
                                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Action Bar */}
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between flex-shrink-0">
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-400 hover:bg-gray-50'
                                }`}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'unread' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-400 hover:bg-gray-50'
                                }`}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>
                    <div className="flex gap-1.5">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <CheckIcon className="w-3.5 h-3.5" /> Read All
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <TrashIcon className="w-3.5 h-3.5" /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8">
                            <BellSlashIcon className="w-16 h-16 text-slate-200 mb-4" />
                            <h3 className="text-lg font-bold text-slate-400">No notifications</h3>
                            <p className="text-sm text-slate-300 mt-1">
                                {filter === 'unread' ? 'All notifications have been read' : 'Activity will appear here'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filtered.map(notif => {
                                const Icon = typeIcons[notif.type];
                                const colors = typeColors[notif.type];
                                return (
                                    <button
                                        key={notif.id}
                                        onClick={() => markRead(notif.id)}
                                        className={`w-full p-4 text-left transition-all hover:bg-gray-50/50 flex items-start gap-3 ${!notif.read ? 'bg-blue-50/30' : ''
                                            }`}
                                    >
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                                            <Icon className={`w-4.5 h-4.5 ${colors.text}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-sm font-bold truncate ${!notif.read ? 'text-slate-800' : 'text-slate-500'}`}>
                                                    {notif.title}
                                                </p>
                                                {!notif.read && (
                                                    <div className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0`} />
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                                            <p className="text-[10px] text-slate-300 mt-1.5 font-medium">
                                                {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
