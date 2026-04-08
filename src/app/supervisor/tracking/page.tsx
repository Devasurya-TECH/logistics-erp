"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";

function stateBadge(state: "moving" | "idle" | "maintenance"): string {
  if (state === "moving") return "badge badge-info";
  if (state === "idle") return "badge badge-success";
  return "badge badge-warning";
}

export default function SupervisorTrackingPage() {
  const { vehicles, trips, drivers, updateVehicleLocation } = useStore();

  const trackingRows = useMemo(() => {
    return vehicles.map((vehicle) => {
      const activeTrip = trips.find(
        (trip) =>
          trip.vehicleId === vehicle.id &&
          (trip.status === "in-progress" || trip.status === "assigned"),
      );
      const assignedDriver = drivers.find((driver) => driver.id === activeTrip?.driverId);

      const state: "moving" | "idle" | "maintenance" =
        vehicle.status === "maintenance"
          ? "maintenance"
          : activeTrip
            ? "moving"
            : "idle";

      return {
        ...vehicle,
        activeTrip,
        assignedDriver,
        state,
      };
    });
  }, [drivers, trips, vehicles]);

  const simulateMovement = async () => {
    const movingVehicles = trackingRows.filter((row) => row.state === "moving");
    await Promise.all(
      movingVehicles.map(async (row) => {
        const nextLat = Number((row.location.lat + (Math.random() - 0.5) * 0.01).toFixed(4));
        const nextLng = Number((row.location.lng + (Math.random() - 0.5) * 0.01).toFixed(4));
        await updateVehicleLocation(row.id, { lat: nextLat, lng: nextLng });
      }),
    );
  };

  return (
    <div className="space-y-4">
      <section className="surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-title">Live Fleet Tracking</p>
            <p className="text-sm text-slate-600">Location coordinates refresh from the shared store.</p>
          </div>
          <button
            type="button"
            onClick={simulateMovement}
            className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Simulate Live Movement
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {trackingRows.map((row) => (
          <article key={row.id} className="surface p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-slate-900">{row.plateNumber}</p>
                <p className="text-xs text-slate-500">{row.model}</p>
              </div>
              <span className={stateBadge(row.state)}>{row.state}</span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div>
                <dt className="section-title">Driver</dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {row.assignedDriver?.name ?? "Unassigned"}
                </dd>
              </div>
              <div>
                <dt className="section-title">Trip</dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {row.activeTrip ? `#${row.activeTrip.id.toUpperCase()}` : "None"}
                </dd>
              </div>
              <div>
                <dt className="section-title">Latitude</dt>
                <dd className="mt-1 font-semibold text-slate-800">{row.location.lat.toFixed(4)}</dd>
              </div>
              <div>
                <dt className="section-title">Longitude</dt>
                <dd className="mt-1 font-semibold text-slate-800">{row.location.lng.toFixed(4)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
