"use client";

import { useStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import DriverRouteInterface from "./DriverRouteInterface";
import { Trip } from "@/lib/types";

export default function DriverRouteOptimizerPage() {
    const { user } = useAuth();
    const { trips } = useStore();
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

    // Find ALL active trips for this driver
    const activeTrips = trips.filter(t =>
        t.driverId === user?.id &&
        (t.status === 'assigned' || t.status === 'in-progress')
    );

    const currentTrip: Trip | undefined = activeTrips.find(t => t.id === selectedTripId) || activeTrips[0];

    return (
        <div className="h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">My Route Planner</h2>
                    <p className="text-slate-500 mt-1">Check best routes and optimize your trip.</p>
                </div>
            </div>

            {/* Trip Selector — show if multiple trips */}
            {activeTrips.length > 1 && (
                <div className="flex gap-2 overflow-x-auto mb-4 pb-2 scrollbar-hide">
                    {activeTrips.map((trip) => {
                        const pendingDrops = trip.drops.filter(d => d.status !== 'delivered');
                        const isSelected = trip.id === currentTrip?.id;
                        return (
                            <button
                                key={trip.id}
                                onClick={() => setSelectedTripId(trip.id)}
                                className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 transition-all text-left ${isSelected
                                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                                        : 'border-gray-200 bg-white hover:border-blue-300'
                                    }`}
                            >
                                <span className={`text-xs font-bold ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                                    #{trip.id}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-2">
                                    {pendingDrops.length} stops · {trip.estimatedDistance} km
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            <DriverRouteInterface trip={currentTrip} />
        </div>
    );
}
