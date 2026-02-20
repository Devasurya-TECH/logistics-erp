"use client";

import { useStore } from "@/lib/store";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import TripForm from "@/components/trips/TripForm";
import {
    PlusIcon,
    MagnifyingGlassIcon,
    TruckIcon,
    MapPinIcon,
    UserIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

type DeliveryView = 'all' | 'pending' | 'delivered' | 'failed';

export default function DeliveriesPage() {
    const { trips, drivers, vehicles } = useStore();
    const [isCreatingTrip, setIsCreatingTrip] = useState(false);
    const [viewFilter, setViewFilter] = useState<DeliveryView>('all');
    const [search, setSearch] = useState('');

    // Flatten all deliveries with trip context
    const allDeliveries = useMemo(() => {
        return trips.flatMap(trip => {
            const driver = drivers.find(d => d.id === trip.driverId);
            const vehicle = vehicles.find(v => v.id === trip.vehicleId);
            return trip.drops.map(drop => ({
                ...drop,
                tripId: trip.id,
                tripStatus: trip.status,
                driverName: driver?.name || 'Unassigned',
                driverId: trip.driverId || '',
                vehiclePlate: vehicle?.plateNumber || 'N/A',
                startAddress: trip.startLocation.address,
            }));
        });
    }, [trips, drivers, vehicles]);

    const filteredDeliveries = useMemo(() => {
        return allDeliveries.filter(d => {
            const matchesFilter = viewFilter === 'all' || d.status === viewFilter;
            const matchesSearch = search === '' ||
                d.customerName.toLowerCase().includes(search.toLowerCase()) ||
                d.address.toLowerCase().includes(search.toLowerCase()) ||
                d.tripId.toLowerCase().includes(search.toLowerCase()) ||
                d.driverName.toLowerCase().includes(search.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [allDeliveries, viewFilter, search]);

    const counts = {
        all: allDeliveries.length,
        pending: allDeliveries.filter(d => d.status === 'pending').length,
        delivered: allDeliveries.filter(d => d.status === 'delivered').length,
        failed: allDeliveries.filter(d => d.status === 'failed').length,
    };

    const statusConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
        'pending': {
            color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
            icon: <ClockIcon className="w-4 h-4 text-amber-600" />
        },
        'delivered': {
            color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',
            icon: <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
        },
        'failed': {
            color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200',
            icon: <ExclamationCircleIcon className="w-4 h-4 text-red-600" />
        },
        'skipped': {
            color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200',
            icon: <ExclamationCircleIcon className="w-4 h-4 text-gray-500" />
        },
    };

    return (
        <div className="space-y-6 pb-24 md:pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Delivery Management</h1>
                    <p className="text-slate-400 text-sm mt-1">Create, assign, and track all deliveries</p>
                </div>
                <button
                    onClick={() => setIsCreatingTrip(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 text-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    New Delivery Trip
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center card-hover">
                    <p className="text-2xl font-black text-slate-800">{counts.all}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Total</p>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-center card-hover">
                    <p className="text-2xl font-black text-amber-600">{counts.pending}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mt-1">Pending</p>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 text-center card-hover">
                    <p className="text-2xl font-black text-emerald-600">{counts.delivered}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mt-1">Delivered</p>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center card-hover">
                    <p className="text-2xl font-black text-red-600">{counts.failed}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mt-1">Failed</p>
                </div>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm flex-shrink-0">
                    {(Object.keys(counts) as DeliveryView[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setViewFilter(f)}
                            className={`px-3 py-2 rounded-lg text-[11px] font-bold capitalize transition-all ${viewFilter === f
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'text-slate-500 hover:bg-gray-50'
                                }`}
                        >
                            {f} ({counts[f]})
                        </button>
                    ))}
                </div>
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Search by customer, address, trip, or driver..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Delivery Table / Cards */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                <th className="px-5 py-4 text-left">Customer</th>
                                <th className="px-5 py-4 text-left">Address</th>
                                <th className="px-5 py-4 text-left">Trip</th>
                                <th className="px-5 py-4 text-left">Driver</th>
                                <th className="px-5 py-4 text-left">ETA</th>
                                <th className="px-5 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredDeliveries.map(delivery => {
                                const config = statusConfig[delivery.status] || statusConfig.pending;
                                return (
                                    <tr key={`${delivery.tripId}-${delivery.id}`} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-slate-800">{delivery.customerName}</p>
                                            {delivery.orderId && (
                                                <p className="text-[10px] text-slate-400 mt-0.5">#{delivery.orderId}</p>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-slate-600 text-xs truncate max-w-[200px]">{delivery.address}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                #{delivery.tripId.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                                                    {delivery.driverName.charAt(0)}
                                                </div>
                                                <span className="text-xs text-slate-600 font-medium">{delivery.driverName}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-xs text-slate-500">
                                            {delivery.estimatedArrival
                                                ? format(new Date(delivery.estimatedArrival), 'MMM d, h:mm a')
                                                : '—'
                                            }
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${config.bg} ${config.color} ${config.border}`}>
                                                {config.icon}
                                                {delivery.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-50">
                    {filteredDeliveries.map(delivery => {
                        const config = statusConfig[delivery.status] || statusConfig.pending;
                        return (
                            <div key={`${delivery.tripId}-${delivery.id}`} className="p-4 hover:bg-blue-50/30 transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{delivery.customerName}</p>
                                        <p className="text-[10px] text-slate-400">Trip #{delivery.tripId.toUpperCase()}</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.bg} ${config.color} ${config.border}`}>
                                        {delivery.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate mb-2">{delivery.address}</p>
                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <UserIcon className="w-3 h-3" />
                                        {delivery.driverName}
                                    </span>
                                    {delivery.estimatedArrival && (
                                        <span>{format(new Date(delivery.estimatedArrival), 'h:mm a')}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredDeliveries.length === 0 && (
                    <div className="p-12 text-center">
                        <span className="text-4xl mb-3 block">📦</span>
                        <p className="text-slate-400 font-medium">No deliveries found</p>
                    </div>
                )}
            </div>

            {/* Create Trip Modal */}
            {isCreatingTrip && <TripForm onClose={() => setIsCreatingTrip(false)} />}
        </div>
    );
}
