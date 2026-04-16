"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";

type DriverFilter = "all" | "available" | "on-trip" | "off-duty";

function driverStatusClass(status: string) {
    if (status === "available") return "bg-emerald-100 text-emerald-700";
    if (status === "on-trip") return "bg-blue-100 text-blue-700";
    return "bg-slate-100 text-slate-700";
}

export default function SupervisorDriversPage() {
    const { drivers, trips, toggleLiveStatus } = useStore();
    const [filter, setFilter] = useState<DriverFilter>("all");
    const [query, setQuery] = useState("");

    const enriched = useMemo(() => {
        return drivers.map((driver) => {
            const myTrips = trips.filter((trip) => trip.driverId === driver.id);
            const completed = myTrips.filter((trip) => trip.status === "completed").length;
            const activeTrip = myTrips.find(
                (trip) => trip.status === "in-progress" || trip.status === "assigned",
            );
            const delivered = myTrips
                .flatMap((trip) => trip.drops)
                .filter((drop) => drop.status === "delivered").length;

            return {
                ...driver,
                totalTrips: myTrips.length,
                completedTrips: completed,
                deliveredDrops: delivered,
                activeTripId: activeTrip?.id || null,
            };
        });
    }, [drivers, trips]);

    const filtered = enriched.filter((driver) => {
        const matchesFilter = filter === "all" || driver.status === filter;
        const q = query.trim().toLowerCase();
        const matchesQuery =
            q.length === 0 ||
            driver.name.toLowerCase().includes(q) ||
            driver.email.toLowerCase().includes(q) ||
            driver.id.toLowerCase().includes(q);
        return matchesFilter && matchesQuery;
    });

    return (
        <div className="space-y-4">
            <section className="flex flex-wrap gap-2">
                {(["all", "available", "on-trip", "off-duty"] as DriverFilter[]).map((item) => (
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
                    placeholder="Search drivers..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
            </section>

            <section className="space-y-2">
                {filtered.length === 0 && (
                    <article className="bg-white border border-gray-200 rounded-xl p-6">
                        <p className="text-slate-600">No drivers found.</p>
                    </article>
                )}
                {filtered.map((driver) => (
                    <article key={driver.id} className="bg-white border border-gray-200 rounded-xl p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{driver.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{driver.email}</p>
                            </div>
                            <div className="flex gap-2">
                                <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${driverStatusClass(driver.status)}`}>
                                    {driver.status}
                                </span>
                                <span
                                    className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                                        driver.isLive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                                    }`}
                                >
                                    {driver.isLive ? "live" : "not live"}
                                </span>
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 grid sm:grid-cols-2 gap-1">
                            <p>Total trips: {driver.totalTrips}</p>
                            <p>Completed: {driver.completedTrips}</p>
                            <p>Delivered drops: {driver.deliveredDrops}</p>
                            <p>Active trip: {driver.activeTripId ? `#${driver.activeTripId.toUpperCase()}` : "none"}</p>
                        </div>
                        <div className="mt-2 flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    void toggleLiveStatus(driver.id, !driver.isLive);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                            >
                                {driver.isLive ? "Disable Live" : "Enable Live"}
                            </button>
                        </div>
                    </article>
                ))}
            </section>
        </div>
    );
}

