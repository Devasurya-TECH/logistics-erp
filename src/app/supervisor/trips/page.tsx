"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { TripStatus } from "@/lib/types";

type TripFilter = "all" | TripStatus;

const filters: TripFilter[] = [
    "all",
    "planned",
    "assigned",
    "in-progress",
    "completed",
    "cancelled",
];

function tripClass(status: TripStatus) {
    if (status === "completed") return "bg-emerald-100 text-emerald-700";
    if (status === "in-progress") return "bg-blue-100 text-blue-700";
    if (status === "assigned") return "bg-amber-100 text-amber-700";
    if (status === "planned") return "bg-slate-100 text-slate-700";
    return "bg-rose-100 text-rose-700";
}

export default function SupervisorTripsPage() {
    const { trips, drivers, vehicles, updateTripStatus } = useStore();
    const [filter, setFilter] = useState<TripFilter>("all");
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const base = filter === "all" ? trips : trips.filter((trip) => trip.status === filter);
        const q = query.trim().toLowerCase();
        return base.filter((trip) => {
            if (q.length === 0) return true;
            const driverName = drivers.find((driver) => driver.id === trip.driverId)?.name || "";
            const plate = vehicles.find((vehicle) => vehicle.id === trip.vehicleId)?.plateNumber || "";
            return (
                trip.id.toLowerCase().includes(q) ||
                trip.startLocation.address.toLowerCase().includes(q) ||
                driverName.toLowerCase().includes(q) ||
                plate.toLowerCase().includes(q)
            );
        });
    }, [trips, drivers, vehicles, filter, query]);

    return (
        <div className="space-y-4">
            <section className="flex flex-wrap gap-2">
                {filters.map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => setFilter(item)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                            filter === item
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-gray-200 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        {item}
                    </button>
                ))}
            </section>

            <section>
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search trips..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
            </section>

            <section className="space-y-2">
                {filtered.map((trip) => {
                    const driver = drivers.find((item) => item.id === trip.driverId);
                    const vehicle = vehicles.find((item) => item.id === trip.vehicleId);
                    const delivered = trip.drops.filter((drop) => drop.status === "delivered").length;

                    return (
                        <article key={trip.id} className="bg-white border border-gray-200 rounded-xl p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Trip #{trip.id.toUpperCase()}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{trip.startLocation.address}</p>
                                </div>
                                <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${tripClass(trip.status)}`}>
                                    {trip.status}
                                </span>
                            </div>

                            <div className="mt-2 text-xs text-slate-500 grid sm:grid-cols-2 gap-1">
                                <p>Driver: {driver?.name || "Unassigned"}</p>
                                <p>Vehicle: {vehicle?.plateNumber || "Unassigned"}</p>
                                <p>Distance: {trip.actualDistance || trip.estimatedDistance} km</p>
                                <p>Drops: {delivered}/{trip.drops.length}</p>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                                {trip.status !== "completed" && trip.status !== "cancelled" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void updateTripStatus(trip.id, "completed");
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                                    >
                                        Mark Completed
                                    </button>
                                )}
                                {trip.status !== "cancelled" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void updateTripStatus(trip.id, "cancelled");
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
                                    >
                                        Cancel
                                    </button>
                                )}
                                {trip.status === "planned" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void updateTripStatus(trip.id, "assigned");
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        Mark Assigned
                                    </button>
                                )}
                            </div>
                        </article>
                    );
                })}
                {filtered.length === 0 && (
                    <article className="bg-white border border-gray-200 rounded-xl p-6">
                        <p className="text-slate-600">No trips found.</p>
                    </article>
                )}
            </section>
        </div>
    );
}

