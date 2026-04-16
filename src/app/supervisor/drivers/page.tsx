"use client";

import { useStore } from "@/lib/store";
import { useState, useMemo } from "react";
import { Driver } from "@/lib/types";
import DriverDetailModal from "@/components/common/DriverDetailModal";
import {
    UserIcon,
    PhoneIcon,
    TruckIcon,
    MapPinIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

type DriverFilter = 'all' | 'available' | 'on-trip' | 'off-duty';

export default function DriversPage() {
    const { drivers, trips, vehicles } = useStore();
    const [filter, setFilter] = useState<DriverFilter>('all');
    const [search, setSearch] = useState('');
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

    const driverData = useMemo(() => {
        return drivers.map(driver => {
            const driverTrips = trips.filter(t => t.driverId === driver.id);
            const completedTrips = driverTrips.filter(t => t.status === 'completed');
            const allDrops = driverTrips.flatMap(t => t.drops);
            const deliveredDrops = allDrops.filter(d => d.status === 'delivered');
            const currentTrip = driverTrips.find(t => t.status === 'in-progress' || t.status === 'assigned');
            const currentVehicle = currentTrip ? vehicles.find(v => v.id === currentTrip.vehicleId) : null;
            const totalKm = completedTrips.reduce((sum, t) => sum + (t.actualDistance || t.estimatedDistance), 0);

            return {
                ...driver,
                totalTrips: driverTrips.length,
                completedTrips: completedTrips.length,
                totalDeliveries: allDrops.length,
                deliveredCount: deliveredDrops.length,
                successRate: allDrops.length > 0 ? Math.round((deliveredDrops.length / allDrops.length) * 100) : 0,
                currentTrip,
                currentVehicle,
                totalKm,
            };
        });
    }, [drivers, trips, vehicles]);

    const filteredDrivers = driverData.filter(d => {
        const matchesFilter = filter === 'all' || d.status === filter;
        const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.id.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const statusConfig: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
        'available': { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Available', icon: '🟢' },
        'on-trip': { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'On Trip', icon: '🔵' },
        'off-duty': { color: 'text-slate-500', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Off Duty', icon: '⚫' },
    };

    const counts = {
        all: drivers.length,
        available: drivers.filter(d => d.status === 'available').length,
        'on-trip': drivers.filter(d => d.status === 'on-trip').length,
        'off-duty': drivers.filter(d => d.status === 'off-duty').length,
    };

    return (
        <div className="space-y-6 pb-24 md:pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Driver Management</h1>
                    <p className="text-slate-400 text-sm mt-1">Monitor and manage all fleet drivers</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
                        {(Object.keys(counts) as DriverFilter[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-2 rounded-lg text-[11px] font-bold capitalize transition-all ${filter === f
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                    : 'text-slate-500 hover:bg-gray-50'
                                    }`}
                            >
                                {f === 'all' ? 'All' : f.replace('-', ' ')} <span className="opacity-60">({counts[f]})</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                    type="text"
                    placeholder="Search drivers by name or ID..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                />
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 text-center">
                    <p className="text-2xl font-black text-emerald-600">{counts.available}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mt-1">Available</p>
                </div>
                <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 text-center">
                    <p className="text-2xl font-black text-blue-600">{counts['on-trip']}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mt-1">On Trip</p>
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-black text-slate-600">{counts['off-duty']}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Off Duty</p>
                </div>
            </div>

            {/* Driver Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
                {filteredDrivers.map(driver => {
                    const status = statusConfig[driver.status] || statusConfig['off-duty'];
                    return (
                        <div key={driver.id} onClick={() => setSelectedDriver(driver)} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden card-hover cursor-pointer">
                            {/* Header */}
                            <div className="p-5 pb-0">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-200">
                                            {driver.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm">{driver.name}</h3>
                                            <p className="text-[11px] text-slate-400 font-medium">ID: {driver.id.toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${status.bg} ${status.color} ${status.border}`}>
                                        {status.icon} {status.label}
                                    </span>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="px-5 pb-4">
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="text-center p-2.5 bg-gray-50 rounded-xl">
                                        <p className="text-lg font-black text-slate-800">{driver.completedTrips}</p>
                                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Trips</p>
                                    </div>
                                    <div className="text-center p-2.5 bg-gray-50 rounded-xl">
                                        <p className="text-lg font-black text-emerald-600">{driver.deliveredCount}</p>
                                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Delivered</p>
                                    </div>
                                    <div className="text-center p-2.5 bg-gray-50 rounded-xl">
                                        <p className={`text-lg font-black ${driver.successRate >= 90 ? 'text-emerald-600' : driver.successRate >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
                                            {driver.successRate}%
                                        </p>
                                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Success</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-3">
                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                                        <span>Delivery Rate</span>
                                        <span>{driver.deliveredCount}/{driver.totalDeliveries}</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${driver.successRate >= 90 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                                : driver.successRate >= 70 ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                                                    : 'bg-gradient-to-r from-amber-400 to-amber-600'
                                                }`}
                                            style={{ width: `${driver.successRate}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Total KM & License */}
                                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3">
                                    <div className="flex items-center gap-2">
                                        <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{driver.totalKm.toLocaleString()} km covered</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <PhoneIcon className="w-3 h-3" />
                                        <span className="text-[10px] font-mono">{driver.licenseNumber}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Current Assignment */}
                            {driver.currentTrip && (
                                <div className="bg-blue-50 border-t border-blue-100 px-5 py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TruckIcon className="w-4 h-4 text-blue-600" />
                                            <span className="text-xs font-bold text-blue-700">
                                                Trip #{driver.currentTrip.id.toUpperCase()}
                                            </span>
                                        </div>
                                        {driver.currentVehicle && (
                                            <span className="text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">
                                                {driver.currentVehicle.plateNumber}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-blue-500 mt-1 truncate">
                                        {driver.currentTrip.drops.filter(d => d.status === 'delivered').length}/{driver.currentTrip.drops.length} drops completed
                                    </p>
                                </div>
                            )}

                            {!driver.currentTrip && driver.status === 'available' && (
                                <div className="bg-emerald-50 border-t border-emerald-100 px-5 py-3 text-center">
                                    <span className="text-[11px] font-bold text-emerald-600">✅ Ready for Assignment</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredDrivers.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <span className="text-4xl mb-3 block">🔍</span>
                    <p className="text-slate-400 font-medium">No drivers found matching your criteria</p>
                </div>
            )}

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
