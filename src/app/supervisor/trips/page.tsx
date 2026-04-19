"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import type { DropPoint, Trip, TripStatus } from "@/lib/types";

type TripFilter = "all" | TripStatus | "review";

const filters: TripFilter[] = [
    "all",
    "planned",
    "assigned",
    "in-progress",
    "review",
    "completed",
    "cancelled",
];

function tripClass(status: TripStatus) {
    if (status === "completed") return "bg-emerald-100 text-emerald-700";
    if (status === "in-progress") return "bg-blue-100 text-blue-700";
    if (status === "assigned") return "bg-amber-100 text-amber-700";
    if (status === "planned") return "bg-slate-100 text-slate-700";
    return "bg-rose-100 text-rose-700";
}

function reviewStats(trip: Trip) {
    const delivered = trip.drops.filter((drop) => drop.status === "delivered").length;
    const failed = trip.drops.filter((drop) => drop.status === "failed").length;
    const pending = trip.drops.filter((drop) => drop.status === "pending").length;
    const resolved = delivered + failed;
    const allStopsResolved = trip.drops.length > 0 && pending === 0;
    const startProofVerified = Boolean(trip.startProof?.verifiedAt);
    const allStopsReviewed =
        trip.drops.length > 0 &&
        trip.drops.every((drop) => {
            if (drop.status === "delivered") {
                return Boolean(drop.proofImage && drop.proofLocation && drop.proofVerifiedAt);
            }
            if (drop.status === "failed") {
                return Boolean(drop.reviewedAt);
            }
            return false;
        });
    const readyForCompletion =
        trip.status === "in-progress" &&
        allStopsResolved &&
        startProofVerified &&
        allStopsReviewed;
    const needsReview =
        trip.status === "in-progress" &&
        allStopsResolved &&
        (!startProofVerified || !allStopsReviewed);

    return {
        delivered,
        failed,
        pending,
        resolved,
        allStopsResolved,
        startProofVerified,
        allStopsReviewed,
        readyForCompletion,
        needsReview,
    };
}

function stopNeedsReview(drop: DropPoint) {
    if (drop.status === "delivered") {
        return Boolean(drop.proofImage && drop.proofLocation && !drop.proofVerifiedAt);
    }
    if (drop.status === "failed") {
        return !drop.reviewedAt;
    }
    return false;
}

