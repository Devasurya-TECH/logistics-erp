"use client";

import { useStore } from "@/lib/store";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
    TruckIcon,
    UserGroupIcon,
    CheckBadgeIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    ArrowTrendingUpIcon,
    MapPinIcon,
    ChartBarIcon,
    BellAlertIcon,
    CheckCircleIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import dynamic from "next/dynamic";
import DriverDetailModal from "@/components/common/DriverDetailModal";
import { Driver } from "@/lib/types";

// Dynamic import for Map preview
const LiveTrackingMapContent = dynamic(() => import('@/components/maps/LiveTrackingMapContent'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-900 animate-pulse flex items-center justify-center rounded-2xl"><p className="text-slate-500 text-xs">Initializing Tactical Map...</p></div>
});

// Animated counter hook
function useAnimatedNumber(target: number, duration = 800) {
    const [current, setCurrent] = useState(0);
    useEffect(() => {
        if (target === 0) { setCurrent(0); return; }
        let start = 0;
        const startTime = performance.now();
        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setCurrent(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [target, duration]);
    return current;
}

export default function SupervisorDashboard() {
    const { trips, drivers, vehicles, fuelEntries, alerts, resolveAlert } = useStore();
    const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'all'>('all');
    const [showAlerts, setShowAlerts] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const scrollToMap = () => {
        mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // ─── Computed Stats ───
    const stats = useMemo(() => {
        const totalTrips = trips.length;
        const completedTrips = trips.filter(t => t.status === 'completed').length;
        const inProgressTrips = trips.filter(t => t.status === 'in-progress').length;
        const assignedTrips = trips.filter(t => t.status === 'assigned').length;
        const plannedTrips = trips.filter(t => t.status === 'planned').length;
        const cancelledTrips = trips.filter(t => t.status === 'cancelled').length;

        const allDrops = trips.flatMap(t => t.drops);
        const totalDeliveries = allDrops.length;
        const deliveredCount = allDrops.filter(d => d.status === 'delivered').length;
        const pendingCount = allDrops.filter(d => d.status === 'pending').length;
        const failedCount = allDrops.filter(d => d.status === 'failed').length;
        const successRate = totalDeliveries > 0 ? Math.round((deliveredCount / totalDeliveries) * 100) : 0;

        const totalDrivers = drivers.length;
        const activeDrivers = drivers.filter(d => d.status === 'on-trip').length;
        const availableDrivers = drivers.filter(d => d.status === 'available').length;
        const offDutyDrivers = drivers.filter(d => d.status === 'off-duty').length;

        const totalEstimatedKm = trips
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + (t.actualDistance || t.estimatedDistance), 0);

        const pendingFuel = fuelEntries.filter(f => f.status === 'pending').length;
        const unresolvedAlerts = alerts.filter(a => !a.resolved).length;
        const criticalAlerts = alerts.filter(a => !a.resolved && a.severity === 'critical').length;

        return {
            totalTrips, completedTrips, inProgressTrips, assignedTrips, plannedTrips, cancelledTrips,
            totalDeliveries, deliveredCount, pendingCount, failedCount, successRate,
            totalDrivers, activeDrivers, availableDrivers, offDutyDrivers,
            totalEstimatedKm, pendingFuel, unresolvedAlerts, criticalAlerts,
        };
    }, [trips, drivers, fuelEntries, alerts]);

    // Animated numbers
    const animDelivered = useAnimatedNumber(stats.deliveredCount);
    const animSuccessRate = useAnimatedNumber(stats.successRate);
    const animDrivers = useAnimatedNumber(stats.totalDrivers);
    const animAlerts = useAnimatedNumber(stats.unresolvedAlerts);

    // ─── Driver performance data ───
    const driverPerformance = useMemo(() => {
        const driverMap = new Map<string, { name: string; completed: number; total: number; deliveries: number; delivered: number }>();

        trips.forEach(trip => {
            if (!trip.driverId) return;
            const driver = drivers.find(d => d.id === trip.driverId);
            if (!driver) return;

            if (!driverMap.has(trip.driverId)) {
                driverMap.set(trip.driverId, {
                    name: driver.name,
                    completed: 0,
                    total: 0,
                    deliveries: 0,
                    delivered: 0,
                });
            }
            const data = driverMap.get(trip.driverId)!;
            data.total += 1;
            if (trip.status === 'completed') data.completed += 1;
            data.deliveries += trip.drops.length;
            data.delivered += trip.drops.filter(d => d.status === 'delivered').length;
        });

        return Array.from(driverMap.entries()).map(([id, data]) => ({
            id,
            ...data,
            rate: data.deliveries > 0 ? Math.round((data.delivered / data.deliveries) * 100) : 0,
        })).sort((a, b) => b.rate - a.rate);
    }, [trips, drivers]);

    // ─── Active trips (in-progress & assigned) ───
    const activeTrips = trips.filter(t => t.status === 'in-progress' || t.status === 'assigned');

    // ─── Recent activity feed ───
    const recentActivity = useMemo(() => {
        const activities: { id: string; icon: string; text: string; time: string; color: string }[] = [];

        trips.forEach(trip => {
            if (trip.startTime) {
                activities.push({
                    id: `start-${trip.id}`,
                    icon: '🚀',
                    text: `Trip #${trip.id.toUpperCase()} started from ${trip.startLocation.address.split(',')[0]}`,
                    time: trip.startTime,
                    color: 'blue',
                });
            }
            if (trip.endTime) {
                activities.push({
                    id: `end-${trip.id}`,
                    icon: '✅',
                    text: `Trip #${trip.id.toUpperCase()} completed successfully`,
                    time: trip.endTime,
                    color: 'green',
                });
            }
            trip.drops.forEach(drop => {
                if (drop.actualArrival) {
                    activities.push({
                        id: `deliver-${drop.id}`,
                        icon: '📦',
                        text: `Delivered to ${drop.customerName} at ${drop.address.split(',')[0]}`,
                        time: drop.actualArrival,
                        color: 'emerald',
                    });
                }
            });
        });

        return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
    }, [trips]);

    // ─── Unresolved alerts for the panel ───
    const unresolvedAlertsList = alerts.filter(a => !a.resolved).sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Trip Status Overview data with EXPLICIT class names (fixes Tailwind JIT issue)
    const tripStatusItems = [
        { label: 'Planned', count: stats.plannedTrips, icon: '📝', bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-600' },
        { label: 'Assigned', count: stats.assignedTrips, icon: '🟡', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600' },
        { label: 'In Progress', count: stats.inProgressTrips, icon: '🔵', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600' },
        { label: 'Completed', count: stats.completedTrips, icon: '✅', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
        { label: 'Cancelled', count: stats.cancelledTrips, icon: '❌', bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600' },
        { label: 'Total', count: stats.totalTrips, icon: '📦', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600' },
    ];

    return (
        <div className="space-y-6 pb-24 md:pb-4">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                        Supervisor Command Center
                    </h1>
                    <p className="text-slate-400 text-xs md:sm mt-1">Real-time fleet operations & delivery management</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Alerts Toggle */}
                    <button
                        onClick={() => setShowAlerts(!showAlerts)}
                        className={`relative p-2.5 rounded-xl border transition-all active:scale-95 ${showAlerts
                            ? 'bg-red-50 border-red-200 text-red-600'
                            : 'bg-gray-50 border-gray-100 text-slate-500 hover:bg-white hover:border-gray-200'
                            }`}
                    >
                        <BellAlertIcon className="w-5 h-5" />
                        {stats.unresolvedAlerts > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-red-500 text-[8px] md:text-[10px] font-bold text-white shadow-lg shadow-red-200 ring-2 ring-white animate-pulse-soft">
                                {stats.unresolvedAlerts}
                            </span>
                        )}
                    </button>

                    {/* Time Filters - Scrollable on mobile */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mb-1">
                        {(['today', 'week', 'all'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setTimeFilter(f)}
                                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${timeFilter === f
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'bg-gray-50 text-slate-500 hover:bg-gray-100 border border-gray-100'
                                    }`}
                            >
                                {f === 'today' ? 'Today' : f === 'week' ? 'Weekly' : 'All'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Alerts Panel (toggle) ─── */}
            {showAlerts && (
                <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden animate-fade-in-up">
                    <div className="p-4 md:p-5 border-b border-red-50 flex items-center justify-between bg-red-50/30">
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-red-100 p-1.5 rounded-lg text-red-600 text-xs">🚨</span>
                            Active Alerts
                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                                {unresolvedAlertsList.length}
                            </span>
                        </h2>
                        <button onClick={() => setShowAlerts(false)} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors">
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto custom-scrollbar">
                        {unresolvedAlertsList.length === 0 ? (
                            <div className="p-8 text-center">
                                <span className="text-3xl mb-2 block">🎉</span>
                                <p className="text-slate-400 text-xs font-medium">All clear! No active alerts.</p>
                            </div>
                        ) : (
                            unresolvedAlertsList.map(alert => (
                                <div key={alert.id} className="p-4 hover:bg-gray-50/50 transition-colors flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${alert.severity === 'critical'
                                        ? 'bg-red-100 text-red-600 border border-red-200'
                                        : alert.severity === 'high'
                                            ? 'bg-orange-100 text-orange-600 border border-orange-200'
                                            : alert.severity === 'medium'
                                                ? 'bg-amber-100 text-amber-600 border border-amber-200'
                                                : 'bg-blue-100 text-blue-600 border border-blue-200'
                                        }`}>
                                        {alert.severity === 'critical' ? '🔴' : alert.severity === 'high' ? '🟠' : alert.severity === 'medium' ? '🟡' : '🔵'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${alert.severity === 'critical'
                                                ? 'bg-red-50 text-red-600 border-red-200'
                                                : alert.severity === 'high'
                                                    ? 'bg-orange-50 text-orange-600 border-orange-200'
                                                    : alert.severity === 'medium'
                                                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                                                        : 'bg-blue-50 text-blue-600 border-blue-200'
                                                }`}>
                                                {alert.severity}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-50 text-slate-500 border border-gray-200">
                                                {alert.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-700 font-medium leading-relaxed">{alert.message}</p>
                                        <p className="text-[10px] text-slate-300 mt-1 font-medium">
                                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => resolveAlert(alert.id)}
                                        className="flex-shrink-0 p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all active:scale-95"
                                        title="Resolve"
                                    >
                                        <CheckCircleIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 stagger-children">
                {/* Total Deliveries */}
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm card-hover group relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:opacity-80 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 group-hover:scale-110 transition-transform">
                                <TruckIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                                Deliveries
                            </span>
                        </div>
                        <p className="text-3xl font-black text-slate-800">{animDelivered}<span className="text-base text-slate-300 font-bold">/{stats.totalDeliveries}</span></p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">{stats.pendingCount} pending · {stats.failedCount} failed</p>
                        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700" style={{ width: `${stats.successRate}%` }} />
                        </div>
                    </div>
                </div>

                {/* Success Rate */}
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm card-hover group relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-50 rounded-full opacity-50 group-hover:opacity-80 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 group-hover:scale-110 transition-transform">
                                <CheckBadgeIcon className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                Success
                            </span>
                        </div>
                        <p className="text-3xl font-black text-emerald-600">{animSuccessRate}%</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">Delivery success rate</p>
                        <div className="mt-3 flex items-center gap-1.5 text-emerald-500">
                            <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">
                                {stats.completedTrips}/{stats.totalTrips} trips done
                            </span>
                        </div>
                    </div>
                </div>

                {/* Active Drivers */}
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm card-hover group relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-violet-50 rounded-full opacity-50 group-hover:opacity-80 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 rounded-xl bg-violet-50 border border-violet-100 group-hover:scale-110 transition-transform">
                                <UserGroupIcon className="w-5 h-5 text-violet-600" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-1 rounded-full border border-violet-100">
                                Drivers
                            </span>
                        </div>
                        <p className="text-3xl font-black text-slate-800">{animDrivers}</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">
                            <span className="text-emerald-500">{stats.availableDrivers} available</span> · <span className="text-blue-500">{stats.activeDrivers} active</span>
                        </p>
                        <div className="mt-3 flex gap-1">
                            {Array.from({ length: stats.totalDrivers }).map((_, i) => (
                                <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${i < stats.activeDrivers ? 'bg-blue-500' : i < stats.activeDrivers + stats.availableDrivers ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                <button
                    onClick={() => setShowAlerts(!showAlerts)}
                    className={`text-left bg-white rounded-2xl p-4 md:p-5 border shadow-sm card-hover group relative overflow-hidden transition-all ${stats.criticalAlerts > 0 ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}
                >
                    <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-50 group-hover:opacity-80 transition-opacity ${stats.criticalAlerts > 0 ? 'bg-red-50' : 'bg-amber-50'}`} />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2.5 rounded-xl border group-hover:scale-110 transition-transform ${stats.criticalAlerts > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-100'}`}>
                                <ExclamationTriangleIcon className={`w-5 h-5 ${stats.criticalAlerts > 0 ? 'text-red-600' : 'text-amber-600'}`} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${stats.criticalAlerts > 0 ? 'text-red-600 bg-red-50 border-red-200 animate-pulse-soft' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                                Alerts
                            </span>
                        </div>
                        <p className="text-3xl font-black text-slate-800">{animAlerts}</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">
                            {stats.criticalAlerts > 0 && (
                                <span className="text-red-500 font-bold inline-flex items-center gap-1">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                    {stats.criticalAlerts} critical
                                </span>
                            )}
                            {stats.criticalAlerts > 0 && " · "}
                            {stats.pendingFuel} fuel pending
                        </p>
                    </div>
                </button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

                {/* ─── Active Trips Panel (2/3 width) ─── */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-blue-100 p-1.5 rounded-lg text-blue-600 text-sm">🚚</span>
                            Live Trip Tracker
                            {activeTrips.length > 0 && (
                                <span className="ml-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                                </span>
                            )}
                        </h2>
                        <Link href="/supervisor/trips" className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all">
                            View All →
                        </Link>
                    </div>

                    {/* Dashboard Mini-Map - Fleet Context */}
                    <div ref={mapContainerRef} className="bg-slate-900 h-48 md:h-80 border-y border-slate-800 relative group">
                        <LiveTrackingMapContent
                            positions={vehicles.map(v => {
                                const activeTrip = trips.find(t => t.vehicleId === v.id && t.status === 'in-progress');
                                const driver = activeTrip ? drivers.find(d => d.id === activeTrip.driverId) : null;
                                return {
                                    id: v.id,
                                    lat: v.location.lat,
                                    lng: v.location.lng,
                                    status: activeTrip ? 'moving' : v.status === 'active' ? 'idle' : 'offline',
                                    speed: activeTrip ? 40 : 0,
                                    driverName: driver?.name || 'Idle',
                                    vehiclePlate: v.plateNumber,
                                    tripId: activeTrip?.id || null,
                                };
                            })}
                            selectedId={selectedVehicleId}
                            onSelect={(id) => setSelectedVehicleId(id)}
                        />
                        <div className="absolute inset-0 bg-slate-900/10 pointer-events-none group-hover:bg-slate-900/0 transition-all"></div>
                        <Link
                            href="/supervisor/tracking"
                            className="absolute bottom-4 right-4 z-[400] bg-white text-slate-800 text-[10px] font-bold px-3 py-2 rounded-xl shadow-2xl flex items-center gap-2 border border-white hover:scale-105 transition-all"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            Go to Live Radar
                        </Link>
                    </div>

                    <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {activeTrips.length === 0 ? (
                            <div className="p-12 text-center">
                                <span className="text-4xl mb-3 block">🎉</span>
                                <p className="text-slate-400 font-medium">No active trips right now</p>
                                <p className="text-slate-300 text-xs mt-1">All trips are either completed or pending</p>
                            </div>
                        ) : (
                            activeTrips.map(trip => {
                                const driver = drivers.find(d => d.id === trip.driverId);
                                const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                                const totalDrops = trip.drops.length;
                                const deliveredDrops = trip.drops.filter(d => d.status === 'delivered').length;
                                const progress = totalDrops > 0 ? Math.round((deliveredDrops / totalDrops) * 100) : 0;

                                return (
                                    <div key={trip.id} className="p-5 hover:bg-blue-50/30 transition-colors">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${trip.status === 'in-progress'
                                                    ? 'bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-200'
                                                    : 'bg-amber-100 text-amber-600 border border-amber-200'
                                                    }`}>
                                                    {trip.status === 'in-progress' ? '🔴' : '🟡'}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-sm">Trip #{trip.id.toUpperCase()}</h3>
                                                    <p className="text-xs text-slate-400">
                                                        {driver?.name || 'Unassigned'} · {vehicle?.plateNumber || 'No vehicle'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${trip.status === 'in-progress'
                                                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                                                    : 'bg-amber-50 text-amber-600 border-amber-200'
                                                    }`}>
                                                    {trip.status}
                                                </span>
                                                {trip.status === 'in-progress' && (
                                                    <button
                                                        onClick={() => {
                                                            if (trip.vehicleId) {
                                                                setSelectedVehicleId(trip.vehicleId);
                                                                scrollToMap();
                                                            }
                                                        }}
                                                        className={`p-1.5 rounded-lg transition-all border ${selectedVehicleId === trip.vehicleId
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                                                            : 'bg-gray-50 text-slate-400 hover:text-blue-600 border-gray-100 hover:border-blue-100'
                                                            }`}
                                                        title="Locate on Map"
                                                    >
                                                        <MapPinIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                            <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="truncate">{trip.startLocation.address}</span>
                                        </div>

                                        {/* Delivery Progress */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                                                {deliveredDrops}/{totalDrops} drops
                                            </span>
                                        </div>

                                        {/* Drop points inline */}
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {trip.drops.map((drop, i) => (
                                                <span key={drop.id} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${drop.status === 'delivered'
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    : drop.status === 'failed'
                                                        ? 'bg-red-50 text-red-600 border border-red-100'
                                                        : 'bg-gray-50 text-slate-500 border border-gray-200'
                                                    }`}>
                                                    {i + 1}. {drop.customerName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ─── Right Column ─── */}
                <div className="space-y-4 md:space-y-6">

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="bg-violet-100 p-1 rounded-lg text-violet-600 text-xs">⚡</span>
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-2.5">
                            <Link href="/supervisor/deliveries" className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all group active:scale-95">
                                <TruckIcon className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-blue-700">New Delivery</span>
                            </Link>
                            <Link href="/supervisor/drivers" className="flex flex-col items-center gap-2 p-4 bg-violet-50 rounded-xl border border-violet-100 hover:bg-violet-100 transition-all group active:scale-95">
                                <UserGroupIcon className="w-6 h-6 text-violet-600 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-violet-700">Manage Drivers</span>
                            </Link>
                            <Link href="/supervisor/trips" className="flex flex-col items-center gap-2 p-4 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all group active:scale-95">
                                <ChartBarIcon className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-emerald-700">All Trips</span>
                            </Link>
                            <Link href="/supervisor/fuel" className="flex flex-col items-center gap-2 p-4 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100 transition-all group active:scale-95">
                                <ClockIcon className="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-amber-700">Verify Fuel</span>
                            </Link>
                        </div>
                    </div>

                    {/* Driver Performance Leaderboard */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 md:p-5 border-b border-gray-50">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-amber-100 p-1 rounded-lg text-amber-600 text-xs">🏆</span>
                                Driver Leaderboard
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {driverPerformance.slice(0, 5).map((dp, i) => {
                                const driver = drivers.find(d => d.id === dp.id);
                                const currentTrip = trips.find(t => t.driverId === dp.id && t.status === 'in-progress');

                                return (
                                    <div
                                        key={dp.id}
                                        className="group relative px-4 py-3 flex items-center gap-3 hover:bg-blue-50/50 transition-all duration-200"
                                    >
                                        <button
                                            onClick={() => driver && setSelectedDriver(driver)}
                                            className="flex items-center gap-3 flex-1 text-left min-w-0"
                                        >
                                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{dp.name}</p>
                                                    {driver?.status === 'on-trip' && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Active"></span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400">{dp.delivered}/{dp.deliveries} deliveries</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className={`text-sm font-black ${dp.rate >= 90 ? 'text-emerald-600' : dp.rate >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
                                                    {dp.rate}%
                                                </span>
                                            </div>
                                        </button>

                                        {/* Quick Actions Overlay (Hidden by default, visible on hover) */}
                                        <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-gray-100">
                                            {currentTrip && currentTrip.vehicleId && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedVehicleId(currentTrip.vehicleId!);
                                                        scrollToMap();
                                                    }}
                                                    className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 transition-colors"
                                                    title="Track on Map"
                                                >
                                                    <MapPinIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {driverPerformance.length === 0 && (
                                <div className="p-6 text-center text-xs text-slate-400">No driver data yet</div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 md:p-5 border-b border-gray-50">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-blue-100 p-1 rounded-lg text-blue-600 text-xs">📋</span>
                                Recent Activity
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {recentActivity.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400">No recent activity</div>
                            ) : (
                                recentActivity.map(activity => (
                                    <div key={activity.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                                        <span className="text-sm mt-0.5">{activity.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-600 leading-relaxed font-medium">{activity.text}</p>
                                            <p className="text-[10px] text-slate-300 mt-0.5 font-medium">
                                                {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Trip Status Overview Bar */}
            <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="bg-indigo-100 p-1 rounded-lg text-indigo-600 text-xs">📊</span>
                    Trip Status Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
                    {tripStatusItems.map(item => (
                        <div key={item.label} className={`text-center p-2.5 md:p-4 rounded-xl border ${item.bg} ${item.border} card-hover`}>
                            <span className="text-lg md:text-xl mb-0.5 md:1 block">{item.icon}</span>
                            <p className={`text-xl md:text-2xl font-black ${item.text}`}>{item.count}</p>
                            <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5 md:1">{item.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Driver Detail Modal */}
            {selectedDriver && (
                <DriverDetailModal
                    driver={selectedDriver}
                    onClose={() => setSelectedDriver(null)}
                />
            )}
        </div>
    );
}
