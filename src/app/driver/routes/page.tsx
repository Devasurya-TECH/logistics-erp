"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";

export default function DriverRoutesPage() {
  const { user } = useAuth();
  const { trips } = useStore();

  const activeTrip = useMemo(
    () =>
      trips.find(
        (trip) =>
          trip.driverId === user?.id &&
          (trip.status === "in-progress" || trip.status === "assigned"),
      ),
    [trips, user?.id],
  );

  if (!activeTrip) {
    return (
      <section className="surface p-8 text-center">
        <p className="text-lg font-bold text-slate-900">No route available</p>
        <p className="mt-2 text-sm text-slate-600">
          A route will appear once a trip is assigned.
        </p>
      </section>
    );
  }

  const remainingDrops = activeTrip.drops.filter((drop) => drop.status !== "delivered");

  const openInMaps = () => {
    if (remainingDrops.length === 0) return;

    const destination = remainingDrops[remainingDrops.length - 1];
    const waypointDrops = remainingDrops.slice(0, -1);
    const waypoints = waypointDrops.map((drop) => `${drop.lat},${drop.lng}`).join("|");
    const waypointParam = waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : "";
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}${waypointParam}&travelmode=driving`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <section className="surface-strong p-5">
        <p className="section-title">Active Route</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Trip #{activeTrip.id.toUpperCase()}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{activeTrip.startLocation.address}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openInMaps}
            className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Open In Google Maps
          </button>
          <span className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Remaining Stops: {remainingDrops.length}
          </span>
        </div>
      </section>

      <section className="space-y-3">
        {activeTrip.drops.map((drop, index) => (
          <article key={drop.id} className="surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">
                Stop {index + 1}: {drop.customerName}
              </p>
              <span
                className={
                  drop.status === "delivered"
                    ? "badge badge-success"
                    : drop.status === "failed"
                      ? "badge badge-danger"
                      : "badge badge-warning"
                }
              >
                {drop.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{drop.address}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
