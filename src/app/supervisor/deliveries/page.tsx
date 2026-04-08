"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { DropPoint } from "@/lib/types";

type DeliveryFilter = "all" | DropPoint["status"];

type DeliveryRow = DropPoint & {
  tripId: string;
  tripStatus: string;
};

const filters: DeliveryFilter[] = ["all", "pending", "delivered", "failed", "skipped"];

function statusBadge(status: DropPoint["status"]): string {
  if (status === "delivered") return "badge badge-success";
  if (status === "pending") return "badge badge-warning";
  if (status === "failed" || status === "skipped") return "badge badge-danger";
  return "badge badge-info";
}

export default function SupervisorDeliveriesPage() {
  const { trips, updateDropStatus } = useStore();
  const [filter, setFilter] = useState<DeliveryFilter>("all");
  const [query, setQuery] = useState("");

  const deliveries = useMemo<DeliveryRow[]>(() => {
    const allDrops = trips.flatMap((trip) =>
      trip.drops.map((drop) => ({
        ...drop,
        tripId: trip.id,
        tripStatus: trip.status,
      })),
    );

    const filteredByStatus =
      filter === "all" ? allDrops : allDrops.filter((drop) => drop.status === filter);

    const needle = query.trim().toLowerCase();
    if (!needle) return filteredByStatus;

    return filteredByStatus.filter((drop) =>
      [drop.customerName, drop.address, drop.tripId].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [filter, query, trips]);

  return (
    <div className="space-y-4">
      <section className="surface p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Search Deliveries
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Trip ID, customer, or address"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
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
                    ? "bg-cyan-700 text-white"
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
        {deliveries.map((delivery) => {
          const canUpdate =
            delivery.status === "pending" &&
            (delivery.tripStatus === "assigned" || delivery.tripStatus === "in-progress");

          return (
            <article key={delivery.id} className="surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Trip #{delivery.tripId.toUpperCase()} • {delivery.customerName}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{delivery.address}</p>
                </div>
                <span className={statusBadge(delivery.status)}>{delivery.status}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canUpdate}
                  onClick={() => updateDropStatus(delivery.tripId, delivery.id, "delivered")}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark Delivered
                </button>
                <button
                  type="button"
                  disabled={!canUpdate}
                  onClick={() => updateDropStatus(delivery.tripId, delivery.id, "failed")}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark Failed
                </button>
              </div>
            </article>
          );
        })}

        {deliveries.length === 0 ? (
          <section className="surface p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">No deliveries match your filters.</p>
          </section>
        ) : null}
      </section>
    </div>
  );
}
