"use client";

import { useStore } from "@/lib/store";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    MapPinIcon,
    TruckIcon,
    UserIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    PhoneIcon,
} from "@heroicons/react/24/outline";

type TripFilter = 'all' | 'planned' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';

export default function TripsPage() {
    const { trips, drivers, vehicles } = useStore();
    const [filter, setFilter] = useState<TripFilter>('all');
    const [search, setSearch] = useState('');
    const [expandedTrip, setExpandedTrip] = useState<string | null>(null);

    const filteredTrips = useMemo(() => {
        return trips.filter(t => {
            const matchesFilter = filter === 'all' || t.status === filter;
            const driver = drivers.find(d => d.id === t.driverId);
            const vehicle = vehicles.find(v => v.id === t.vehicleId);
            const matchesSearch = search === '' ||
                t.id.toLowerCase().includes(search.toLowerCase()) ||
                driver?.name.toLowerCase().includes(search.toLowerCase()) ||
                vehicle?.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
                t.startLocation.address.toLowerCase().includes(search.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [trips, filter, search, drivers, vehicles]);

    const statusConfig: Record<string, { color: string; bg: string; border: string; icon: string }> = {
        'planned': { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: '📝' },
        'assigned': { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: '🟡' },
        'in-progress': { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: '🔵' },
        'completed': { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅' },
        'cancelled': { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '❌' },
    };

    const tripCounts = {
        all: trips.length,
        planned: trips.filter(t => t.status === 'planned').length,
        assigned: trips.filter(t => t.status === 'assigned').length,
        'in-progress': trips.filter(t => t.status === 'in-progress').length,
        completed: trips.filter(t => t.status === 'completed').length,
        cancelled: trips.filter(t => t.status === 'cancelled').length,
    };

    return (
        <div className="space-y-6 pb-24 md:pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Trip Management</h1>
                    <p className="text-slate-400 text-sm mt-1">View and manage all delivery trips</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide bg-white rounded-xl border border-gray-100 p-1.5 shadow-sm">
                {(Object.keys(tripCounts) as TripFilter[]).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-[11px] font-bold capitalize whitespace-nowrap transition-all ${filter === f
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                            : 'text-slate-500 hover:bg-gray-50'
                            }`}
                    >
                        {f === 'all' ? 'All' : f.replace('-', ' ')} ({tripCounts[f]})
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                    type="text"
                    placeholder="Search trips by ID, driver, vehicle, or location..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                />
            </div>

            {/* Trip Cards */}
            <div className="space-y-3 stagger-children">
                {filteredTrips.map(trip => {
                    const driver = drivers.find(d => d.id === trip.driverId);
                    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                    const status = statusConfig[trip.status] || statusConfig.planned;
                    const totalDrops = trip.drops.length;
                    const deliveredDrops = trip.drops.filter(d => d.status === 'delivered').length;
                    const progress = totalDrops > 0 ? Math.round((deliveredDrops / totalDrops) * 100) : 0;
                    const isExpanded = expandedTrip === trip.id;

                    return (
                        <div key={trip.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden card-hover">
                            {/* Trip Header */}
                            <button
                                onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
                                className="w-full p-4 md:p-5 text-left"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${status.bg} border ${status.border}`}>
                                            {status.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                Trip #{trip.id.toUpperCase()}
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}>
                                                    {trip.status}
                                                </span>
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {trip.estimatedDistance} km estimated
                                                {trip.actualDistance ? ` · ${trip.actualDistance} km actual` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-700">{deliveredDrops}/{totalDrops}</p>
                                            <p className="text-[10px] text-slate-400">deliveries</p>
                                        </div>
                                        <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Quick Info Row */}
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    {driver && (
                                        <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                            {driver.name}
                                        </span>
                                    )}
                                    {vehicle && (
                                        <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                                            <TruckIcon className="w-3.5 h-3.5 text-slate-400" />
                                            {vehicle.plateNumber}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                                        <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                                        {trip.startLocation.address.split(',')[0]}
                                    </span>
                                    {trip.startTime && (
                                        <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                                            <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                                            {format(new Date(trip.startTime), 'MMM d, h:mm a')}
                                        </span>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-3 flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${trip.status === 'completed' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                                : trip.status === 'in-progress' ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                                                    : trip.status === 'cancelled' ? 'bg-gray-300'
                                                        : 'bg-gradient-to-r from-amber-400 to-amber-500'
                                                }`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{progress}%</span>
                                </div>
                            </button>

                            {/* Expanded Drop Details */}
                            {isExpanded && (
                                <div className="border-t border-gray-100 bg-gray-50/50 animate-fade-in-up">
                                    <div className="p-4 md:p-5">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                                            <MapPinIcon className="w-4 h-4" />
                                            Delivery Drops ({trip.drops.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {trip.drops.map((drop, idx) => (
                                                <div key={drop.id} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-gray-100">
                                                    <div className="flex flex-col items-center">
                                                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${drop.status === 'delivered'
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : drop.status === 'failed'
                                                                ? 'bg-red-100 text-red-600'
                                                                : drop.status === 'skipped'
                                                                    ? 'bg-gray-100 text-gray-500'
                                                                    : 'bg-blue-100 text-blue-600'
                                                            }`}>
                                                            {drop.status === 'delivered' ? '✓' : drop.status === 'failed' ? '✕' : idx + 1}
                                                        </span>
                                                        {idx < trip.drops.length - 1 && (
                                                            <div className="w-0.5 h-4 bg-gray-200 mt-1" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-sm font-bold text-slate-800 truncate">{drop.customerName}</p>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${drop.status === 'delivered'
                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                                : drop.status === 'failed'
                                                                    ? 'bg-red-50 text-red-600 border-red-200'
                                                                    : drop.status === 'skipped'
                                                                        ? 'bg-gray-50 text-gray-500 border-gray-200'
                                                                        : 'bg-blue-50 text-blue-600 border-blue-200'
                                                                }`}>
                                                                {drop.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 font-medium mt-0.5">{drop.address}</p>
                                                        {drop.customerPhone && (
                                                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-md w-fit border border-blue-100">
                                                                <PhoneIcon className="w-3 h-3" />
                                                                {drop.customerPhone}
                                                            </div>
                                                        )}
                                                        {drop.orderId && (
                                                            <p className="text-[10px] text-slate-300 mt-0.5">Order: {drop.orderId}</p>
                                                        )}
                                                        {drop.estimatedArrival && (
                                                            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                                                                <span>ETA: {format(new Date(drop.estimatedArrival), 'h:mm a')}</span>
                                                                {drop.actualArrival && (
                                                                    <span className="text-emerald-500 font-bold">
                                                                        Arrived: {format(new Date(drop.actualArrival), 'h:mm a')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Trip Summary */}
                                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="text-center p-3 bg-white rounded-xl border border-gray-100">
                                                <p className="text-lg font-black text-slate-800">{trip.estimatedDistance} km</p>
                                                <p className="text-[9px] uppercase font-bold text-slate-400">Est. Distance</p>
                                            </div>
                                            {trip.actualDistance && (
                                                <div className="text-center p-3 bg-white rounded-xl border border-gray-100">
                                                    <p className="text-lg font-black text-emerald-600">{trip.actualDistance} km</p>
                                                    <p className="text-[9px] uppercase font-bold text-slate-400">Actual</p>
                                                </div>
                                            )}
                                            {trip.startTime && (
                                                <div className="text-center p-3 bg-white rounded-xl border border-gray-100">
                                                    <p className="text-sm font-bold text-slate-800">{format(new Date(trip.startTime), 'h:mm a')}</p>
                                                    <p className="text-[9px] uppercase font-bold text-slate-400">Started</p>
                                                </div>
                                            )}
                                            {trip.endTime && (
                                                <div className="text-center p-3 bg-white rounded-xl border border-gray-100">
                                                    <p className="text-sm font-bold text-emerald-600">{format(new Date(trip.endTime), 'h:mm a')}</p>
                                                    <p className="text-[9px] uppercase font-bold text-slate-400">Completed</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredTrips.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <span className="text-4xl mb-3 block">🔍</span>
                    <p className="text-slate-400 font-medium">No trips found matching your criteria</p>
                </div>
            )}
        </div>
    );
}
