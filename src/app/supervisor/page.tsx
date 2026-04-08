"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

function metricCard(label: string, value: string, hint: string) {
  return (
    <article key={label} className="surface p-5">
      <p className="section-title">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

function badge(status: string): string {
  if (status === "completed") return "badge badge-success";
  if (status === "in-progress" || status === "assigned") return "badge badge-info";
  if (status === "planned") return "badge badge-warning";
  return "badge badge-danger";
}

export default function SupervisorDashboardPage() {
  const { trips, drivers, fuelEntries, alerts } = useStore();

  const inProgress = trips.filter((trip) => trip.status === "in-progress").length;
  const pendingTrips = trips.filter((trip) => trip.status === "planned" || trip.status === "assigned").length;
  const pendingFuel = fuelEntries.filter((entry) => entry.status === "pending").length;
  const unresolved = alerts.filter((alert) => !alert.resolved).length;
  const availableDrivers = drivers.filter((driver) => driver.status === "available").length;

  const urgentAlerts = alerts
    .filter((alert) => !alert.resolved)
    .sort((a, b) => {
      const rankA = a.severity === "critical" ? 0 : a.severity === "high" ? 1 : 2;
      const rankB = b.severity === "critical" ? 0 : b.severity === "high" ? 1 : 2;
      return rankA - rankB;
    })
    .slice(0, 4);

  const activeTrips = trips.filter((trip) => trip.status === "in-progress" || trip.status === "assigned").slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCard("Live Trips", String(inProgress), "Currently moving")}
        {metricCard("Queued Trips", String(pendingTrips), "Planned or assigned")}
        {metricCard("Pending Fuel", String(pendingFuel), "Needs verification")}
        {metricCard("Unresolved Alerts", String(unresolved), "Open incidents")}
        {metricCard("Available Drivers", String(availableDrivers), "Ready for dispatch")}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <article className="surface-strong overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">Active Trip Queue</h2>
            <p className="text-xs text-slate-500">Trips requiring supervisor attention</p>
          </div>
          <div className="divide-y divide-slate-100">
            {activeTrips.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500">No active trips right now.</p>
            ) : (
              activeTrips.map((trip) => {
                const delivered = trip.drops.filter((drop) => drop.status === "delivered").length;
                const progress = trip.drops.length === 0 ? 0 : Math.round((delivered / trip.drops.length) * 100);
                return (
                  <div key={trip.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">#{trip.id.toUpperCase()}</p>
                        <p className="text-xs text-slate-500">{trip.startLocation.address}</p>
                      </div>
                      <span className={badge(trip.status)}>{trip.status}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Delivery progress: {delivered}/{trip.drops.length}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <div className="space-y-4">
          <article className="surface p-5">
            <p className="section-title">Urgent Alerts</p>
            <div className="mt-3 space-y-2">
              {urgentAlerts.length === 0 ? (
                <p className="text-sm text-slate-500">All clear. No urgent alerts.</p>
              ) : (
                urgentAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {alert.severity} • {alert.type}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="surface p-5">
            <p className="section-title">Supervisor Shortcuts</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/supervisor/deliveries"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Deliveries
              </Link>
              <Link
                href="/supervisor/drivers"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Drivers
              </Link>
              <Link
                href="/supervisor/tracking"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tracking
              </Link>
              <Link
                href="/supervisor/fuel"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fuel Desk
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
