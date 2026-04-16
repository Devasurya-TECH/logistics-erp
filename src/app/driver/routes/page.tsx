"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import RouteMap from "@/components/maps/RouteMap";
import { calculateTotalDistance, optimizeRoute } from "@/lib/utils/optimizer";
import type { DropPoint, Trip } from "@/lib/types";

export default function DriverRoutesPage() {
    const { user } = useAuth();
    const { trips, acceptTrip, updateDropStatus } = useStore();

    const myActiveTrips = useMemo(
        () =>
            trips.filter(
                (trip) =>
                    trip.driverId === user?.id &&
                    (trip.status === "assigned" || trip.status === "in-progress"),
            ),
        [trips, user?.id],
    );
    const fleetActiveTrips = useMemo(
        () => trips.filter((trip) => trip.status === "assigned" || trip.status === "in-progress"),
        [trips],
    );
    const activeTrips = myActiveTrips.length > 0 ? myActiveTrips : fleetActiveTrips;
    const isFallbackView = myActiveTrips.length === 0 && fleetActiveTrips.length > 0;

    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [proofByDrop, setProofByDrop] = useState<Record<string, string>>({});
    const [failureReasonByDrop, setFailureReasonByDrop] = useState<Record<string, string>>({});
    const [routeMode, setRouteMode] = useState<"optimized" | "original">("optimized");

    const resolvedTripId =
        selectedTripId && activeTrips.some((trip) => trip.id === selectedTripId)
            ? selectedTripId
            : activeTrips[0]?.id || null;

    const activeTrip = activeTrips.find((trip) => trip.id === resolvedTripId) || null;

    const completedCount = activeTrip
        ? activeTrip.drops.filter((drop) => drop.status === "delivered" || drop.status === "failed").length
        : 0;

    const originalRouteDrops = useMemo(() => {
        if (!activeTrip) return [];
        return [...activeTrip.drops];
    }, [activeTrip]);

    const optimizedRouteDrops = useMemo(() => {
        if (!activeTrip) return [];
        const sourceDrops: DropPoint[] = activeTrip.drops.map((drop) => ({ ...drop }));
        return optimizeRoute(
            { lat: activeTrip.startLocation.lat, lng: activeTrip.startLocation.lng },
            sourceDrops,
        );
    }, [activeTrip]);

    const selectedRouteDrops = routeMode === "optimized" ? optimizedRouteDrops : originalRouteDrops;
    const selectedRouteDistance = activeTrip
        ? calculateTotalDistance(
            { lat: activeTrip.startLocation.lat, lng: activeTrip.startLocation.lng },
            selectedRouteDrops,
        )
        : 0;

    const selectedRouteTrip: Trip | null = activeTrip
        ? {
            ...activeTrip,
            drops: selectedRouteDrops,
            estimatedDistance: selectedRouteDistance,
        }
        : null;

    return (
        <div className="space-y-4">
            {isFallbackView && (
                <article className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-800">
                        No active trip is currently assigned to this driver login. Showing live assigned routes for operational visibility.
                    </p>
                </article>
            )}
            <section className="flex flex-wrap gap-2">
                {activeTrips.map((trip) => (
                    <button
                        key={trip.id}
                        type="button"
                        onClick={() => setSelectedTripId(trip.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                            activeTrip?.id === trip.id
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-gray-200 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        Trip #{trip.id.toUpperCase()}
                    </button>
                ))}
            </section>

            {!activeTrip && (
                <article className="bg-white border border-gray-200 rounded-xl p-6">
                    <p className="text-slate-600">No active trip route available.</p>
                </article>
            )}

            {activeTrip && (
                <div className="space-y-4">
                    <article className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Trip #{activeTrip.id.toUpperCase()} Route</h3>
                                <p className="text-sm text-slate-500 mt-1">{activeTrip.startLocation.address}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                    {completedCount}/{activeTrip.drops.length} stops done
                                </span>
                                {activeTrip.status === "assigned" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void acceptTrip(activeTrip.id);
                                        }}
                                        className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        Start Trip
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => setRouteMode("optimized")}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                                    routeMode === "optimized"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-white border border-gray-200 text-slate-700"
                                }`}
                            >
                                Optimized Route (Recommended)
                            </button>
                            <button
                                type="button"
                                onClick={() => setRouteMode("original")}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                                    routeMode === "original"
                                        ? "bg-blue-600 text-white"
                                        : "bg-white border border-gray-200 text-slate-700"
                                }`}
                            >
                                Original Route
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                                Selected Distance: {selectedRouteDistance.toFixed(1)} km
                            </span>
                            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                                Stops: {selectedRouteDrops.length}
                            </span>
                        </div>

                        {selectedRouteTrip && <RouteMap trip={selectedRouteTrip} />}

                        <button
                            type="button"
                            onClick={() => {
                                if (!selectedRouteDrops.length) return;
                                const destination = selectedRouteDrops[selectedRouteDrops.length - 1];
                                const waypoints = selectedRouteDrops
                                    .slice(0, -1)
                                    .map((drop) => `${drop.lat},${drop.lng}`)
                                    .join("|");
                                const waypointSegment = waypoints ? `&waypoints=${waypoints}` : "";
                                const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}${waypointSegment}&travelmode=driving&dir_action=navigate`;
                                window.open(url, "_blank");
                            }}
                            className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                        >
                            Start Navigation In Google Maps
                        </button>
                    </article>

                    <article className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900">Stops & Proof Upload</h4>
                        <div className="space-y-3">
                            {selectedRouteDrops.map((drop, index) => {
                                const proofImage = proofByDrop[drop.id] || drop.proofImage;
                                const failedReason = failureReasonByDrop[drop.id] || drop.failureReason || "";

                                return (
                                    <div key={drop.id} className="border border-gray-200 rounded-lg p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    Stop {index + 1}: {drop.customerName}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">{drop.address}</p>
                                            </div>
                                            <span
                                                className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                                                    drop.status === "delivered"
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : drop.status === "failed"
                                                            ? "bg-rose-100 text-rose-700"
                                                            : "bg-amber-100 text-amber-700"
                                                }`}
                                            >
                                                {drop.status}
                                            </span>
                                        </div>

                                        {(drop.status === "pending" || drop.status === "failed") && (
                                            <div className="mt-3 space-y-2">
                                                <label className="block text-xs font-semibold text-slate-600">
                                                    Upload Bill / Delivery Proof Photo
                                                </label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    onChange={(event) => {
                                                        const file = event.target.files?.[0];
                                                        if (!file) return;

                                                        const reader = new FileReader();
                                                        reader.onload = () => {
                                                            const image = typeof reader.result === "string" ? reader.result : "";
                                                            if (!image) return;
                                                            setProofByDrop((prev) => ({ ...prev, [drop.id]: image }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }}
                                                    className="block w-full text-xs text-slate-600 file:mr-3 file:px-3 file:py-2 file:border-0 file:rounded-lg file:bg-blue-600 file:text-white file:text-xs file:font-semibold hover:file:bg-blue-700"
                                                />

                                                {proofImage && (
                                                    <img
                                                        src={proofImage}
                                                        alt={`Proof for ${drop.customerName}`}
                                                        className="w-full max-w-[220px] h-32 object-cover rounded-lg border border-gray-200"
                                                    />
                                                )}

                                                <input
                                                    value={failedReason}
                                                    onChange={(event) =>
                                                        setFailureReasonByDrop((prev) => ({
                                                            ...prev,
                                                            [drop.id]: event.target.value,
                                                        }))
                                                    }
                                                    placeholder="Failure reason (if delivery fails)"
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                />

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={!proofImage}
                                                        onClick={() => {
                                                            void updateDropStatus(activeTrip.id, drop.id, "delivered", {
                                                                proofImage,
                                                            });
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Mark Delivered
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void updateDropStatus(activeTrip.id, drop.id, "failed", {
                                                                proofImage,
                                                                failureReason:
                                                                    failedReason.trim() || "Customer unavailable",
                                                            });
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
                                                    >
                                                        Mark Failed
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {drop.status !== "pending" && drop.proofImage && (
                                            <div className="mt-3">
                                                <p className="text-xs text-slate-500 mb-1">Uploaded proof:</p>
                                                <img
                                                    src={drop.proofImage}
                                                    alt={`Proof for ${drop.customerName}`}
                                                    className="w-full max-w-[220px] h-32 object-cover rounded-lg border border-gray-200"
                                                />
                                            </div>
                                        )}

                                        {drop.status === "failed" && drop.failureReason && (
                                            <p className="mt-2 text-xs text-rose-700">Reason: {drop.failureReason}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </article>
                </div>
            )}
        </div>
    );
}
