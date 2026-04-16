"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";

function formatMoney(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
}

function statusClass(status: string): string {
    if (status === "approved") return "bg-emerald-100 text-emerald-700";
    if (status === "verified") return "bg-blue-100 text-blue-700";
    if (status === "pending") return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
}

export default function ManagerFuelPage() {
    const { user } = useAuth();
    const { fuelEntries, vehicles, approveFuelEntry, rejectFuelEntry } = useStore();

    const pendingValue = useMemo(
        () =>
            fuelEntries
                .filter((entry) => entry.status === "pending" || entry.status === "verified")
                .reduce((sum, entry) => sum + entry.cost, 0),
        [fuelEntries],
    );

    const totalValue = useMemo(
        () => fuelEntries.reduce((sum, entry) => sum + entry.cost, 0),
        [fuelEntries],
    );

    const sortedEntries = [...fuelEntries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return (
        <div className="space-y-4">
            <section className="grid gap-4 sm:grid-cols-2">
                <article className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Fuel Cost</p>
                    <p className="text-2xl font-black text-slate-800 mt-2">{formatMoney(totalValue)}</p>
                </article>
                <article className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Pending Approval</p>
                    <p className="text-2xl font-black text-slate-800 mt-2">{formatMoney(pendingValue)}</p>
                </article>
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 text-left">
                            <tr>
                                <th className="px-4 py-3">Entry</th>
                                <th className="px-4 py-3">Vehicle</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedEntries.map((entry) => {
                                const vehicle = vehicles.find((item) => item.id === entry.vehicleId);
                                const actionable = entry.status === "pending" || entry.status === "verified";

                                return (
                                    <tr key={entry.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-slate-800">#{entry.id.toUpperCase()}</p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(entry.timestamp).toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {vehicle?.plateNumber || entry.vehicleId}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {entry.amount} L • {formatMoney(entry.cost)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusClass(entry.status)}`}>
                                                {entry.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    disabled={!actionable || !user}
                                                    onClick={() => {
                                                        if (!user) return;
                                                        approveFuelEntry(entry.id, user.id);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!actionable || !user}
                                                    onClick={() => {
                                                        if (!user) return;
                                                        rejectFuelEntry(entry.id, user.id);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

