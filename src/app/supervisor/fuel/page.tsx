"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import type { FuelStatus } from "@/lib/types";

type FuelFilter = "all" | FuelStatus;

const filters: FuelFilter[] = ["all", "pending", "verified", "approved", "rejected"];

function fuelClass(status: FuelStatus) {
    if (status === "approved") return "bg-emerald-100 text-emerald-700";
    if (status === "verified") return "bg-blue-100 text-blue-700";
    if (status === "pending") return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
}

export default function SupervisorFuelPage() {
    const { user } = useAuth();
    const { fuelEntries, drivers, vehicles, verifyFuelEntry, rejectFuelEntry } = useStore();
    const [filter, setFilter] = useState<FuelFilter>("all");
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const base = filter === "all" ? fuelEntries : fuelEntries.filter((entry) => entry.status === filter);
        const q = query.trim().toLowerCase();
        return base.filter((entry) => {
            if (q.length === 0) return true;
            const driverName = drivers.find((driver) => driver.id === entry.driverId)?.name || "";
            const plate = vehicles.find((vehicle) => vehicle.id === entry.vehicleId)?.plateNumber || "";
            return (
                entry.id.toLowerCase().includes(q) ||
                driverName.toLowerCase().includes(q) ||
                plate.toLowerCase().includes(q) ||
                entry.location.toLowerCase().includes(q)
            );
        });
    }, [fuelEntries, drivers, vehicles, filter, query]);

    const pendingCount = fuelEntries.filter((entry) => entry.status === "pending").length;
    const totalCost = fuelEntries.reduce((sum, entry) => sum + entry.cost, 0);

    return (
        <div className="space-y-4">
            <section className="grid gap-3 sm:grid-cols-3">
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Entries</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{fuelEntries.length}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Pending</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Total Cost</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">₹{totalCost.toLocaleString()}</p>
                </article>
            </section>

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
                    placeholder="Search fuel entries..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
            </section>

            <section className="space-y-2">
                {filtered.map((entry) => {
                    const driver = drivers.find((item) => item.id === entry.driverId);
                    const vehicle = vehicles.find((item) => item.id === entry.vehicleId);
                    const canReview = entry.status === "pending" || entry.status === "verified";

                    return (
                        <article key={entry.id} className="bg-white border border-gray-200 rounded-xl p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Fuel #{entry.id.toUpperCase()}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {driver?.name || entry.driverId} • {vehicle?.plateNumber || entry.vehicleId}
                                    </p>
                                </div>
                                <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${fuelClass(entry.status)}`}>
                                    {entry.status}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-slate-500 grid sm:grid-cols-2 gap-1">
                                <p>Cost: ₹{entry.cost.toLocaleString()}</p>
                                <p>Volume: {entry.amount}L</p>
                                <p>Location: {entry.location}</p>
                                <p>Odometer: {entry.odometer.toLocaleString()} km</p>
                            </div>
                            {canReview && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={!user}
                                        onClick={() => {
                                            if (!user) return;
                                            void verifyFuelEntry(entry.id, user.id);
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Verify
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!user}
                                        onClick={() => {
                                            if (!user) return;
                                            void rejectFuelEntry(entry.id, user.id);
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}
                        </article>
                    );
                })}
                {filtered.length === 0 && (
                    <article className="bg-white border border-gray-200 rounded-xl p-6">
                        <p className="text-slate-600">No fuel entries found.</p>
                    </article>
                )}
            </section>
        </div>
    );
}

