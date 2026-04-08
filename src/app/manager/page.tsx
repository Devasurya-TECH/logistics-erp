"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusBadge(status: string): string {
  if (status === "completed" || status === "approved") return "badge badge-success";
  if (status === "in-progress" || status === "assigned" || status === "verified") return "badge badge-info";
  if (status === "pending" || status === "planned") return "badge badge-warning";
  return "badge badge-danger";
}

export default function ManagerDashboardPage() {
  const { trips, vehicles, fuelEntries, alerts, resolveAlert } = useStore();

  const activeVehicles = vehicles.filter((vehicle) => vehicle.status === "active").length;
  const inProgressTrips = trips.filter((trip) => trip.status === "in-progress").length;
  const pendingFuel = fuelEntries.filter((entry) => entry.status === "pending").length;
  const unresolvedAlerts = alerts.filter((alert) => !alert.resolved).length;
  const monthlyFuelSpend = fuelEntries.reduce((sum, entry) => sum + entry.cost, 0);

  const recentTrips = useMemo(
    () =>
      [...trips]
        .sort((a, b) => {
          const aDate = new Date(a.startTime ?? 0).getTime();
          const bDate = new Date(b.startTime ?? 0).getTime();
          return bDate - aDate;
        })
        .slice(0, 5),
    [trips],
  );

  const urgentAlerts = useMemo(
    () =>
      alerts
        .filter((alert) => !alert.resolved)
        .sort((a, b) => {
          const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
          return rank[a.severity] - rank[b.severity];
        })
        .slice(0, 5),
    [alerts],
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="surface p-5">
          <p className="section-title">Fleet Active</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {activeVehicles}/{vehicles.length}
          </p>
        </article>
        <article className="surface p-5">
          <p className="section-title">Trips In Progress</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{inProgressTrips}</p>
        </article>
        <article className="surface p-5">
          <p className="section-title">Pending Fuel Claims</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{pendingFuel}</p>
        </article>
        <article className="surface p-5">
          <p className="section-title">Open Alerts</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{unresolvedAlerts}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <article className="surface-strong overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Trips</h2>
            <p className="text-xs text-slate-500">Latest dispatch and completion updates</p>
          </div>
          <div className="custom-scrollbar overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Trip</th>
                  <th className="px-5 py-3">Distance</th>
                  <th className="px-5 py-3">Drops</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTrips.map((trip) => {
                  const completedDrops = trip.drops.filter((drop) => drop.status === "delivered").length;
                  return (
                    <tr key={trip.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-800">#{trip.id.toUpperCase()}</td>
                      <td className="px-5 py-3 text-slate-600">{trip.estimatedDistance} km</td>
                      <td className="px-5 py-3 text-slate-600">
                        {completedDrops}/{trip.drops.length}
                      </td>
                      <td className="px-5 py-3">
                        <span className={statusBadge(trip.status)}>{trip.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <div className="space-y-4">
          <article className="surface p-5">
            <p className="section-title">Fuel Spend To Date</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatMoney(monthlyFuelSpend)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Total from all recorded fuel entries.
            </p>
          </article>

          <article className="surface p-5">
            <p className="section-title">Urgent Alerts</p>
            <div className="mt-3 space-y-2">
              {urgentAlerts.length === 0 ? (
                <p className="text-sm text-slate-500">No unresolved alerts.</p>
              ) : (
                urgentAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {alert.severity} • {alert.type}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{alert.message}</p>
                    <button
                      type="button"
                      onClick={() => resolveAlert(alert.id)}
                      className="mt-2 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:brightness-110"
                    >
                      Resolve
                    </button>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="surface p-5">
            <p className="section-title">Manager Shortcuts</p>
            <div className="mt-3 space-y-2">
              <Link
                href="/manager/trips"
                className="block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open Trip Ledger
              </Link>
              <Link
                href="/manager/vehicles"
                className="block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Review Vehicle Status
              </Link>
              <Link
                href="/manager/fuel"
                className="block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Approve Fuel Claims
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
