"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import VehicleMap from "@/components/maps/VehicleMap";

function tripStatusClass(status: string) {
    if (status === "completed") return "bg-emerald-100 text-emerald-700";
    if (status === "in-progress") return "bg-blue-100 text-blue-700";
    if (status === "assigned") return "bg-amber-100 text-amber-700";
    if (status === "planned") return "bg-slate-100 text-slate-700";
    return "bg-rose-100 text-rose-700";
}

function alertClass(severity: string) {
    if (severity === "critical") return "bg-rose-100 text-rose-700";
    if (severity === "high") return "bg-orange-100 text-orange-700";
    if (severity === "medium") return "bg-amber-100 text-amber-700";
    return "bg-blue-100 text-blue-700";
}

export default function SupervisorDashboardPage() {
    const { trips, drivers, vehicles, fuelEntries, alerts, resolveAlert } = useStore();

    const summary = useMemo(() => {
        const activeTrips = trips.filter((trip) => trip.status === "in-progress").length;
        const assignedTrips = trips.filter((trip) => trip.status === "assigned").length;
        const completedTrips = trips.filter((trip) => trip.status === "completed").length;
        const availableDrivers = drivers.filter((driver) => driver.status === "available").length;
        const activeDrivers = drivers.filter((driver) => driver.status === "on-trip").length;
        const pendingFuel = fuelEntries.filter((entry) => entry.status === "pending").length;
        const unresolvedAlerts = alerts.filter((alert) => !alert.resolved).length;

        return {
            activeTrips,
            assignedTrips,
            completedTrips,
            availableDrivers,
            activeDrivers,
            pendingFuel,
            unresolvedAlerts,
            fleetCount: vehicles.length,
        };
    }, [trips, drivers, vehicles, fuelEntries, alerts]);

    const openAlerts = alerts
        .filter((alert) => !alert.resolved)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 6);

    const actionableTrips = trips
        .filter((trip) => trip.status === "planned" || trip.status === "assigned" || trip.status === "in-progress")
        .sort((a, b) => b.id.localeCompare(a.id))
        .slice(0, 8);

    const driverLoad = drivers
        .map((driver) => {
            const assigned = trips.filter((trip) => trip.driverId === driver.id && trip.status !== "cancelled");
            return {
                ...driver,
                totalTrips: assigned.length,
                activeTrips: assigned.filter((trip) => trip.status === "in-progress").length,
            };
        })
        .sort((a, b) => b.totalTrips - a.totalTrips)
        .slice(0, 8);

    const trackedVehicles = vehicles.filter((vehicle) => {
        const activeTrip = trips.find(
            (trip) =>
                trip.vehicleId === vehicle.id &&
                (trip.status === "assigned" || trip.status === "in-progress"),
        );
        return Boolean(activeTrip);
    });

    return (
        <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <p className="text-xs text-slate-500">Fleet</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{summary.fleetCount}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <p className="text-xs text-slate-500">Active Trips</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{summary.activeTrips}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <p className="text-xs text-slate-500">Assigned</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{summary.assignedTrips}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <p className="text-xs text-slate-500">Completed</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.completedTrips}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <p className="text-xs text-slate-500">Drivers Active</p>
                    <p className="text-2xl font-bold text-indigo-700 mt-1">{summary.activeDrivers}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <p className="text-xs text-slate-500">Drivers Free</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.availableDrivers}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <p className="text-xs text-slate-500">Pending Fuel</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{summary.pendingFuel}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <p className="text-xs text-slate-500">Open Alerts</p>
                    <p className="text-2xl font-bold text-rose-700 mt-1">{summary.unresolvedAlerts}</p>
                </article>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <Link href="/supervisor/deliveries" className="bg-blue-600 text-white rounded-xl p-4 font-semibold hover:bg-blue-700">
                    Create Delivery
                </Link>
                <Link href="/supervisor/trips" className="bg-white border border-gray-200 rounded-xl p-4 font-semibold text-slate-800 hover:bg-slate-100">
                    Manage Trips
                </Link>
                <Link href="/supervisor/drivers" className="bg-white border border-gray-200 rounded-xl p-4 font-semibold text-slate-800 hover:bg-slate-100">
                    Driver Allocation
                </Link>
                <Link href="/supervisor/tracking" className="bg-white border border-gray-200 rounded-xl p-4 font-semibold text-slate-800 hover:bg-slate-100">
                    Live Tracking
                </Link>
                <Link href="/supervisor/fuel" className="bg-white border border-gray-200 rounded-xl p-4 font-semibold text-slate-800 hover:bg-slate-100">
                    Verify Fuel
                </Link>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Real-Time Fleet Map</h3>
                    <Link href="/supervisor/tracking" className="text-xs font-semibold text-blue-700 hover:underline">
                        Open full tracking
                    </Link>
                </div>
                <VehicleMap vehicles={trackedVehicles.length > 0 ? trackedVehicles : vehicles} />
            </section>

            <section className="grid gap-5 xl:grid-cols-3">
                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900">Open Alerts</h3>
                        <button
                            type="button"
                            className="text-xs font-semibold text-blue-700 hover:underline"
                            onClick={() => {
                                openAlerts.forEach((alert) => {
                                    void resolveAlert(alert.id);
                                });
                            }}
                        >
                            Resolve visible
                        </button>
                    </div>
                    <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar">
                        {openAlerts.length === 0 && <p className="text-sm text-slate-500">No unresolved alerts.</p>}
                        {openAlerts.map((alert) => (
                            <div key={alert.id} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${alertClass(alert.severity)}`}>
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
                                <p className="text-xs text-slate-500 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900">Actionable Trips</h3>
                        <Link href="/supervisor/trips" className="text-xs font-semibold text-blue-700 hover:underline">
                            Open trips
                        </Link>
                    </div>
                    <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar">
                        {actionableTrips.map((trip) => (
                            <div key={trip.id} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-900">Trip #{trip.id.toUpperCase()}</p>
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${tripStatusClass(trip.status)}`}>
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
                        <h3 className="text-sm font-semibold text-slate-900">Driver Workload</h3>
                        <Link href="/supervisor/drivers" className="text-xs font-semibold text-blue-700 hover:underline">
                            Open drivers
                        </Link>
                    </div>
                    <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar">
                        {driverLoad.map((driver) => (
                            <div key={driver.id} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-900">{driver.name}</p>
                                    <span className="text-xs font-semibold text-slate-600 capitalize">{driver.status}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{driver.totalTrips} total trips</p>
                                <p className="text-xs text-slate-500">{driver.activeTrips} active now</p>
                            </div>
                        ))}
                    </div>
                </article>
            </section>
        </div>
    );
}
