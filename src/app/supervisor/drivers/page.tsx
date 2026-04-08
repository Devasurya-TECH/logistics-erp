"use client";

import { useStore } from "@/lib/store";

function statusBadge(status: string): string {
  if (status === "available") return "badge badge-success";
  if (status === "on-trip") return "badge badge-info";
  return "badge badge-warning";
}

export default function SupervisorDriversPage() {
  const { drivers, trips, toggleLiveStatus } = useStore();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {drivers.map((driver) => {
        const currentTrip = trips.find(
          (trip) =>
            trip.driverId === driver.id &&
            (trip.status === "in-progress" || trip.status === "assigned"),
        );

        return (
          <article key={driver.id} className="surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-900">{driver.name}</p>
                <p className="text-xs text-slate-500">{driver.email}</p>
              </div>
              <span className={statusBadge(driver.status)}>{driver.status}</span>
            </div>

            <dl className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <dt>License</dt>
                <dd className="font-semibold text-slate-800">{driver.licenseNumber}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Current Trip</dt>
                <dd className="font-semibold text-slate-800">
                  {currentTrip ? `#${currentTrip.id.toUpperCase()}` : "None"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Live Sharing</dt>
                <dd className="font-semibold text-slate-800">
                  {driver.isLive ? "Enabled" : "Disabled"}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => toggleLiveStatus(driver.id, !driver.isLive)}
              className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {driver.isLive ? "Disable Live Tracking" : "Enable Live Tracking"}
            </button>
          </article>
        );
      })}
    </div>
  );
}
