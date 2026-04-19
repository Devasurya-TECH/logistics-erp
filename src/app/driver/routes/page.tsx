"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import RouteMap from "@/components/maps/RouteMap";
import TripStartProofModal from "@/components/driver/TripStartProofModal";
import { calculateTotalDistance, optimizeRoute } from "@/lib/utils/optimizer";
import type { DropPoint, Trip } from "@/lib/types";

type RouteMode = "optimized" | "original";
type ProofTarget = {
    tripId: string;
    dropId: string;
    customerName: string;
    address: string;
};

function getCurrentPosition() {
    return new Promise<GeolocationPosition>((resolve, reject) => {
        if (typeof window === "undefined" || !navigator.geolocation) {
            reject(new Error("Geolocation unavailable"));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 30000,
        });
    });
}

async function reverseGeocode(lat: number, lng: number) {
    try {
        const params = new URLSearchParams({
            format: "json",
            lat: String(lat),
            lon: String(lng),
            zoom: "17",
            addressdetails: "1",
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
            headers: {
                Accept: "application/json",
                "User-Agent": "LogisticsERP/1.0",
            },
        });
        if (!response.ok) return "";
        const data = await response.json();
        return String(data?.display_name || "").trim();
    } catch {
        return "";
    }
}

function statusClass(status: string) {
    if (status === "delivered") return "bg-emerald-100 text-emerald-700";
    if (status === "failed") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-700";
}

