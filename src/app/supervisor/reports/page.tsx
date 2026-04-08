"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { downloadCSV, generateTripCSV } from "@/lib/utils/export";

function money(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SupervisorReportsPage() {
  const { trips, drivers, vehicles, fuelEntries, alerts } = useStore();

  const report = useMemo(() => {
    const totalTrips = trips.length;
    const completedTrips = trips.filter((trip) => trip.status === "completed").length;
    const completionRate = totalTrips === 0 ? 0 : Math.round((completedTrips / totalTrips) * 100);

    const totalDrops = trips.flatMap((trip) => trip.drops);
    const deliveredDrops = totalDrops.filter((drop) => drop.status === "delivered").length;
    const deliveryRate = totalDrops.length === 0 ? 0 : Math.round((deliveredDrops / totalDrops.length) * 100);

    const totalFuelSpend = fuelEntries.reduce((sum, entry) => sum + entry.cost, 0);
    const avgFuelSpend = fuelEntries.length === 0 ? 0 : Math.round(totalFuelSpend / fuelEntries.length);
    const unresolvedAlerts = alerts.filter((alert) => !alert.resolved).length;

    return {
      totalTrips,
      completedTrips,
      completionRate,
      totalDrops: totalDrops.length,
      deliveredDrops,
      deliveryRate,
      totalFuelSpend,
      avgFuelSpend,
      unresolvedAlerts,
    };
  }, [alerts, fuelEntries, trips]);

  const exportTrips = () => {
    const csv = generateTripCSV(trips, drivers, vehicles, fuelEntries, alerts);
    const fileName = `logitrace-trips-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(fileName, csv);
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="surface p-5">
          <p className="section-title">Trip Completion</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{report.completionRate}%</p>
          <p className="mt-1 text-xs text-slate-500">
            {report.completedTrips}/{report.totalTrips} trips completed
          </p>
        </article>
        <article className="surface p-5">
          <p className="section-title">Delivery Success</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{report.deliveryRate}%</p>
          <p className="mt-1 text-xs text-slate-500">
            {report.deliveredDrops}/{report.totalDrops} drops delivered
          </p>
        </article>
        <article className="surface p-5">
          <p className="section-title">Fuel Spend</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{money(report.totalFuelSpend)}</p>
        </article>
        <article className="surface p-5">
          <p className="section-title">Avg Claim</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{money(report.avgFuelSpend)}</p>
        </article>
        <article className="surface p-5">
          <p className="section-title">Open Alerts</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{report.unresolvedAlerts}</p>
        </article>
      </section>

      <section className="surface-strong p-5">
        <h2 className="text-lg font-bold text-slate-900">Supervisor Insights</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Current completion is <strong>{report.completionRate}%</strong> with delivery success at{" "}
          <strong>{report.deliveryRate}%</strong>. Total logged fuel spend stands at{" "}
          <strong>{money(report.totalFuelSpend)}</strong>. Export a CSV snapshot for handover,
          finance reconciliation, or weekly performance review.
        </p>

        <button
          type="button"
          onClick={exportTrips}
          className="mt-4 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Export Trips CSV
        </button>
      </section>
    </div>
  );
}
