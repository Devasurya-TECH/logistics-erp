"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";

function statusBadge(status: string): string {
  if (status === "completed") return "badge badge-success";
  if (status === "in-progress" || status === "assigned") return "badge badge-info";
  if (status === "planned") return "badge badge-warning";
  return "badge badge-danger";
}

export default function DriverActivityPage() {
  const { user } = useAuth();
  const { trips, fuelEntries } = useStore();

  const myTrips = useMemo(
    () =>
      trips
        .filter((trip) => trip.driverId === user?.id)
        .sort((a, b) => (b.startTime ?? "").localeCompare(a.startTime ?? "")),
    [trips, user?.id],
  );

  const myFuel = useMemo(
    () =>
      fuelEntries
        .filter((entry) => entry.driverId === user?.id)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [fuelEntries, user?.id],
  );

  return (
    <div className="space-y-6">
      <section className="surface-strong overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Trip History</h2>
          <p className="text-xs text-slate-500">All assigned trips and outcomes</p>
        </div>
        <div className="divide-y divide-slate-100">
          {myTrips.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">No trip history yet.</p>
          ) : (
            myTrips.map((trip) => (
              <article key={trip.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">#{trip.id.toUpperCase()}</p>
                  <span className={statusBadge(trip.status)}>{trip.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{trip.startLocation.address}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {trip.actualDistance ?? trip.estimatedDistance} km • {trip.drops.length} drops
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="surface-strong overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Fuel Claims</h2>
          <p className="text-xs text-slate-500">Submitted by this driver account</p>
        </div>
        <div className="divide-y divide-slate-100">
          {myFuel.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">No fuel claims submitted yet.</p>
          ) : (
            myFuel.map((entry) => (
              <article key={entry.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">#{entry.id.toUpperCase()}</p>
                  <span className={statusBadge(entry.status)}>{entry.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {entry.amount}L • {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(entry.cost)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {entry.location} • {new Date(entry.timestamp).toLocaleString()}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