export default function DriverRoutesPage() {
    const { user } = useAuth();
    const { trips, drivers, acceptTrip, updateDropStatus, registerDriverActivity, endDriverBreak } = useStore();
    const me = drivers.find((driver) => driver.id === user?.id);
    const onBreak = Boolean(me?.onBreak);
    const dayStarted = me?.dutyStatus === "on-duty";

    const activeTrips = useMemo(
        () =>
            trips.filter(
                (trip) =>
                    trip.driverId === user?.id &&
                    (trip.status === "assigned" || trip.status === "in-progress"),
            ),
        [trips, user?.id],
    );

    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [routeMode, setRouteMode] = useState<RouteMode>("optimized");
    const [failureReasonByDrop, setFailureReasonByDrop] = useState<Record<string, string>>({});
    const [startProofTripId, setStartProofTripId] = useState<string | null>(null);

    const [proofTarget, setProofTarget] = useState<ProofTarget | null>(null);
    const [proofImage, setProofImage] = useState("");
    const [proofNotes, setProofNotes] = useState("");
    const [proofLocation, setProofLocation] = useState("");
    const [proofLat, setProofLat] = useState<number | null>(null);
    const [proofLng, setProofLng] = useState<number | null>(null);
    const [proofError, setProofError] = useState("");
    const [proofLocating, setProofLocating] = useState(false);
    const [proofSubmitting, setProofSubmitting] = useState(false);

    const resolvedTripId =
        selectedTripId && activeTrips.some((trip) => trip.id === selectedTripId)
            ? selectedTripId
            : activeTrips[0]?.id || null;
    const activeTrip = activeTrips.find((trip) => trip.id === resolvedTripId) || null;

    useEffect(() => {
        if (!selectedTripId && activeTrips[0]?.id) {
            setSelectedTripId(activeTrips[0].id);
        }
    }, [activeTrips, selectedTripId]);

    const originalRouteDrops = useMemo(() => {
        if (!activeTrip) return [];
        return [...activeTrip.drops];
    }, [activeTrip]);

    const optimizedRouteDrops = useMemo(() => {
        if (!activeTrip) return [];
        const clonedDrops: DropPoint[] = activeTrip.drops.map((drop) => ({ ...drop }));
        return optimizeRoute(
            { lat: activeTrip.startLocation.lat, lng: activeTrip.startLocation.lng },
            clonedDrops,
        );
    }, [activeTrip]);

    const selectedRouteDrops = routeMode === "optimized" ? optimizedRouteDrops : originalRouteDrops;
    const selectedRouteDistance = activeTrip
        ? calculateTotalDistance(
              { lat: activeTrip.startLocation.lat, lng: activeTrip.startLocation.lng },
              selectedRouteDrops,
          )
        : 0;

    const mapTrip: Trip | null =
        activeTrip &&
        selectedRouteDrops.length > 0
            ? {
                  ...activeTrip,
                  drops: selectedRouteDrops,
                  estimatedDistance: selectedRouteDistance,
              }
            : null;

    const completedCount = activeTrip
        ? activeTrip.drops.filter((drop) => drop.status === "delivered" || drop.status === "failed").length
        : 0;
    const pendingCount = activeTrip
        ? activeTrip.drops.filter((drop) => drop.status === "pending").length
        : 0;
    const progressPct = activeTrip && activeTrip.drops.length > 0 ? Math.round((completedCount / activeTrip.drops.length) * 100) : 0;

    const captureProofLocation = async () => {
        setProofLocating(true);
        setProofError("");
        try {
            const position = await getCurrentPosition();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setProofLat(lat);
            setProofLng(lng);
            const locationText = await reverseGeocode(lat, lng);
            setProofLocation(locationText || `Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`);
        } catch {
            setProofError("Unable to fetch location. Enable location permission and retry.");
        } finally {
            setProofLocating(false);
        }
    };

    const openProof = (target: ProofTarget) => {
        setProofTarget(target);
        setProofImage("");
        setProofNotes("");
        setProofLocation("");
        setProofLat(null);
        setProofLng(null);
        setProofError("");
        void captureProofLocation();
    };

    const closeProof = () => {
        setProofTarget(null);
        setProofImage("");
        setProofNotes("");
        setProofLocation("");
        setProofLat(null);
        setProofLng(null);
        setProofError("");
        setProofSubmitting(false);
    };

    const submitProof = async () => {
        if (!proofTarget || !user) return;
        if (!proofImage) {
            setProofError("Photo proof is required.");
            return;
        }
        if (proofLat === null || proofLng === null || !proofLocation.trim()) {
            setProofError("Location is required. Capture current location and retry.");
            return;
        }

        setProofSubmitting(true);
        setProofError("");

        try {
            await updateDropStatus(proofTarget.tripId, proofTarget.dropId, "delivered", {
                proofImage,
                proofCapturedAt: new Date().toISOString(),
                proofLat,
                proofLng,
                proofLocation: proofLocation.trim(),
                notes: proofNotes.trim() || undefined,
            });
            await registerDriverActivity(user.id);
            closeProof();
        } catch (error) {
            setProofError(
                error instanceof Error
                    ? error.message
                    : "Unable to submit proof right now. Please retry."
            );
        } finally {
            setProofSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 pb-4">
            <section className="bg-white border border-gray-200 rounded-xl p-4">
                <h2 className="text-lg font-bold text-slate-900">Route Center</h2>
                <p className="text-xs text-slate-500 mt-1">
                    Live trips assigned to your driver login. Updates sync automatically.
                </p>
            </section>

            {onBreak && me && (
                <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-amber-900">Break is active</p>
                        <p className="text-xs text-amber-700 mt-1">
                            Route actions are locked during break. End break first to continue trip operations.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            void endDriverBreak(me.id);
                        }}
                        className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
                    >
                        End Break
                    </button>
                </section>
            )}

            {activeTrips.length === 0 && (
                <article className="bg-white border border-gray-200 rounded-xl p-6">
                    <p className="text-slate-700 font-semibold">No active trip assigned.</p>
                    <p className="text-sm text-slate-500 mt-1">
                        Ask supervisor to assign a trip. This screen auto-refreshes every few seconds.
                    </p>
                </article>
            )}

            {activeTrips.length > 0 && (
                <>
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

                    {activeTrip && (
                        <>
                            <section className="grid gap-3 sm:grid-cols-4">
                                <article className="bg-white border border-gray-200 rounded-xl p-3">
                                    <p className="text-xs text-slate-500">Trip Status</p>
                                    <p className="text-xl font-bold text-blue-700 mt-1 capitalize">{activeTrip.status}</p>
                                </article>
                                <article className="bg-white border border-gray-200 rounded-xl p-3">
                                    <p className="text-xs text-slate-500">Stops Pending</p>
                                    <p className="text-xl font-bold text-amber-700 mt-1">{pendingCount}</p>
                                </article>
                                <article className="bg-white border border-gray-200 rounded-xl p-3">
                                    <p className="text-xs text-slate-500">Progress</p>
                                    <p className="text-xl font-bold text-emerald-700 mt-1">{progressPct}%</p>
                                </article>
                                <article className="bg-white border border-gray-200 rounded-xl p-3">
                                    <p className="text-xs text-slate-500">Selected Distance</p>
                                    <p className="text-xl font-bold text-slate-800 mt-1">{selectedRouteDistance.toFixed(1)} km</p>
                                </article>
                            </section>

                            <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">Navigation</h3>
                                        <p className="text-xs text-slate-500 mt-1">{activeTrip.startLocation.address}</p>
                                    </div>
                                    {activeTrip.status === "assigned" && (
                                        <button
                                            type="button"
                                            disabled={onBreak || !dayStarted}
                                            onClick={() => {
                                                setStartProofTripId(activeTrip.id);
                                            }}
                                            className="px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Start Trip
                                        </button>
                                    )}
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        disabled={onBreak}
                                        onClick={() => setRouteMode("optimized")}
                                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                                            routeMode === "optimized"
                                                ? "bg-emerald-600 text-white"
                                                : "bg-white border border-gray-200 text-slate-700"
                                        } ${onBreak ? "opacity-50 cursor-not-allowed" : ""}`}
                                    >
                                        Optimized Route
                                    </button>
                                    <button
                                        type="button"
                                        disabled={onBreak}
                                        onClick={() => setRouteMode("original")}
                                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                                            routeMode === "original"
                                                ? "bg-blue-600 text-white"
                                                : "bg-white border border-gray-200 text-slate-700"
                                        } ${onBreak ? "opacity-50 cursor-not-allowed" : ""}`}
                                    >
                                        Original Route
                                    </button>
                                </div>

                                {mapTrip && <RouteMap trip={mapTrip} />}
                            </section>

                            <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                                <h3 className="text-sm font-semibold text-slate-900">Stop Actions</h3>
                                {!dayStarted && (
                                    <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                                        Start your day from the driver overview before starting a trip.
                                    </p>
                                )}
                                {activeTrip.status !== "in-progress" && (
                                    <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                        Start the trip with odometer/fuel proof before completing stops.
                                    </p>
                                )}
                                {activeTrip.status === "in-progress" &&
                                    activeTrip.drops.every((drop) => drop.status === "delivered" || drop.status === "failed") && (
                                        <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                            All stops are submitted. Waiting for supervisor proof verification and final completion.
                                        </p>
                                    )}
                                <div className="space-y-3">
                                    {activeTrip.drops.map((drop, index) => {
                                        const failureReason = failureReasonByDrop[drop.id] || "";
                                        return (
                                            <article key={drop.id} className="border border-gray-200 rounded-lg p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            Stop {index + 1}: {drop.customerName}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-1">{drop.address}</p>
                                                    </div>
                                                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${statusClass(drop.status)}`}>
                                                        {drop.status}
                                                    </span>
                                                </div>

                                                {drop.status === "pending" && (
                                                    <div className="mt-3 space-y-2">
                                                        <button
                                                            type="button"
                                                            disabled={onBreak || !dayStarted || activeTrip.status !== "in-progress"}
                                                            onClick={() =>
                                                                openProof({
                                                                    tripId: activeTrip.id,
                                                                    dropId: drop.id,
                                                                    customerName: drop.customerName,
                                                                    address: drop.address,
                                                                })
                                                            }
                                                            className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Upload Proof & Mark Delivered
                                                        </button>

                                                        <input
                                                            disabled={onBreak || !dayStarted || activeTrip.status !== "in-progress"}
                                                            value={failureReason}
                                                            onChange={(event) =>
                                                                setFailureReasonByDrop((prev) => ({
                                                                    ...prev,
                                                                    [drop.id]: event.target.value,
                                                                }))
                                                            }
                                                            placeholder="Failure reason (for failed delivery)"
                                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={onBreak || !dayStarted || activeTrip.status !== "in-progress"}
                                                            onClick={() => {
                                                                void updateDropStatus(activeTrip.id, drop.id, "failed", {
                                                                    failureReason: failureReason.trim() || "Delivery failed",
                                                                });
                                                                if (user?.id) void registerDriverActivity(user.id);
                                                            }}
                                                            className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Mark Failed
                                                        </button>
                                                    </div>
                                                )}

                                                {drop.proofImage && (
                                                    <img
                                                        src={drop.proofImage}
                                                        alt={`Proof ${drop.id}`}
                                                        className="mt-3 w-full max-w-[240px] h-32 object-cover rounded-lg border border-gray-200"
                                                    />
                                                )}
                                                {drop.proofLocation && (
                                                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                                                        Proof location: {drop.proofLocation}
                                                    </p>
                                                )}
                                                {drop.failureReason && (
                                                    <p className="mt-2 text-xs font-semibold text-rose-700">
                                                        Reason: {drop.failureReason}
                                                    </p>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        </>
                    )}
                </>
            )}

            {startProofTripId && (
                <TripStartProofModal
                    tripId={startProofTripId}
                    onClose={() => setStartProofTripId(null)}
                    onSubmit={async (proof) => {
                        await acceptTrip(startProofTripId, proof);
                        if (user?.id) await registerDriverActivity(user.id);
                    }}
                />
            )}

            {proofTarget && (
                <div className="fixed inset-0 z-50 bg-black/35 p-4 flex items-center justify-center">
                    <article className="w-full max-w-xl rounded-xl bg-white border border-gray-200 p-4">
                        <h3 className="text-lg font-bold text-slate-900">Delivery Proof</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {proofTarget.customerName} • {proofTarget.address}
                        </p>

                        <div className="mt-3 space-y-3">
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Photo Proof</label>
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
                                            setProofImage(image);
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                    className="block w-full text-xs text-slate-600 file:mr-3 file:px-3 file:py-2 file:border-0 file:rounded-lg file:bg-emerald-600 file:text-white file:text-xs file:font-semibold hover:file:bg-emerald-700"
                                />
                                {proofImage && (
                                    <img
                                        src={proofImage}
                                        alt="Proof preview"
                                        className="mt-2 w-56 h-36 object-cover rounded-lg border border-gray-200"
                                    />
                                )}
                            </div>

                            <div className="border border-gray-200 rounded-lg p-3 bg-slate-50">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-700">Location</p>
                                    <button
                                        type="button"
                                        disabled={proofLocating}
                                        onClick={() => {
                                            void captureProofLocation();
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {proofLocating ? "Fetching..." : "Use Current Location"}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-600 mt-2">
                                    {proofLocation || "No location captured yet."}
                                </p>
                                {proofLat !== null && proofLng !== null && (
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Lat: {proofLat.toFixed(6)} | Lng: {proofLng.toFixed(6)}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Notes (optional)</label>
                                <textarea
                                    value={proofNotes}
                                    onChange={(event) => setProofNotes(event.target.value)}
                                    rows={2}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    placeholder="Receiver details, remarks, etc."
                                />
                            </div>

                            {proofError && <p className="text-xs font-semibold text-rose-700">{proofError}</p>}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeProof}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void submitProof();
                                }}
                                disabled={proofSubmitting}
                                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {proofSubmitting ? "Submitting..." : "Submit & Complete Stop"}
                            </button>
                        </div>
                    </article>
                </div>
            )}
        </div>
    );
}
