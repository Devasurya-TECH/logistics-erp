"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import VehicleMap from "@/components/maps/VehicleMap";

function statusClass(status: string) {
    if (status === "completed") return "bg-emerald-100 text-emerald-700";
    if (status === "in-progress") return "bg-blue-100 text-blue-700";
    if (status === "assigned" || status === "planned") return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
}

function severityClass(severity: string) {
    if (severity === "critical") return "bg-rose-100 text-rose-700";
    if (severity === "high") return "bg-orange-100 text-orange-700";
    if (severity === "medium") return "bg-amber-100 text-amber-700";
    return "bg-blue-100 text-blue-700";
}

export default function ManagerDashboardPage() {
    const { trips, vehicles, fuelEntries, alerts, resolveAlert } = useStore();

    const summary = useMemo(() => {
        const activeTrips = trips.filter((trip) => trip.status === "in-progress").length;
        const completedTrips = trips.filter((trip) => trip.status === "completed").length;
        const openAlerts = alerts.filter((alert) => !alert.resolved).length;
        const pendingApprovals = fuelEntries.filter(
            (entry) => entry.status === "pending" || entry.status === "verified",
        ).length;
        const monthlyFuel = fuelEntries.reduce((sum, entry) => sum + entry.cost, 0);

        return {
            fleetCount: vehicles.length,
            activeTrips,
            completedTrips,
            openAlerts,
            pendingApprovals,
            monthlyFuel,
        };
    }, [trips, vehicles, fuelEntries, alerts]);

    const unresolvedAlerts = alerts
        .filter((alert) => !alert.resolved)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 8);

    const latestTrips = [...trips].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 8);
    const reviewFuel = [...fuelEntries]
        .filter((entry) => entry.status === "pending" || entry.status === "verified")
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 8);
    const trackedVehicles = vehicles.filter((vehicle) =>
        trips.some(
            (trip) =>
                trip.vehicleId === vehicle.id &&
                (trip.status === "assigned" || trip.status === "in-progress"),
        ),
    );

    return (
        <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Fleet</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{summary.fleetCount}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Active Trips</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{summary.activeTrips}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Completed Trips</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.completedTrips}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Open Alerts</p>
                    <p className="text-2xl font-bold text-rose-700 mt-1">{summary.openAlerts}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Fuel Approvals</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{summary.pendingApprovals}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Fuel Cost (Total)</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                        ₹{summary.monthlyFuel.toLocaleString()}
                    </p>
                </article>
            </section>

            <section className="grid gap-5 xl:grid-cols-3">
                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900">Open Alerts</h3>
                        <button
                            type="button"
                            className="text-xs font-semibold text-blue-700 hover:underline"
                            onClick={() => {
                                unresolvedAlerts.forEach((alert) => {
                                    void resolveAlert(alert.id);
                                });
                            }}
                        >
                            Resolve All
                        </button>
                    </div>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar">
                        {unresolvedAlerts.length === 0 && (
                            <p className="text-sm text-slate-500">No open alerts.</p>
                        )}
                        {unresolvedAlerts.map((alert) => (
                            <div key={alert.id} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={`text-[11px] font-semibold px-2 py-1 rounded-full ${severityClass(alert.severity)}`}
                                    >
                                        {alert.severity}
                                    </span>
                                    <button
                                        type="button"
                                        className="text-xs font-semibold text-emerald-700 hover:underline"
                                        onClick={() => {
                                            void resolveAlert(alert.id);
                                        }}
                                    >
                                        Resolve
                                    </button>
                                </div>
                                <p className="text-sm text-slate-800 mt-2">{alert.message}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {new Date(alert.timestamp).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900">Latest Trips</h3>
                        <Link href="/manager/trips" className="text-xs font-semibold text-blue-700 hover:underline">
                            View all
                        </Link>
                    </div>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar">
                        {latestTrips.map((trip) => (
                            <div key={trip.id} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-900">Trip #{trip.id.toUpperCase()}</p>
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${statusClass(trip.status)}`}>
                                        {trip.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{trip.startLocation.address}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {trip.drops.filter((drop) => drop.status === "delivered").length}/{trip.drops.length} delivered
                                </p>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900">Fuel Review Queue</h3>
                        <Link href="/manager/fuel" className="text-xs font-semibold text-blue-700 hover:underline">
                            Open fuel
                        </Link>
                    </div>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar">
                        {reviewFuel.length === 0 && (
                            <p className="text-sm text-slate-500">No fuel entries awaiting action.</p>
                        )}
                        {reviewFuel.map((entry) => (
                            <div key={entry.id} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-900">#{entry.id.toUpperCase()}</p>
                                    <span className="text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
                                        {entry.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-800 mt-1">₹{entry.cost.toLocaleString()} • {entry.amount}L</p>
                                <p className="text-xs text-slate-500 mt-1">{entry.location}</p>
                            </div>
                        ))}
                    </div>
                </article>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Live Fleet Tracking</h3>
                    <Link href="/supervisor/tracking" className="text-xs font-semibold text-blue-700 hover:underline">
                        Supervisor tracking panel
                    </Link>
                </div>
                <VehicleMap vehicles={trackedVehicles.length > 0 ? trackedVehicles : vehicles} />
            </section>
        </div>
    );
}
