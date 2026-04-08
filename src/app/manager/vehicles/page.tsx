"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Vehicle } from "@/lib/types";

function statusStyle(status: Vehicle["status"]): string {
  if (status === "active") return "badge badge-success";
  if (status === "maintenance") return "badge badge-warning";
  return "badge badge-danger";
}

export default function ManagerVehiclesPage() {
  const { vehicles, trips, updateVehicleStatus } = useStore();
  const [filter, setFilter] = useState<"all" | Vehicle["status"]>("all");

  const visibleVehicles = useMemo(() => {
    if (filter === "all") return vehicles;
    return vehicles.filter((vehicle) => vehicle.status === filter);
  }, [filter, vehicles]);

  return (
    <div className="space-y-4">
      <section className="surface p-4">
        <p className="section-title mb-2">Fleet Filter</p>
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "maintenance", "out-of-service"] as const).map((item) => (
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleVehicles.map((vehicle) => {
          const activeTrip = trips.find(
            (trip) =>
              trip.vehicleId === vehicle.id &&
              (trip.status === "in-progress" || trip.status === "assigned"),
          );

          return (
            <article key={vehicle.id} className="surface p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-900">{vehicle.plateNumber}</p>
                  <p className="text-sm text-slate-500">{vehicle.model}</p>
                </div>
                <span className={statusStyle(vehicle.status)}>{vehicle.status}</span>
              </div>

              <dl className="mt-4 grid gap-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <dt>Fuel Level</dt>
                  <dd className="font-semibold text-slate-800">{vehicle.fuelLevel}%</dd>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                    style={{ width: `${vehicle.fuelLevel}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <dt>Mileage</dt>
                  <dd className="font-semibold text-slate-800">
                    {vehicle.mileage.toLocaleString("en-IN")} km
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Fuel Type</dt>
                  <dd className="font-semibold uppercase text-slate-800">
                    {vehicle.fuelType ?? "N/A"}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                {activeTrip ? (
                  <p>
                    Assigned to trip{" "}
                    <span className="font-semibold">#{activeTrip.id.toUpperCase()}</span>
                  </p>
                ) : (
                  <p>No active trip assigned.</p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateVehicleStatus(vehicle.id, "active")}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  Mark Active
                </button>
                <button
                  type="button"
                  onClick={() => updateVehicleStatus(vehicle.id, "maintenance")}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                >
                  Maintenance
                </button>
                <button
                  type="button"
                  onClick={() => updateVehicleStatus(vehicle.id, "out-of-service")}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Out of Service
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
