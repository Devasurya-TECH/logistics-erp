"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import type { DropPoint, Trip, TripStatus } from "@/lib/types";

type NewDrop = {
  customerName: string;
  address: string;
};

const filters: Array<"all" | TripStatus> = [
  "all",
  "planned",
  "assigned",
  "in-progress",
  "completed",
  "cancelled",
];

function statusBadge(status: TripStatus): string {
  if (status === "completed") return "badge badge-success";
  if (status === "in-progress" || status === "assigned") return "badge badge-info";
  if (status === "planned") return "badge badge-warning";
  return "badge badge-danger";
}

function makeId(prefix: string): string {
  return `${prefix}${Math.floor(Date.now() + Math.random() * 10000).toString(36)}`;
}

function seededLocation(index: number): { lat: number; lng: number } {
  const baseLat = 10.0;
  const baseLng = 76.3;
  return {
    lat: Number((baseLat + 0.08 * (index % 3) + Math.random() * 0.02).toFixed(4)),
    lng: Number((baseLng + 0.06 * (index % 4) + Math.random() * 0.02).toFixed(4)),
  };
}

export default function SupervisorTripsPage() {
  const { user } = useAuth();
  const {
    trips,
    drivers,
    vehicles,
    addTrip,
    assignDriver,
    updateTripStatus,
  } = useStore();

  const [filter, setFilter] = useState<"all" | TripStatus>("all");
  const [startAddress, setStartAddress] = useState("");
  const [estimatedDistance, setEstimatedDistance] = useState("");
  const [dropCustomer, setDropCustomer] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [drops, setDrops] = useState<NewDrop[]>([]);
  const [assignmentDraft, setAssignmentDraft] = useState<
    Record<string, { driverId: string; vehicleId: string }>
  >({});

  const visibleTrips = useMemo(() => {
    const next = filter === "all" ? trips : trips.filter((trip) => trip.status === filter);
    return [...next].sort((a, b) => b.id.localeCompare(a.id));
  }, [filter, trips]);

  const assignableDrivers = drivers.filter((driver) => driver.status !== "off-duty");
  const assignableVehicles = vehicles.filter((vehicle) => vehicle.status !== "out-of-service");

  const canCreateTrip =
    startAddress.trim().length > 6 &&
    Number(estimatedDistance) > 0 &&
    drops.length > 0;

  const addDropToDraft = () => {
    if (!dropCustomer.trim() || !dropAddress.trim()) return;
    setDrops((prev) => [
      ...prev,
      {
        customerName: dropCustomer.trim(),
        address: dropAddress.trim(),
      },
    ]);
    setDropCustomer("");
    setDropAddress("");
  };

  const createTrip = async () => {
    if (!canCreateTrip || !user) return;

    const startCoord = seededLocation(0);
    const tripDrops: DropPoint[] = drops.map((drop, index) => {
      const coord = seededLocation(index + 1);
      return {
        id: makeId("d"),
        customerName: drop.customerName,
        address: drop.address,
        lat: coord.lat,
        lng: coord.lng,
        status: "pending",
      };
    });

    const trip: Trip = {
      id: makeId("t"),
      status: "planned",
      supervisorId: user.id,
      startLocation: {
        address: startAddress.trim(),
        lat: startCoord.lat,
        lng: startCoord.lng,
      },
      drops: tripDrops,
      estimatedDistance: Number(estimatedDistance),
    };

    await addTrip(trip);
    setStartAddress("");
    setEstimatedDistance("");
    setDrops([]);
  };

  const getDraft = (tripId: string) => {
    const existing = assignmentDraft[tripId];
    if (existing) return existing;
    return {
      driverId: assignableDrivers[0]?.id ?? "",
      vehicleId: assignableVehicles[0]?.id ?? "",
    };
  };

  const setDraft = (
    tripId: string,
    key: "driverId" | "vehicleId",
    value: string,
  ) => {
    setAssignmentDraft((prev) => ({
      ...prev,
      [tripId]: {
        ...getDraft(tripId),
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-5">
      <section className="surface-strong p-5">
        <h2 className="text-lg font-bold text-slate-900">Create New Trip</h2>
        <p className="mt-1 text-sm text-slate-600">
          Build a multi-stop trip and dispatch from this panel.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Start Address
            </span>
            <input
              type="text"
              value={startAddress}
              onChange={(event) => setStartAddress(event.target.value)}
              placeholder="Warehouse address"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Estimated Distance (km)
            </span>
            <input
              type="number"
              min={1}
              value={estimatedDistance}
              onChange={(event) => setEstimatedDistance(event.target.value)}
              placeholder="e.g. 45"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="section-title mb-2">Drop Points</p>
          <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto]">
            <input
              type="text"
              value={dropCustomer}
              onChange={(event) => setDropCustomer(event.target.value)}
              placeholder="Customer name"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
            />
            <input
              type="text"
              value={dropAddress}
              onChange={(event) => setDropAddress(event.target.value)}
              placeholder="Drop address"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
            />
            <button
              type="button"
              onClick={addDropToDraft}
              className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Add Stop
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {drops.length === 0 ? (
              <p className="text-sm text-slate-500">No stops added yet.</p>
            ) : (
              drops.map((drop, index) => (
                <div
                  key={`${drop.customerName}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {index + 1}. {drop.customerName}
                    </p>
                    <p className="text-xs text-slate-500">{drop.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDrops((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={!canCreateTrip}
          onClick={createTrip}
          className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create Trip
        </button>
      </section>

      <section className="surface p-4">
        <p className="section-title mb-2">Trip Status Filter</p>
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
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {visibleTrips.map((trip) => {
          const currentDriver = drivers.find((driver) => driver.id === trip.driverId);
          const currentVehicle = vehicles.find((vehicle) => vehicle.id === trip.vehicleId);
          const delivered = trip.drops.filter((drop) => drop.status === "delivered").length;
          const progress = trip.drops.length === 0 ? 0 : Math.round((delivered / trip.drops.length) * 100);
          const draft = getDraft(trip.id);

          return (
            <article key={trip.id} className="surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">#{trip.id.toUpperCase()}</p>
                  <p className="text-xs text-slate-500">{trip.startLocation.address}</p>
                </div>
                <span className={statusBadge(trip.status)}>{trip.status}</span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div>
                  <dt className="section-title">Driver</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {currentDriver?.name ?? "Unassigned"}
                  </dd>
                </div>
                <div>
                  <dt className="section-title">Vehicle</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {currentVehicle?.plateNumber ?? "Unassigned"}
                  </dd>
                </div>
                <div>
                  <dt className="section-title">Distance</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {trip.estimatedDistance} km
                  </dd>
                </div>
                <div>
                  <dt className="section-title">Drop Points</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {trip.drops.length}
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
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {trip.status === "planned" ? (
                <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Assign Driver & Vehicle
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={draft.driverId}
                      onChange={(event) => setDraft(trip.id, "driverId", event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
                    >
                      {assignableDrivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} ({driver.status})
                        </option>
                      ))}
                    </select>
                    <select
                      value={draft.vehicleId}
                      onChange={(event) => setDraft(trip.id, "vehicleId", event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
                    >
                      {assignableVehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.plateNumber} ({vehicle.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!draft.driverId || !draft.vehicleId}
                    onClick={() => assignDriver(trip.id, draft.driverId, draft.vehicleId)}
                    className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Assign Trip
                  </button>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {trip.status === "assigned" ? (
                  <button
                    type="button"
                    onClick={() => updateTripStatus(trip.id, "in-progress")}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                  >
                    Mark In Progress
                  </button>
                ) : null}
                {trip.status === "in-progress" ? (
                  <button
                    type="button"
                    onClick={() => updateTripStatus(trip.id, "completed")}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                  >
                    Mark Completed
                  </button>
                ) : null}
                {trip.status !== "completed" && trip.status !== "cancelled" ? (
                  <button
                    type="button"
                    onClick={() => updateTripStatus(trip.id, "cancelled")}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Cancel Trip
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