export default function SupervisorTripsPage() {
    const { user } = useAuth();
    const {
        trips,
        drivers,
        vehicles,
        updateTripStatus,
        verifyTripStartProof,
        verifyDropReview,
    } = useStore();
    const [filter, setFilter] = useState<TripFilter>("all");
    const [query, setQuery] = useState("");
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

    const summary = useMemo(() => {
        const completed = trips.filter((trip) => trip.status === "completed").length;
        const cancelled = trips.filter((trip) => trip.status === "cancelled").length;
        const review = trips.filter((trip) => reviewStats(trip).needsReview || reviewStats(trip).readyForCompletion).length;
        return {
            total: trips.length,
            active: trips.filter((trip) => trip.status === "assigned" || trip.status === "in-progress").length,
            completed,
            cancelled,
            review,
        };
    }, [trips]);

    const filtered = useMemo(() => {
        const base =
            filter === "all"
                ? trips
                : filter === "review"
                    ? trips.filter((trip) => {
                          const stats = reviewStats(trip);
                          return stats.needsReview || stats.readyForCompletion;
                      })
                    : trips.filter((trip) => trip.status === filter);
        const q = query.trim().toLowerCase();
        return base.filter((trip) => {
            if (q.length === 0) return true;
            const driverName = drivers.find((driver) => driver.id === trip.driverId)?.name || "";
            const plate = vehicles.find((vehicle) => vehicle.id === trip.vehicleId)?.plateNumber || "";
            return (
                trip.id.toLowerCase().includes(q) ||
                trip.startLocation.address.toLowerCase().includes(q) ||
                driverName.toLowerCase().includes(q) ||
                plate.toLowerCase().includes(q)
            );
        });
    }, [trips, drivers, vehicles, filter, query]);

    const selectedTrip =
        (selectedTripId && trips.find((trip) => trip.id === selectedTripId)) ||
        filtered[0] ||
        null;
    const selectedStats = selectedTrip ? reviewStats(selectedTrip) : null;
    const selectedDriver = selectedTrip
        ? drivers.find((driver) => driver.id === selectedTrip.driverId)
        : null;
    const selectedVehicle = selectedTrip
        ? vehicles.find((vehicle) => vehicle.id === selectedTrip.vehicleId)
        : null;

    return (
        <div className="space-y-4">
            <section className="grid gap-3 sm:grid-cols-5">
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Total Trips</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Active</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{summary.active}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Needs Review</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{summary.review}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Completed</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.completed}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Cancelled</p>
                    <p className="text-2xl font-bold text-rose-700 mt-1">{summary.cancelled}</p>
                </article>
            </section>

            <section className="flex flex-wrap gap-2">
                {filters.map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => setFilter(item)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                            filter === item
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-gray-200 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        {item === "review" ? "needs review" : item}
                    </button>
                ))}
            </section>

            <section>
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search trips..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)]">
                <div className="space-y-2">
                    {filtered.map((trip) => {
                        const driver = drivers.find((item) => item.id === trip.driverId);
                        const vehicle = vehicles.find((item) => item.id === trip.vehicleId);
                        const stats = reviewStats(trip);
                        const selected = selectedTrip?.id === trip.id;

                        return (
                            <article
                                key={trip.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedTripId(trip.id)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        setSelectedTripId(trip.id);
                                    }
                                }}
                                className={`bg-white border rounded-xl p-3 cursor-pointer transition ${
                                    selected ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200 hover:border-blue-200"
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Trip #{trip.id.toUpperCase()}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{trip.startLocation.address}</p>
                                    </div>
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${tripClass(trip.status)}`}>
                                        {trip.status}
                                    </span>
                                </div>

                                <div className="mt-2 text-xs text-slate-500 grid sm:grid-cols-2 gap-1">
                                    <p>Driver: {driver?.name || "Unassigned"}</p>
                                    <p>Vehicle: {vehicle?.plateNumber || "Unassigned"}</p>
                                    <p>Distance: {trip.actualDistance || trip.estimatedDistance} km</p>
                                    <p>Drops: {stats.delivered} delivered / {stats.failed} failed / {stats.pending} pending</p>
                                </div>

                                {(stats.needsReview || stats.readyForCompletion) && (
                                    <p className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                                        Supervisor review required
                                    </p>
                                )}
                            </article>
                        );
                    })}
                    {filtered.length === 0 && (
                        <article className="bg-white border border-gray-200 rounded-xl p-6">
                            <p className="text-slate-600">No trips found.</p>
                        </article>
                    )}
                </div>

                <aside className="bg-white border border-gray-200 rounded-xl p-4 h-fit">
                    {!selectedTrip || !selectedStats ? (
                        <p className="text-sm text-slate-500">Select a trip to review delivery details.</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        Trip #{selectedTrip.id.toUpperCase()}
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {selectedDriver?.name || "Unassigned driver"} | {selectedVehicle?.plateNumber || "No vehicle"}
                                    </p>
                                </div>
                                <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${tripClass(selectedTrip.status)}`}>
                                    {selectedTrip.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                                    <p className="text-[11px] text-emerald-700 font-semibold">Delivered</p>
                                    <p className="text-xl font-bold text-emerald-800">{selectedStats.delivered}</p>
                                </div>
                                <div className="rounded-lg bg-rose-50 border border-rose-100 p-3">
                                    <p className="text-[11px] text-rose-700 font-semibold">Failed</p>
                                    <p className="text-xl font-bold text-rose-800">{selectedStats.failed}</p>
                                </div>
                                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                                    <p className="text-[11px] text-amber-700 font-semibold">Pending</p>
                                    <p className="text-xl font-bold text-amber-800">{selectedStats.pending}</p>
                                </div>
                            </div>

                            <section className="border border-gray-200 rounded-xl p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Trip Start Proof</p>
                                        <p className="text-xs text-slate-500 mt-1">Odometer, fuel reading, image, and start location.</p>
                                    </div>
                                    {selectedTrip.startProof?.verifiedAt ? (
                                        <span className="text-[11px] px-2 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-700">
                                            verified
                                        </span>
                                    ) : (
                                        <span className="text-[11px] px-2 py-1 rounded-full font-semibold bg-amber-100 text-amber-700">
                                            pending
                                        </span>
                                    )}
                                </div>

                                {!selectedTrip.startProof ? (
                                    <p className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                                        Missing start proof. Driver must start the trip with odometer/fuel photo and location.
                                    </p>
                                ) : (
                                    <div className="mt-3 space-y-2">
                                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                            <p>Odometer: <span className="font-semibold text-slate-900">{selectedTrip.startProof.odometer}</span></p>
                                            <p>Fuel: <span className="font-semibold text-slate-900">{selectedTrip.startProof.fuelReading}</span></p>
                                            <p className="col-span-2">Location: {selectedTrip.startProof.location}</p>
                                            <p className="col-span-2">
                                                Lat: {selectedTrip.startProof.lat.toFixed(6)} | Lng: {selectedTrip.startProof.lng.toFixed(6)}
                                            </p>
                                        </div>
                                        <img
                                            src={selectedTrip.startProof.image}
                                            alt="Trip start proof"
                                            className="w-full max-w-xs h-40 object-cover rounded-lg border border-gray-200"
                                        />
                                        {!selectedTrip.startProof.verifiedAt && user?.id && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void verifyTripStartProof(selectedTrip.id, user.id);
                                                }}
                                                className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                            >
                                                Verify Start Proof
                                            </button>
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold text-slate-900">Delivery Proof Review</h3>
                                {selectedTrip.drops.map((drop, index) => (
                                    <article key={drop.id} className="border border-gray-200 rounded-xl p-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    Stop {index + 1}: {drop.customerName}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">{drop.address}</p>
                                            </div>
                                            <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                                                drop.status === "delivered"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : drop.status === "failed"
                                                        ? "bg-rose-100 text-rose-700"
                                                        : "bg-amber-100 text-amber-700"
                                            }`}>
                                                {drop.status}
                                            </span>
                                        </div>

                                        {drop.status === "delivered" && (
                                            <div className="mt-3 space-y-2">
                                                {drop.proofImage ? (
                                                    <img
                                                        src={drop.proofImage}
                                                        alt={`Delivery proof ${drop.id}`}
                                                        className="w-full max-w-xs h-40 object-cover rounded-lg border border-gray-200"
                                                    />
                                                ) : (
                                                    <p className="text-xs text-rose-700">Missing delivery image.</p>
                                                )}
                                                <p className="text-xs text-slate-600">Proof location: {drop.proofLocation || "Missing"}</p>
                                                {typeof drop.proofLat === "number" && typeof drop.proofLng === "number" && (
                                                    <p className="text-[11px] text-slate-500">
                                                        Lat: {drop.proofLat.toFixed(6)} | Lng: {drop.proofLng.toFixed(6)}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {drop.status === "failed" && (
                                            <p className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                                                Failure reason: {drop.failureReason || "No reason provided"}
                                            </p>
                                        )}

                                        {drop.reviewedAt ? (
                                            <p className="mt-3 text-xs font-semibold text-emerald-700">Reviewed and verified.</p>
                                        ) : stopNeedsReview(drop) && user?.id ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void verifyDropReview(selectedTrip.id, drop.id, user.id);
                                                }}
                                                className="mt-3 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                            >
                                                {drop.status === "delivered" ? "Verify Delivery Image" : "Review Failed Stop"}
                                            </button>
                                        ) : drop.status === "pending" ? (
                                            <p className="mt-3 text-xs text-amber-700">Waiting for driver action.</p>
                                        ) : (
                                            <p className="mt-3 text-xs text-rose-700">Missing required proof.</p>
                                        )}
                                    </article>
                                ))}
                            </section>

                            <section className="border-t border-gray-100 pt-4">
                                {selectedStats.readyForCompletion ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void updateTripStatus(selectedTrip.id, "completed");
                                        }}
                                        className="w-full px-3 py-3 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                                    >
                                        Mark Trip Completed
                                    </button>
                                ) : (
                                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                        <p className="text-xs font-semibold text-slate-700">Completion locked</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Completion unlocks only after all stops are resolved, start proof is verified, and each delivery/failure is reviewed.
                                        </p>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </aside>
            </section>
        </div>
    );
}
