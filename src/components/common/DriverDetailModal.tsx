"use client";

import { Driver } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";
import {
    XMarkIcon,
    TruckIcon,
    MapPinIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    PhoneIcon,
    EnvelopeIcon,
    IdentificationIcon,
    ChartBarIcon,
    SignalIcon,
} from "@heroicons/react/24/outline";
import TripSelectionModal from "./TripSelectionModal";

interface DriverDetailModalProps {
    driver: Driver;
    onClose: () => void;
}

export default function DriverDetailModal({ driver, onClose }: DriverDetailModalProps) {
    const { trips, vehicles, fuelEntries, assignDriver } = useStore();
    const [isAssigning, setIsAssigning] = useState(false);
    const [showTripSelection, setShowTripSelection] = useState(false);

    const plannedTrips = useMemo(() => trips.filter(t => t.status === 'planned'), [trips]);
    const availableVehicle = useMemo(() => vehicles.find(v => v.status === 'active' || v.status === 'maintenance' ? false : true) || vehicles[0], [vehicles]);

    const stats = useMemo(() => {
        const driverTrips = trips.filter(t => t.driverId === driver.id);
        const completedTrips = driverTrips.filter(t => t.status === 'completed');
        const activeTrips = driverTrips.filter(t => t.status === 'in-progress' || t.status === 'assigned');
        const allDrops = driverTrips.flatMap(t => t.drops);
        const deliveredDrops = allDrops.filter(d => d.status === 'delivered');
        const failedDrops = allDrops.filter(d => d.status === 'failed');
        const driverFuel = fuelEntries.filter(f => f.driverId === driver.id);
        const totalFuelCost = driverFuel.reduce((s, f) => s + f.cost, 0);
        const totalDistance = driverTrips.reduce((s, t) => s + (t.actualDistance || t.estimatedDistance), 0);
        const vehicle = vehicles.find(v => v.id === driver.currentVehicleId);
        const deliveryRate = allDrops.length > 0 ? Math.round((deliveredDrops.length / allDrops.length) * 100) : 0;

        return {
            totalTrips: driverTrips.length,
            completedTrips: completedTrips.length,
            activeTrips: activeTrips.length,
            totalDeliveries: deliveredDrops.length,
            failedDeliveries: failedDrops.length,
            deliveryRate,
            totalFuelCost,
            totalFuelEntries: driverFuel.length,
            totalDistance,
            vehicle,
        };
    }, [driver, trips, vehicles, fuelEntries]);

    const handleAssign = async (tripId: string) => {
        setIsAssigning(true);
        try {
            await assignDriver(tripId, driver.id, availableVehicle.id);
            setShowTripSelection(false);
            onClose();
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-fade-in-up max-h-[90vh] overflow-y-auto">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur-sm border border-white/20">
                            {driver.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold">{driver.name}</h3>
                            <p className="text-blue-200 text-sm mt-0.5 capitalize">{driver.role} · LogiTrace</p>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1.5 ${driver.status === 'on-trip' ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30' :
                                driver.status === 'available' ? 'bg-blue-400/20 text-blue-200 border border-blue-400/30' :
                                    'bg-gray-400/20 text-gray-300 border border-gray-400/30'
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${driver.status === 'on-trip' ? 'bg-emerald-400 animate-pulse' :
                                    driver.status === 'available' ? 'bg-blue-400' :
                                        'bg-gray-400'
                                    }`} />
                                {driver.status}
                            </span>
                            {driver.isLive && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 bg-emerald-500 text-white animate-pulse ml-2 shadow-sm">
                                    <SignalIcon className="w-3 h-3" /> Live
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    {/* Contact Info */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm">
                            <EnvelopeIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600 truncate text-xs font-medium">{driver.email}</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm">
                            <IdentificationIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600 truncate text-xs font-medium">{driver.licenseNumber || 'N/A'}</span>
                        </div>
                    </div>

                    {/* Current Vehicle */}
                    {stats.vehicle && (
                        <div className="flex items-center gap-3 p-3.5 border border-blue-100 bg-blue-50/50 rounded-xl">
                            <TruckIcon className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="text-sm font-bold text-slate-800">{stats.vehicle.plateNumber}</p>
                                <p className="text-[11px] text-slate-400">{stats.vehicle.model} · Fuel: {stats.vehicle.fuelLevel}%</p>
                            </div>
                        </div>
                    )}

                    {/* Performance Stats */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                            <ChartBarIcon className="w-4 h-4" /> Performance
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xl font-black text-blue-600">{stats.totalTrips}</p>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Trips</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xl font-black text-emerald-600">{stats.completedTrips}</p>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Completed</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xl font-black text-amber-600">{stats.activeTrips}</p>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active</p>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Stats */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                            <MapPinIcon className="w-4 h-4" /> Delivery Stats
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                                <p className="text-xl font-black text-emerald-600">{stats.totalDeliveries}</p>
                                <p className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Delivered</p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                                <p className="text-xl font-black text-red-600">{stats.failedDeliveries}</p>
                                <p className="text-[9px] uppercase font-bold text-red-400 tracking-wider">Failed</p>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                                <p className="text-xl font-black text-blue-600">{stats.deliveryRate}%</p>
                                <p className="text-[9px] uppercase font-bold text-blue-400 tracking-wider">Success Rate</p>
                            </div>
                        </div>
                    </div>

                    {/* Fuel Usage */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Fuel & Distance</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-lg font-black text-slate-800">₹{(stats.totalFuelCost / 1000).toFixed(1)}k</p>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Fuel Cost</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-lg font-black text-slate-800">{stats.totalFuelEntries}</p>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Fuel Entries</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-lg font-black text-slate-800">{stats.totalDistance}<span className="text-[10px] text-slate-400">km</span></p>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Distance</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-gray-100 flex gap-2">
                        <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
                            <PhoneIcon className="w-4 h-4" /> Contact
                        </button>
                        <button
                            onClick={() => setShowTripSelection(true)}
                            disabled={driver.status !== 'available'}
                            className={`flex-1 py-3 font-bold rounded-xl border text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${driver.status === 'available'
                                ? 'bg-white hover:bg-gray-50 text-slate-600 border-gray-200 shadow-sm'
                                : 'bg-gray-50 text-slate-300 border-gray-100 cursor-not-allowed'
                                }`}
                        >
                            <TruckIcon className="w-4 h-4" /> Assign Trip
                        </button>
                    </div>
                </div>
            </div>

            {showTripSelection && (
                <TripSelectionModal
                    plannedTrips={plannedTrips}
                    driverName={driver.name}
                    onSelect={handleAssign}
                    onClose={() => setShowTripSelection(false)}
                />
            )}
        </div>
    );
}
