"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import type { FuelEntry } from "@/lib/types";

function badge(status: string): string {
  if (status === "in-progress") return "badge badge-info";
  if (status === "assigned") return "badge badge-warning";
  if (status === "completed") return "badge badge-success";
  return "badge badge-danger";
}

function money(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function makeId(prefix: string): string {
  return `${prefix}${Math.floor(Date.now() + Math.random() * 10000).toString(36)}`;
}

export default function DriverDashboardPage() {
  const { user } = useAuth();
  const {
    trips,
    drivers,
    fuelEntries,
    acceptTrip,
    triggerEmergency,
    toggleLiveStatus,
    updateDropStatus,
    addFuelEntry,
  } = useStore();

  const [fuelAmount, setFuelAmount] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [fuelOdometer, setFuelOdometer] = useState("");
  const [fuelLocation, setFuelLocation] = useState("");

  const driverRecord = drivers.find((driver) => driver.id === user?.id);
  const myTrips = useMemo(
    () => trips.filter((trip) => trip.driverId === user?.id),
    [trips, user?.id],
  );
  const activeTrip = myTrips.find(
    (trip) => trip.status === "in-progress" || trip.status === "assigned",
  );
  const completedCount = myTrips.filter((trip) => trip.status === "completed").length;

  const myFuelEntries = useMemo(
    () =>
      fuelEntries
        .filter((entry) => entry.driverId === user?.id)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 5),
    [fuelEntries, user?.id],
  );

  const pendingDrops =
    activeTrip?.drops.filter((drop) => drop.status !== "delivered" && drop.status !== "failed") ??
    [];

  if (!user) {
    return null;
  }

  const submitFuelEntry = async () => {
    if (!activeTrip || !driverRecord) return;
    if (
      Number(fuelAmount) <= 0 ||
      Number(fuelCost) <= 0 ||
      Number(fuelOdometer) <= 0 ||
      fuelLocation.trim().length < 3
    ) {
      return;
    }

    const entry: FuelEntry = {
      id: makeId("f"),
      tripId: activeTrip.id,
      driverId: driverRecord.id,
      vehicleId: activeTrip.vehicleId ?? driverRecord.currentVehicleId ?? "v-unknown",
      amount: Number(fuelAmount),
      cost: Number(fuelCost),
      currency: "INR",
      odometer: Number(fuelOdometer),
      location: fuelLocation.trim(),
      timestamp: new Date().toISOString(),
      status: "pending",
    };

    await addFuelEntry(entry);
    setFuelAmount("");
    setFuelCost("");
    setFuelOdometer("");
    setFuelLocation("");
  };

  return (
    <div className="space-y-6">
      <section className="surface-strong p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-title">Driver Command</p>
            <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!driverRecord) return;
              toggleLiveStatus(driverRecord.id, !driverRecord.isLive);
            }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {driverRecord?.isLive ? "Disable Live Tracking" : "Enable Live Tracking"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <article className="surface p-4">
            <p className="section-title">Active Trip</p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {activeTrip ? `#${activeTrip.id.toUpperCase()}` : "None"}
            </p>
          </article>
          <article className="surface p-4">
            <p className="section-title">Completed Trips</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{completedCount}</p>
          </article>
          <article className="surface p-4">
            <p className="section-title">Stops Remaining</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{pendingDrops.length}</p>
          </article>
        </div>
      </section>

      {activeTrip ? (
        <section className="space-y-4">
          <article className="surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-900">
                  Trip #{activeTrip.id.toUpperCase()}
                </p>
                <p className="text-xs text-slate-500">{activeTrip.startLocation.address}</p>
              </div>
              <span className={badge(activeTrip.status)}>{activeTrip.status}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {activeTrip.status === "assigned" ? (
                <button
                  type="button"
                  onClick={() => acceptTrip(activeTrip.id)}
                  className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Accept And Start
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => triggerEmergency(user.id, activeTrip.id)}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Trigger SOS
              </button>
              <Link
                href="/driver/routes"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Route Planner
              </Link>
            </div>
          </article>

          <article className="surface p-5">
            <h3 className="text-base font-bold text-slate-900">Delivery Stops</h3>
            <div className="mt-3 space-y-3">
              {activeTrip.drops.map((drop, index) => {
                const canAct =
                  drop.status !== "delivered" &&
                  drop.status !== "failed" &&
                  activeTrip.status === "in-progress";

                return (
                  <div key={drop.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Stop {index + 1} • {drop.customerName}
                        </p>
                        <p className="text-xs text-slate-500">{drop.address}</p>
                      </div>
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

                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={!canAct}
                        onClick={() => updateDropStatus(activeTrip.id, drop.id, "delivered")}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delivered
                      </button>
                      <button
                        type="button"
                        disabled={!canAct}
                        onClick={() => updateDropStatus(activeTrip.id, drop.id, "failed")}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Failed
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="surface p-5">
            <h3 className="text-base font-bold text-slate-900">Log Fuel Entry</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input
                type="number"
                min={1}
                value={fuelAmount}
                onChange={(event) => setFuelAmount(event.target.value)}
                placeholder="Litres"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
              />
              <input
                type="number"
                min={1}
                value={fuelCost}
                onChange={(event) => setFuelCost(event.target.value)}
                placeholder="Cost (INR)"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
              />
              <input
                type="number"
                min={1}
                value={fuelOdometer}
                onChange={(event) => setFuelOdometer(event.target.value)}
                placeholder="Odometer"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
              />
              <input
                type="text"
                value={fuelLocation}
                onChange={(event) => setFuelLocation(event.target.value)}
                placeholder="Fuel station/location"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
              />
            </div>
            <button
              type="button"
              onClick={submitFuelEntry}
              className="mt-3 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Submit Fuel Claim
            </button>
          </article>
        </section>
      ) : (
        <section className="surface p-8 text-center">
          <p className="text-lg font-bold text-slate-900">No active trip assigned</p>
          <p className="mt-2 text-sm text-slate-600">
            Stay ready. New dispatches appear here automatically.
          </p>
        </section>
      )}

      <section className="surface-strong p-5">
        <h3 className="text-base font-bold text-slate-900">Recent Fuel Claims</h3>
        <div className="mt-3 space-y-2">
          {myFuelEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No fuel claims submitted yet.</p>
          ) : (
            myFuelEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">#{entry.id.toUpperCase()}</p>
                  <p className="text-xs text-slate-500">{entry.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">{money(entry.cost)}</p>
                  <span
                    className={
                      entry.status === "approved"
                        ? "badge badge-success"
                        : entry.status === "verified"
                          ? "badge badge-info"
                          : entry.status === "rejected"
                            ? "badge badge-danger"
                            : "badge badge-warning"
                    }
                  >
                    {entry.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
