"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { generateTripCSV, downloadCSV } from "@/lib/utils/export";

export default function SupervisorReportsPage() {
    const { trips, drivers, vehicles, fuelEntries, alerts } = useStore();

    const metrics = useMemo(() => {
        const totalTrips = trips.length;
        const completedTrips = trips.filter((trip) => trip.status === "completed").length;
        const inProgressTrips = trips.filter((trip) => trip.status === "in-progress").length;
        const cancelledTrips = trips.filter((trip) => trip.status === "cancelled").length;
        const allDrops = trips.flatMap((trip) => trip.drops);
        const deliveredDrops = allDrops.filter((drop) => drop.status === "delivered").length;
        const failedDrops = allDrops.filter((drop) => drop.status === "failed").length;
        const totalDistance = trips.reduce((sum, trip) => sum + (trip.actualDistance || trip.estimatedDistance), 0);
        const totalFuel = fuelEntries.reduce((sum, entry) => sum + entry.cost, 0);
        const unresolvedAlerts = alerts.filter((alert) => !alert.resolved).length;

        return {
            totalTrips,
            completedTrips,
            inProgressTrips,
            cancelledTrips,
            deliveredDrops,
            failedDrops,
            totalDistance,
            totalFuel,
            unresolvedAlerts,
            completionRate: totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0,
            deliveryRate: allDrops.length > 0 ? Math.round((deliveredDrops / allDrops.length) * 100) : 0,
        };
    }, [trips, fuelEntries, alerts]);

    const topDrivers = useMemo(() => {
        return drivers
            .map((driver) => {
                const driverTrips = trips.filter((trip) => trip.driverId === driver.id);
                const drops = driverTrips.flatMap((trip) => trip.drops);
                const delivered = drops.filter((drop) => drop.status === "delivered").length;
                const distance = driverTrips.reduce(
                    (sum, trip) => sum + (trip.actualDistance || trip.estimatedDistance),
                    0,
                );

                return {
                    ...driver,
                    trips: driverTrips.length,
                    delivered,
                    distance,
                    score: delivered * 10 + distance,
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
    }, [drivers, trips]);

    return (
        <div className="space-y-5">
            <section className="flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => {
                        const csv = generateTripCSV(trips, drivers, vehicles, fuelEntries, alerts);
                        downloadCSV(`fleet-report-${new Date().toISOString().slice(0, 10)}.csv`, csv);
                    }}
                    className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                    Export Full CSV
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const topSummary = [
                            ["Driver", "Trips", "Delivered", "Distance"],
                            ...topDrivers.map((driver) => [
                                driver.name,
                                String(driver.trips),
                                String(driver.delivered),
                                String(driver.distance),
                            ]),
                        ]
                            .map((row) => row.join(","))
                            .join("\n");
                        downloadCSV("top-drivers.csv", topSummary);
                    }}
                    className="px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-slate-700 text-sm font-semibold hover:bg-slate-100"
                >
                    Export Driver Summary
                </button>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Trips</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalTrips}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Completion</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{metrics.completionRate}%</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Deliveries</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{metrics.deliveryRate}%</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">In Progress</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{metrics.inProgressTrips}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Distance</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalDistance} km</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Fuel Cost</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">₹{metrics.totalFuel.toLocaleString()}</p>
                </article>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Status Breakdown</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Completed</span>
                            <span className="font-semibold text-emerald-700">{metrics.completedTrips}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">In Progress</span>
                            <span className="font-semibold text-blue-700">{metrics.inProgressTrips}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">Cancelled</span>
                            <span className="font-semibold text-rose-700">{metrics.cancelledTrips}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">Delivered Drops</span>
                            <span className="font-semibold text-emerald-700">{metrics.deliveredDrops}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">Failed Drops</span>
                            <span className="font-semibold text-rose-700">{metrics.failedDrops}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">Open Alerts</span>
                            <span className="font-semibold text-rose-700">{metrics.unresolvedAlerts}</span>
                        </div>
                    </div>
                </article>

                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Top Drivers</h3>
                    <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar">
                        {topDrivers.map((driver, index) => (
                            <div key={driver.id} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {index + 1}. {driver.name}
                                    </p>
                                    <span className="text-xs text-slate-500 capitalize">{driver.status}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Trips: {driver.trips} • Delivered: {driver.delivered} • Distance: {driver.distance} km
                                </p>
                            </div>
                        ))}
                    </div>
                </article>
            </section>
        </div>
    );
}

