"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";

type ActivityType =
    | "all"
    | "trip"
    | "delivery"
    | "fuel"
    | "alert";

type Activity = {
    id: string;
    type: Exclude<ActivityType, "all">;
    title: string;
    description: string;
    timestamp: string;
};

export default function SupervisorActivityPage() {
    const { trips, drivers, fuelEntries, alerts } = useStore();
    const [filter, setFilter] = useState<ActivityType>("all");
    const [query, setQuery] = useState("");

    const activities = useMemo(() => {
        const items: Activity[] = [];

        trips.forEach((trip) => {
            const driver = drivers.find((candidate) => candidate.id === trip.driverId);
            items.push({
                id: `trip-${trip.id}`,
                type: "trip",
                title: `Trip #${trip.id.toUpperCase()} • ${trip.status}`,
                description: `${driver?.name || "Unassigned"} • ${trip.drops.length} stops`,
                timestamp: trip.endTime || trip.startTime || new Date().toISOString(),
            });

            trip.drops.forEach((drop) => {
                if (drop.status !== "pending") {
                    items.push({
                        id: `drop-${trip.id}-${drop.id}`,
                        type: "delivery",
                        title: `${drop.customerName} • ${drop.status}`,
                        description: `Trip #${trip.id.toUpperCase()} • ${drop.address}`,
                        timestamp: drop.actualArrival || trip.endTime || trip.startTime || new Date().toISOString(),
                    });
                }
            });
        });

        fuelEntries.forEach((entry) => {
            const driver = drivers.find((candidate) => candidate.id === entry.driverId);
            items.push({
                id: `fuel-${entry.id}`,
                type: "fuel",
                title: `Fuel #${entry.id.toUpperCase()} • ${entry.status}`,
                description: `${driver?.name || entry.driverId} • ₹${entry.cost.toLocaleString()} • ${entry.amount}L`,
                timestamp: entry.timestamp,
            });
        });

        alerts.forEach((alert) => {
            items.push({
                id: `alert-${alert.id}`,
                type: "alert",
                title: `Alert • ${alert.severity}`,
                description: `${alert.type} • ${alert.message}`,
                timestamp: alert.timestamp,
            });
        });

        return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }, [trips, drivers, fuelEntries, alerts]);

    const filtered = activities.filter((item) => {
        const matchesFilter = filter === "all" || item.type === filter;
        const normalizedQuery = query.trim().toLowerCase();
        const matchesQuery =
            normalizedQuery.length === 0 ||
            item.title.toLowerCase().includes(normalizedQuery) ||
            item.description.toLowerCase().includes(normalizedQuery);
        return matchesFilter && matchesQuery;
    });

    return (
        <div className="space-y-4">
            <section className="flex flex-wrap gap-2">
                {(["all", "trip", "delivery", "fuel", "alert"] as ActivityType[]).map((item) => (
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
                    placeholder="Search activity..."
                    className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm"
                />
            </section>

            <section className="space-y-2">
                {filtered.length === 0 && (
                    <article className="bg-white border border-gray-200 rounded-xl p-6">
                        <p className="text-slate-600">No matching activity entries.</p>
                    </article>
                )}
                {filtered.map((item) => (
                    <article key={item.id} className="bg-white border border-gray-200 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <span className="text-xs text-slate-500">
                                {new Date(item.timestamp).toLocaleString()}
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                    </article>
                ))}
            </section>
        </div>
    );
}

