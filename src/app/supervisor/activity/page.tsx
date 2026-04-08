"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";

type ActivityItem = {
  id: string;
  time: string;
  title: string;
  description: string;
  tone: "info" | "warning" | "success" | "danger";
};

function toneBadge(tone: ActivityItem["tone"]): string {
  if (tone === "success") return "badge badge-success";
  if (tone === "warning") return "badge badge-warning";
  if (tone === "danger") return "badge badge-danger";
  return "badge badge-info";
}

export default function SupervisorActivityPage() {
  const { trips, alerts, fuelEntries } = useStore();

  const timeline = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    trips.forEach((trip) => {
      if (trip.startTime) {
        items.push({
          id: `trip-start-${trip.id}`,
          time: trip.startTime,
          title: `Trip ${trip.id.toUpperCase()} started`,
          description: `Dispatch began from ${trip.startLocation.address}.`,
          tone: "info",
        });
      }
      if (trip.endTime) {
        items.push({
          id: `trip-end-${trip.id}`,
          time: trip.endTime,
          title: `Trip ${trip.id.toUpperCase()} completed`,
          description: `Final distance recorded: ${trip.actualDistance ?? trip.estimatedDistance} km.`,
          tone: "success",
        });
      }
    });

    alerts.forEach((alert) => {
      items.push({
        id: `alert-${alert.id}`,
        time: alert.timestamp,
        title: `${alert.severity.toUpperCase()} ${alert.type} alert`,
        description: alert.message,
        tone: alert.severity === "critical" || alert.severity === "high" ? "danger" : "warning",
      });
    });

    fuelEntries.forEach((entry) => {
      items.push({
        id: `fuel-${entry.id}`,
        time: entry.timestamp,
        title: `Fuel entry ${entry.id.toUpperCase()} ${entry.status}`,
        description: `${entry.amount}L logged at ${entry.location}.`,
        tone: entry.status === "approved" ? "success" : entry.status === "rejected" ? "danger" : "info",
      });
    });

    return items
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 40);
  }, [alerts, fuelEntries, trips]);

  return (
    <section className="surface-strong p-5">
      <h2 className="text-lg font-bold text-slate-900">Operations Timeline</h2>
      <p className="mt-1 text-xs text-slate-500">Unified stream of trip, alert, and fuel activity</p>

      <ol className="mt-5 space-y-3">
        {timeline.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <span className={toneBadge(item.tone)}>{item.tone}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
            <p className="mt-2 text-xs text-slate-500">{new Date(item.time).toLocaleString()}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
