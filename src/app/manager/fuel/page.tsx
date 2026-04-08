"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import type { FuelStatus } from "@/lib/types";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function badge(status: FuelStatus): string {
  if (status === "approved") return "badge badge-success";
  if (status === "verified") return "badge badge-info";
  if (status === "pending") return "badge badge-warning";
  return "badge badge-danger";
}

export default function ManagerFuelPage() {
  const { user } = useAuth();
  const { fuelEntries, vehicles, approveFuelEntry, rejectFuelEntry } = useStore();
  const [filter, setFilter] = useState<"all" | FuelStatus>("all");

  const totals = useMemo(() => {
    const all = fuelEntries.reduce((sum, entry) => sum + entry.cost, 0);
    const pending = fuelEntries
      .filter((entry) => entry.status === "pending" || entry.status === "verified")
      .reduce((sum, entry) => sum + entry.cost, 0);
    return { all, pending };
  }, [fuelEntries]);

  const visibleEntries = useMemo(() => {
    const sorted = [...fuelEntries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (filter === "all") return sorted;
    return sorted.filter((entry) => entry.status === filter);
  }, [filter, fuelEntries]);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="surface p-5">
          <p className="section-title">Total Fuel Cost</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(totals.all)}</p>
        </article>
        <article className="surface p-5">
          <p className="section-title">Pending Approval Value</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(totals.pending)}</p>
        </article>
      </section>

      <section className="surface p-4">
        <p className="section-title mb-2">Fuel Entry Filter</p>
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "verified", "approved", "rejected"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === item
                  ? "bg-emerald-700 text-white"
                  : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="surface-strong overflow-hidden">
        <div className="custom-scrollbar overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Entry</th>
                <th className="px-5 py-3">Vehicle</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleEntries.map((entry) => {
                const vehicle = vehicles.find((item) => item.id === entry.vehicleId);
                const canApprove = entry.status === "verified" || entry.status === "pending";

                return (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800">#{entry.id.toUpperCase()}</p>
                      <p className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {vehicle?.plateNumber ?? entry.vehicleId}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {entry.amount} L • {formatMoney(entry.cost)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={badge(entry.status)}>{entry.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!canApprove || !user}
                          onClick={() => {
                            if (!user) return;
                            approveFuelEntry(entry.id, user.id);
                          }}
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={!canApprove || !user}
                          onClick={() => {
                            if (!user) return;
                            rejectFuelEntry(entry.id, user.id);
                          }}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
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
