"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { TripStatus } from "@/lib/types";

const filters: Array<"all" | TripStatus> = [
    "all",
    "planned",
    "assigned",
    "in-progress",
    "completed",
    "cancelled",
];

function statusClass(status: TripStatus): string {
    if (status === "completed") return "bg-emerald-100 text-emerald-700";
    if (status === "in-progress" || status === "assigned") return "bg-blue-100 text-blue-700";
    if (status === "planned") return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
}

export default function ManagerTripsPage() {
    const { trips, drivers, vehicles, updateTripStatus } = useStore();
    const [filter, setFilter] = useState<"all" | TripStatus>("all");

    const filteredTrips = useMemo(() => {
        const data = filter === "all" ? trips : trips.filter((trip) => trip.status === filter);
        return [...data].sort((a, b) => b.id.localeCompare(a.id));
    }, [filter, trips]);

    return (
        <div className="space-y-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Filter by status</p>
                <div className="flex flex-wrap gap-2">
                    {filters.map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => setFilter(item)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${filter === item
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white border-gray-200 text-slate-500 hover:bg-gray-50"
                                }`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                {filteredTrips.map((trip) => {
                    const driver = drivers.find((item) => item.id === trip.driverId);
                    const vehicle = vehicles.find((item) => item.id === trip.vehicleId);
                    const deliveredDrops = trip.drops.filter((drop) => drop.status === "delivered").length;

                    return (
                        <article key={trip.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">
                                        Trip #{trip.id.toUpperCase()}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{trip.startLocation.address}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusClass(trip.status)}`}>
                                    {trip.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
                                <div>
                                    <p className="text-slate-400 uppercase tracking-wider font-bold">Driver</p>
                                    <p className="text-slate-700 font-semibold mt-1">{driver?.name || "Unassigned"}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 uppercase tracking-wider font-bold">Vehicle</p>
                                    <p className="text-slate-700 font-semibold mt-1">{vehicle?.plateNumber || "Unassigned"}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 uppercase tracking-wider font-bold">Distance</p>
                                    <p className="text-slate-700 font-semibold mt-1">{trip.estimatedDistance} km</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 uppercase tracking-wider font-bold">Drops</p>
                                    <p className="text-slate-700 font-semibold mt-1">
                                        {deliveredDrops}/{trip.drops.length} delivered
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {trip.status !== "completed" && trip.status !== "cancelled" && (
                                    <button
                                        type="button"
                                        onClick={() => updateTripStatus(trip.id, "completed")}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                    >
                                        Mark Completed
                                    </button>
                                )}
                                {trip.status !== "cancelled" && (
                                    <button
                                        type="button"
                                        onClick={() => updateTripStatus(trip.id, "cancelled")}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                                    >
                                        Cancel Trip
                                    </button>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}

