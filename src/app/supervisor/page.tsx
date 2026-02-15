"use client";

import { useStore } from "@/lib/store";
import { useState } from "react";
import { format } from "date-fns";
import { CheckCircleIcon, XCircleIcon, TruckIcon } from "@heroicons/react/24/outline";

import TripForm from "@/components/trips/TripForm";

export default function SupervisorDashboard() {
    const { trips, fuelEntries, verifyFuelEntry, assignDriver } = useStore();
    const [selectedVerification, setSelectedVerification] = useState<string | null>(null);
    const [isCreatingTrip, setIsCreatingTrip] = useState(false);

    const pendingFuel = fuelEntries.filter(f => f.status === 'pending');
    const assignedTrips = trips.filter(t => t.status === 'assigned');

    const handleVerify = (id: string) => {
        verifyFuelEntry(id, 'supervisor-1'); // Mock ID
        setSelectedVerification(null);
    };

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Fuel Verification Queue */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="bg-orange-100 p-1.5 rounded-lg text-orange-600">⛽</span> Fuel Verification Queue
                    </h2>
                    <div className="space-y-4">
                        {pendingFuel.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-8 bg-gray-50 rounded-lg">No pending fuel entries to verify.</p>
                        ) : (
                            pendingFuel.map((entry) => (
                                <div key={entry.id} className="p-5 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-slate-800">Vehicle {entry.vehicleId}</h3>
                                            <p className="text-xs text-slate-500 font-medium">Driver: <span className="text-slate-700">{entry.driverId}</span></p>
                                        </div>
                                        <span className="text-sm font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">${entry.cost.toFixed(2)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-4 bg-white p-3 rounded-lg border border-gray-100/50">
                                        <div><span className="text-slate-400 text-xs uppercase tracking-wide">Amount</span><br />{entry.amount}L</div>
                                        <div><span className="text-slate-400 text-xs uppercase tracking-wide">Odometer</span><br />{entry.odometer.toLocaleString()}km</div>
                                        <div className="col-span-2 text-xs text-slate-400 mt-1 border-t border-gray-100 pt-2 flex justify-between">
                                            <span>{entry.location}</span>
                                            <span>{format(new Date(entry.timestamp), 'PP p')}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleVerify(entry.id)}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" /> Verify
                                        </button>
                                        <button className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm">
                                            <XCircleIcon className="w-4 h-4" /> Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Trip Assignment Overview */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="bg-blue-100 p-1.5 rounded-lg text-blue-600">🚚</span> Active Assignments
                    </h2>
                    <div className="overflow-hidden rounded-lg border border-gray-100">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs uppercase bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3">Trip</th>
                                    <th className="px-4 py-3">Driver</th>
                                    <th className="px-4 py-3">Vehicle</th>
                                    <th className="px-4 py-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {assignedTrips.map(trip => (
                                    <tr key={trip.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-800">#{trip.id.toUpperCase()}</td>
                                        <td className="px-4 py-3">{trip.driverId}</td>
                                        <td className="px-4 py-3">{trip.vehicleId}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="bg-blue-50 text-blue-600 border border-blue-100 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                {trip.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {assignedTrips.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                                            No active assignments found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <button
                            onClick={() => setIsCreatingTrip(true)}
                            className="w-full py-3.5 border-2 border-dashed border-gray-200 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wide"
                        >
                            <TruckIcon className="w-5 h-5" /> Assign New Trip
                        </button>
                    </div>
                </div>
            </div>

            {isCreatingTrip && <TripForm onClose={() => setIsCreatingTrip(false)} />}
        </>
    );
}
