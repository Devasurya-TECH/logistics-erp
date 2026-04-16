"use client";

import { useStore } from "@/lib/store";
import { useNotifications } from "@/lib/notifications";
import { useMemo, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
    ClockIcon,
    FunnelIcon,
    TruckIcon,
    UserIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

type LogEntry = {
    id: string;
    type: 'trip_created' | 'trip_started' | 'trip_completed' | 'delivery_done' | 'delivery_failed' | 'fuel_logged' | 'fuel_verified' | 'fuel_rejected' | 'driver_assigned' | 'alert_resolved';
    title: string;
    description: string;
    timestamp: string;
    actor?: string;
    entityId?: string;
};

const typeIcons: Record<string, any> = {
    trip_created: TruckIcon,
    trip_started: TruckIcon,
    trip_completed: CheckCircleIcon,
    delivery_done: CheckCircleIcon,
    delivery_failed: XCircleIcon,
    fuel_logged: TruckIcon,
    fuel_verified: CheckCircleIcon,
    fuel_rejected: XCircleIcon,
    driver_assigned: UserIcon,
    alert_resolved: ExclamationTriangleIcon,
};

const typeColors: Record<string, string> = {
    trip_created: 'bg-blue-100 text-blue-600',
    trip_started: 'bg-emerald-100 text-emerald-600',
    trip_completed: 'bg-emerald-100 text-emerald-600',
    delivery_done: 'bg-green-100 text-green-600',
    delivery_failed: 'bg-red-100 text-red-600',
    fuel_logged: 'bg-amber-100 text-amber-600',
    fuel_verified: 'bg-emerald-100 text-emerald-600',
    fuel_rejected: 'bg-red-100 text-red-600',
    driver_assigned: 'bg-blue-100 text-blue-600',
    alert_resolved: 'bg-gray-100 text-gray-600',
};

export default function ActivityPage() {
    const { trips, drivers, fuelEntries, alerts } = useStore();
    const { notifications } = useNotifications();
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [search, setSearch] = useState('');

    // Generate activity log from actual data
    const activityLog = useMemo(() => {
        const logs: LogEntry[] = [];

        // Trip events
        trips.forEach(trip => {
            const driver = drivers.find(d => d.id === trip.driverId);
            if (trip.startTime) {
                logs.push({
                    id: `trip-create-${trip.id}`,
                    type: trip.driverId ? 'driver_assigned' : 'trip_created',
                    title: trip.driverId ? 'Driver Assigned' : 'Trip Created',
                    description: `Trip #${trip.id.toUpperCase()} ${trip.driverId ? `assigned to ${driver?.name || 'Unknown'}` : 'created'} with ${trip.drops.length} stops`,
                    timestamp: trip.startTime,
                    actor: 'Supervisor',
                    entityId: trip.id,
                });
            }
            if (trip.status === 'in-progress' && trip.startTime) {
                logs.push({
                    id: `trip-start-${trip.id}`,
                    type: 'trip_started',
                    title: 'Trip Started',
                    description: `${driver?.name || 'Driver'} started Trip #${trip.id.toUpperCase()} from ${trip.startLocation.address}`,
                    timestamp: trip.startTime,
                    actor: driver?.name || 'Driver',
                    entityId: trip.id,
                });
            }
            if (trip.status === 'completed' && trip.endTime) {
                logs.push({
                    id: `trip-complete-${trip.id}`,
                    type: 'trip_completed',
                    title: 'Trip Completed',
                    description: `Trip #${trip.id.toUpperCase()} completed. ${trip.drops.filter(d => d.status === 'delivered').length}/${trip.drops.length} delivered.`,
                    timestamp: trip.endTime,
                    actor: driver?.name || 'Driver',
                    entityId: trip.id,
                });
            }
            // Delivery events
            trip.drops.forEach(drop => {
                if (drop.actualArrival) {
                    logs.push({
                        id: `delivery-${trip.id}-${drop.id}`,
                        type: drop.status === 'delivered' ? 'delivery_done' : 'delivery_failed',
                        title: drop.status === 'delivered' ? 'Delivery Complete' : 'Delivery Failed',
                        description: `${drop.customerName} at ${drop.address} — ${drop.status === 'delivered' ? 'delivered successfully' : 'delivery failed'}`,
                        timestamp: drop.actualArrival,
                        actor: driver?.name || 'Driver',
                        entityId: drop.id,
                    });
                }
            });
        });

        // Fuel events
        fuelEntries.forEach(entry => {
            const driver = drivers.find(d => d.id === entry.driverId);
            logs.push({
                id: `fuel-${entry.id}`,
                type: entry.status === 'rejected' ? 'fuel_rejected' : entry.status === 'verified' || entry.status === 'approved' ? 'fuel_verified' : 'fuel_logged',
                title: entry.status === 'rejected' ? 'Fuel Rejected' : entry.status === 'verified' ? 'Fuel Verified' : entry.status === 'approved' ? 'Fuel Approved' : 'Fuel Entry Logged',
                description: `₹${entry.cost.toLocaleString()} · ${entry.amount}L by ${driver?.name || 'Unknown'}`,
                timestamp: entry.timestamp,
                actor: entry.verifiedBy ? 'Supervisor' : driver?.name || 'Driver',
                entityId: entry.id,
            });
        });

        // Alert events
        alerts.filter(a => a.resolved).forEach(alert => {
            logs.push({
                id: `alert-${alert.id}`,
                type: 'alert_resolved',
                title: 'Alert Resolved',
                description: `${alert.type} alert: ${alert.message}`,
                timestamp: alert.timestamp,
                actor: 'Supervisor',
                entityId: alert.id,
            });
        });

        // Sort by timestamp descending
        return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [trips, drivers, fuelEntries, alerts]);

    // Filters
    const filteredLogs = useMemo(() => {
        let result = activityLog;
        if (typeFilter !== 'all') {
            result = result.filter(l => l.type === typeFilter);
        }
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(l =>
                l.title.toLowerCase().includes(q) ||
                l.description.toLowerCase().includes(q) ||
                l.actor?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [activityLog, typeFilter, search]);

    const filterOptions = [
        { value: 'all', label: 'All Activity' },
        { value: 'trip_created', label: 'Trips Created' },
        { value: 'trip_started', label: 'Trips Started' },
        { value: 'trip_completed', label: 'Trips Completed' },
        { value: 'delivery_done', label: 'Deliveries Done' },
        { value: 'delivery_failed', label: 'Deliveries Failed' },
        { value: 'fuel_logged', label: 'Fuel Logged' },
        { value: 'fuel_verified', label: 'Fuel Verified' },
        { value: 'driver_assigned', label: 'Assignments' },
        { value: 'alert_resolved', label: 'Alerts Resolved' },
    ];

    return (
        <div className="space-y-6 pb-24 md:pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Activity Log</h1>
                    <p className="text-slate-400 text-sm mt-1">Complete audit trail of fleet operations</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                        {filteredLogs.length} events
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Search activity..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <FunnelIcon className="w-4 h-4 text-slate-400" />
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {filterOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Timeline */}
            <div className="space-y-1 stagger-children">
                {filteredLogs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                        <ClockIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <h3 className="text-slate-400 font-bold">No activity found</h3>
                        <p className="text-xs text-slate-300 mt-1">Activity events will appear here as they happen</p>
                    </div>
                ) : (
                    filteredLogs.map((log, idx) => {
                        const Icon = typeIcons[log.type] || ClockIcon;
                        const colorClass = typeColors[log.type] || 'bg-gray-100 text-gray-600';

                        return (
                            <div key={log.id} className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all animate-fade-in-up">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                    <Icon className="w-4.5 h-4.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-slate-800 truncate">{log.title}</p>
                                        <span className="text-[10px] text-slate-300 font-medium flex-shrink-0">
                                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed truncate">{log.description}</p>
                                    {log.actor && (
                                        <p className="text-[10px] text-slate-300 mt-1 font-medium flex items-center gap-1">
                                            <UserIcon className="w-3 h-3" /> {log.actor}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
