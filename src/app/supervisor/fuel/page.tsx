"use client";

import { useStore } from "@/lib/store";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

type FuelFilter = 'all' | 'pending' | 'verified' | 'approved' | 'rejected';

export default function FuelPage() {
    const { fuelEntries, verifyFuelEntry, drivers, vehicles } = useStore();
    const [filter, setFilter] = useState<FuelFilter>('all');
    const [search, setSearch] = useState('');

    const enrichedEntries = useMemo(() => {
        return fuelEntries.map(entry => {
            const driver = drivers.find(d => d.id === entry.driverId);
            const vehicle = vehicles.find(v => v.id === entry.vehicleId);
            return {
                ...entry,
                driverName: driver?.name || entry.driverId,
                vehiclePlate: vehicle?.plateNumber || entry.vehicleId,
                vehicleModel: vehicle?.model || '',
            };
        });
    }, [fuelEntries, drivers, vehicles]);

    const filteredEntries = useMemo(() => {
        return enrichedEntries.filter(e => {
            const matchesFilter = filter === 'all' || e.status === filter;
            const matchesSearch = search === '' ||
                e.driverName.toLowerCase().includes(search.toLowerCase()) ||
                e.vehiclePlate.toLowerCase().includes(search.toLowerCase()) ||
                e.location.toLowerCase().includes(search.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [enrichedEntries, filter, search]);

    const counts = {
        all: fuelEntries.length,
        pending: fuelEntries.filter(f => f.status === 'pending').length,
        verified: fuelEntries.filter(f => f.status === 'verified').length,
        approved: fuelEntries.filter(f => f.status === 'approved').length,
        rejected: fuelEntries.filter(f => f.status === 'rejected').length,
    };

    const totalCost = fuelEntries.reduce((sum, f) => sum + f.cost, 0);
    const totalLitres = fuelEntries.reduce((sum, f) => sum + f.amount, 0);

    const [rejectingId, setRejectingId] = useState<string | null>(null);

    const handleVerify = (id: string) => {
        verifyFuelEntry(id, 'u2');
    };

    const handleReject = (id: string) => {
        useStore.getState().rejectFuelEntry(id, 'u2');
        setRejectingId(null);
    };

    const statusConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
        'pending': { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Pending' },
        'verified': { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Verified' },
        'approved': { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Approved' },
        'rejected': { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' },
    };

    return (
        <div className="space-y-6 pb-24 md:pb-4">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Fuel Verification</h1>
                <p className="text-slate-400 text-sm mt-1">Review and verify driver fuel claims</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center card-hover">
                    <p className="text-xl font-black text-slate-800">₹{totalCost.toLocaleString()}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Total Fuel Cost</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center card-hover">
                    <p className="text-xl font-black text-blue-600">{totalLitres}L</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Total Litres</p>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-center card-hover">
                    <p className="text-xl font-black text-amber-600">{counts.pending}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mt-1">Pending Review</p>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 text-center card-hover">
                    <p className="text-xl font-black text-emerald-600">{counts.approved + counts.verified}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mt-1">Processed</p>
                </div>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-white rounded-xl border border-gray-100 p-1 shadow-sm flex-shrink-0">
                    {(Object.keys(counts) as FuelFilter[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-2 rounded-lg text-[11px] font-bold capitalize whitespace-nowrap transition-all ${filter === f
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
                        placeholder="Search by driver, vehicle, or station..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Fuel Entry Cards */}
            <div className="space-y-3 stagger-children">
                {filteredEntries.map(entry => {
                    const config = statusConfig[entry.status] || statusConfig.pending;
                    return (
                        <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden card-hover">
                            <div className="p-4 md:p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg shadow-lg shadow-amber-200">
                                            ⛽
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                {entry.driverName}
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.bg} ${config.color} ${config.border}`}>
                                                    {config.label}
                                                </span>
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                {entry.vehiclePlate} · {entry.vehicleModel}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-slate-800">₹{entry.cost.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{entry.amount}L</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Station</p>
                                        <p className="text-xs font-bold text-slate-700 truncate">{entry.location}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Odometer</p>
                                        <p className="text-xs font-bold text-slate-700">{entry.odometer.toLocaleString()} km</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Trip</p>
                                        <p className="text-xs font-bold text-blue-600">#{entry.tripId.toUpperCase()}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Date</p>
                                        <p className="text-xs font-bold text-slate-700">{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</p>
                                    </div>
                                </div>

                                {/* Action Buttons (only for pending) */}
                                {entry.status === 'pending' && (
                                    <div className="flex gap-3 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => handleVerify(entry.id)}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" /> Verify & Approve
                                        </button>
                                        {rejectingId === entry.id ? (
                                            <div className="flex-1 flex items-center gap-2">
                                                <button
                                                    onClick={() => handleReject(entry.id)}
                                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.97]"
                                                >
                                                    <ExclamationTriangleIcon className="w-4 h-4" /> Confirm Reject
                                                </button>
                                                <button
                                                    onClick={() => setRejectingId(null)}
                                                    className="px-4 py-3 bg-gray-50 text-slate-500 text-xs font-bold rounded-xl border border-gray-200 hover:bg-gray-100 transition-all active:scale-[0.97]"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setRejectingId(entry.id)}
                                                className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.97]"
                                            >
                                                <XCircleIcon className="w-4 h-4" /> Reject
                                            </button>
                                        )}
                                    </div>
                                )}

                                {entry.status === 'verified' && (
                                    <div className="pt-3 border-t border-gray-100">
                                        <p className="text-[10px] text-blue-500 font-bold flex items-center gap-1">
                                            <CheckCircleIcon className="w-3.5 h-3.5" />
                                            Verified — awaiting manager approval
                                        </p>
                                    </div>
                                )}

                                {entry.status === 'approved' && (
                                    <div className="pt-3 border-t border-gray-100">
                                        <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                            <CheckCircleIcon className="w-3.5 h-3.5" />
                                            Fully approved
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {filteredEntries.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                        <span className="text-4xl mb-3 block">⛽</span>
                        <p className="text-slate-400 font-medium">No fuel entries found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
