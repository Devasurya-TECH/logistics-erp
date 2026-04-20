"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";

type ActivityFilter = "all" | "deliveries" | "fuel" | "alerts";

type DriverActivity = {
    id: string;
    type: Exclude<ActivityFilter, "all">;
    title: string;
    summary: string;
    timestamp: string;
};

function filterClasses(active: boolean) {
    return active
        ? "bg-slate-900 text-white shadow-sm"
        : "bg-white text-slate-600 ring-1 ring-slate-200";
}

function eventTone(type: DriverActivity["type"]) {
    if (type === "alerts") return "bg-rose-50 text-rose-800 ring-rose-200";
    if (type === "fuel") return "bg-blue-50 text-blue-800 ring-blue-200";
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
}

function eventDot(type: DriverActivity["type"]) {
    if (type === "alerts") return "bg-rose-500";
    if (type === "fuel") return "bg-blue-500";
    return "bg-emerald-500";
}

export default function DriverActivityPage() {
    const { user } = useAuth();
    const { trips, fuelEntries, alerts } = useStore();
    const [filter, setFilter] = useState<ActivityFilter>("all");

    const myTrips = trips.filter((trip) => trip.driverId === user?.id);

    const activity = useMemo(() => {
        const items: DriverActivity[] = [];

        myTrips.forEach((trip) => {
            trip.drops.forEach((drop) => {
                if (drop.status === "delivered") {
                    items.push({
                        id: `drop-delivered-${trip.id}-${drop.id}`,
                        type: "deliveries",
                        title: "Delivered",
                        summary: `${drop.customerName} • ${drop.address}`,
                        timestamp: drop.actualArrival || trip.endTime || trip.startTime || new Date().toISOString(),
                    });
                }

                if (drop.status === "failed") {
                    items.push({
                        id: `drop-failed-${trip.id}-${drop.id}`,
                        type: "alerts",
                        title: "Delivery Issue",
                        summary: `${drop.customerName} • ${drop.failureReason || "Delivery failed"}`,
                        timestamp: drop.actualArrival || trip.endTime || trip.startTime || new Date().toISOString(),
                    });
                }
            });

            if (trip.endTime) {
                items.push({
                    id: `trip-complete-${trip.id}`,
                    type: "deliveries",
                    title: "Trip Completed",
                    summary: `${trip.drops.filter((drop) => drop.status === "delivered").length}/${trip.drops.length} stops delivered`,
                    timestamp: trip.endTime,
                });
            }
        });

        fuelEntries
            .filter((entry) => entry.driverId === user?.id)
            .forEach((entry) => {
                items.push({
                    id: `fuel-${entry.id}`,
                    type: "fuel",
                    title: "Fuel Added",
                    summary: `${entry.amount}L • ${entry.location} • ${entry.status}`,
                    timestamp: entry.timestamp,
                });
            });

        alerts
            .filter((alert) => {
                if (!user) return false;
                const trip = myTrips.find((candidate) => candidate.id === alert.tripId);
                return Boolean(trip || alert.tripId === user.id);
            })
            .forEach((alert) => {
                items.push({
                    id: `alert-${alert.id}`,
                    type: "alerts",
                    title: alert.type === "sos" ? "SOS Alert" : "Alert",
                    summary: alert.message,
                    timestamp: alert.timestamp,
                });
            });

        return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }, [myTrips, fuelEntries, alerts, user]);

    const visibleActivity = activity.filter((item) => filter === "all" || item.type === filter);

    const summary = useMemo(() => {
        const completed = myTrips.flatMap((trip) => trip.drops).filter((drop) => drop.status === "delivered").length;
        const fuelLogged = fuelEntries.filter((entry) => entry.driverId === user?.id).reduce((sum, entry) => sum + entry.amount, 0);
        const alertCount = alerts.filter((alert) => {
            const trip = myTrips.find((candidate) => candidate.id === alert.tripId);
            return Boolean(trip || alert.tripId === user?.id);
        }).length;

        return {
            completed,
            fuelLogged,
            alertCount,
            deliveryCount: activity.filter((item) => item.type === "deliveries").length,
            fuelCount: activity.filter((item) => item.type === "fuel").length,
            alertsCount: activity.filter((item) => item.type === "alerts").length,
        };
    }, [activity, alerts, fuelEntries, myTrips, user?.id]);

    return (
        <div className="space-y-4">
            <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Today&apos;s Summary</p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                    <article className="rounded-2xl bg-slate-100/90 px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Completed</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{summary.completed}</p>
                    </article>
                    <article className="rounded-2xl bg-blue-50 px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-500">Fuel</p>
                        <p className="mt-2 text-2xl font-black text-blue-900">{summary.fuelLogged.toFixed(1)}L</p>
                    </article>
                    <article className="rounded-2xl bg-rose-50 px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500">Alerts</p>
                        <p className="mt-2 text-2xl font-black text-rose-900">{summary.alertCount}</p>
                    </article>
                </div>
            </section>

            <section className="rounded-[28px] bg-slate-100/90 p-2 shadow-sm ring-1 ring-slate-200/70">
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { id: "all", label: "All", count: activity.length },
                        { id: "deliveries", label: "Deliveries", count: summary.deliveryCount },
                        { id: "fuel", label: "Fuel", count: summary.fuelCount },
                        { id: "alerts", label: "Alerts", count: summary.alertsCount },
                    ].map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setFilter(item.id as ActivityFilter)}
                            className={`flex min-h-12 items-center justify-center gap-1 rounded-2xl px-3 py-3 text-xs font-bold transition ${filterClasses(filter === item.id)}`}
                        >
                            <span>{item.label}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${filter === item.id ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
                                {item.count}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="space-y-3">
                {visibleActivity.length === 0 && (
                    <article className="rounded-[28px] bg-white p-6 text-center shadow-sm ring-1 ring-slate-200/70">
                        <p className="text-sm font-semibold text-slate-700">No activity in this view.</p>
                    </article>
                )}

                {visibleActivity.map((item) => (
                    <article
                        key={item.id}
                        className={`rounded-[28px] bg-white p-4 shadow-sm ring-1 ${eventTone(item.type)}`}
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center pt-1">
                                <span className={`h-3 w-3 rounded-full ${eventDot(item.type)}`} />
                                <span className="mt-2 text-[11px] font-bold text-slate-400">
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-base font-black text-slate-900">{item.title}</p>
                                <p className="mt-1 text-sm font-medium text-slate-600">{item.summary}</p>
                                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    {item.type}
                                </p>
                            </div>
                        </div>
                    </article>
                ))}
            </section>
        </div>
    );
}
