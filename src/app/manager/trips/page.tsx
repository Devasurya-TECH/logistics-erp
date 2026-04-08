"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { TripStatus } from "@/lib/types";

const filters: Array<"all" | TripStatus> = [
  "all",
  "planned",
  "assigned",
  "in-progress",
  "completed",
  "cancelled",
];

function badge(status: TripStatus): string {
  if (status === "completed") return "badge badge-success";
  if (status === "in-progress" || status === "assigned") return "badge badge-info";
  if (status === "planned") return "badge badge-warning";
  return "badge badge-danger";
}

export default function ManagerTripsPage() {
  const { trips, drivers, vehicles, updateTripStatus } = useStore();
  const [filter, setFilter] = useState<"all" | TripStatus>("all");
  const [query, setQuery] = useState("");

  const filteredTrips = useMemo(() => {
    const byStatus = filter === "all" ? trips : trips.filter((trip) => trip.status === filter);
    const needle = query.trim().toLowerCase();
    const bySearch = needle
      ? byStatus.filter((trip) =>
          [
            trip.id,
            trip.startLocation.address,
            trip.status,
            trip.driverId ?? "",
            trip.vehicleId ?? "",
          ].some((value) => value.toLowerCase().includes(needle)),
        )
      : byStatus;

    return [...bySearch].sort((a, b) => b.id.localeCompare(a.id));
  }, [filter, query, trips]);

  return (
    <div className="space-y-4">
      <section className="surface p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Search Trips
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Trip ID, address, driver, or status"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
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
        </div>
      </section>

      <section className="space-y-3">
        {filteredTrips.map((trip) => {
          const driver = drivers.find((item) => item.id === trip.driverId);
          const vehicle = vehicles.find((item) => item.id === trip.vehicleId);
          const delivered = trip.drops.filter((drop) => drop.status === "delivered").length;
          const progress = trip.drops.length === 0 ? 0 : Math.round((delivered / trip.drops.length) * 100);

          return (
            <article key={trip.id} className="surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">#{trip.id.toUpperCase()}</p>
                  <p className="text-xs text-slate-500">{trip.startLocation.address}</p>
                </div>
                <span className={badge(trip.status)}>{trip.status}</span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600 md:grid-cols-4">
                <div>
                  <dt className="section-title">Driver</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {driver?.name ?? "Unassigned"}
                  </dd>
                </div>
                <div>
                  <dt className="section-title">Vehicle</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {vehicle?.plateNumber ?? "Unassigned"}
                  </dd>
                </div>
                <div>
                  <dt className="section-title">Distance</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {trip.estimatedDistance} km
                  </dd>
                </div>
                <div>
                  <dt className="section-title">Drops</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {delivered}/{trip.drops.length}
                  </dd>
                </div>
              </dl>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Delivery Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {trip.status !== "completed" && trip.status !== "cancelled" ? (
                  <button
                    type="button"
                    onClick={() => updateTripStatus(trip.id, "completed")}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                  >
                    Force Complete
                  </button>
                ) : null}
                {trip.status !== "cancelled" ? (
                  <button
                    type="button"
                    onClick={() => updateTripStatus(trip.id, "cancelled")}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateTripStatus(trip.id, "planned")}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Reopen As Planned
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {filteredTrips.length === 0 ? (
          <section className="surface p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">No trips match your filters.</p>
          </section>
        ) : null}
      </section>
    </div>
  );
}
