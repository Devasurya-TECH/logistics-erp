"use client";

import { useStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import DriverRouteInterface from "./DriverRouteInterface";

export default function DriverRouteOptimizerPage() {
    const { user } = useAuth();
    const { trips } = useStore();

    // Find active trip for driver
    const currentTrip = trips.find(t =>
        t.driverId === user?.id &&
        (t.status === 'assigned' || t.status === 'in-progress')
    );

    return (
        <div className="h-full">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">My Route Planner</h2>
                    <p className="text-slate-500 mt-1">Check best routes and optimize your trip.</p>
                </div>
            </div>

            <DriverRouteInterface trip={currentTrip} />
        </div>
    );
}
