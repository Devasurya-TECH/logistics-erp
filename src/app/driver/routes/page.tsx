"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import RouteMap from "@/components/maps/RouteMap";
import { calculateTotalDistance, estimateTime, optimizeRoute } from "@/lib/utils/optimizer";
import type { DropPoint, Trip } from "@/lib/types";
import { buildDriverMediaPath, uploadDriverMedia } from "@/lib/media";
import {
    ArrowTopRightOnSquareIcon,
    ExclamationTriangleIcon,
    MapPinIcon,
} from "@heroicons/react/24/outline";

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

function getNavUrl(trip: Trip, currentDrop?: DropPoint | null) {
    const destinationDrop = currentDrop || trip.drops[trip.drops.length - 1];
    if (!destinationDrop) return "#";
    return `https://www.google.com/maps/dir/?api=1&destination=${destinationDrop.lat},${destinationDrop.lng}&travelmode=driving&dir_action=navigate`;
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
                    trip.status !== "completed" &&
                    trip.status !== "cancelled",
            ),
        [trips, user?.id],
    );

    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [routeMode, setRouteMode] = useState<RouteMode>("optimized");
    const [failureReasonByDrop, setFailureReasonByDrop] = useState<Record<string, string>>({});
    const [proofTarget, setProofTarget] = useState<ProofTarget | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);
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

    useEffect(() => {
        if (!proofFile) {
            setProofImage("");
            return;
        }

        const objectUrl = URL.createObjectURL(proofFile);
        setProofImage(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [proofFile]);

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

    const pendingDrops = selectedRouteDrops.filter((drop) => drop.status === "pending");
    const nextStop = pendingDrops[0] || null;
    const nextStopDistance = pendingDrops.length > 0 ? Math.max(0.4, Number((selectedRouteDistance / pendingDrops.length).toFixed(1))) : 0;
    const nextStopEta = estimateTime(nextStopDistance);
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
        setProofFile(null);
        setProofNotes("");
        setProofLocation("");
        setProofLat(null);
        setProofLng(null);
        setProofError("");
        void captureProofLocation();
    };

    const closeProof = () => {
        setProofTarget(null);
        setProofFile(null);
        setProofNotes("");
        setProofLocation("");
        setProofLat(null);
        setProofLng(null);
        setProofError("");
        setProofSubmitting(false);
    };

    const submitProof = async () => {
        if (!proofTarget || !user) return;
        if (!proofFile) {
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
            const upload = await uploadDriverMedia({
                file: proofFile,
                objectPath: buildDriverMediaPath({
                    driverId: user.id,
                    tripId: proofTarget.tripId,
                    dropId: proofTarget.dropId,
                    kind: "delivery-proof",
                }),
            });
            await updateDropStatus(proofTarget.tripId, proofTarget.dropId, "delivered", {
                proofImage: upload.signedUrl,
                proofImagePath: upload.objectPath,
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
                    : "Unable to submit proof right now. Please retry.",
            );
        } finally {
            setProofSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 pb-4">
            <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Current Route</p>
                        <h2 className="mt-1 text-lg font-black text-slate-900">
                            {activeTrip ? `Trip #${activeTrip.id.toUpperCase()}` : "Route Center"}
                        </h2>
                    </div>
                    {activeTrip && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {pendingCount} left
                        </span>
                    )}
                </div>
            </section>

            {onBreak && me && (
                <section className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] bg-amber-50 p-4 shadow-sm ring-1 ring-amber-200">
                    <div>
                        <p className="text-sm font-semibold text-amber-900">Break is active</p>
                        <p className="mt-1 text-xs text-amber-700">
                            Route actions are locked during break. End break first to continue trip operations.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            void endDriverBreak(me.id);
                        }}
                        className="min-h-12 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
                    >
                        End Break
                    </button>
                </section>
            )}

            {activeTrips.length === 0 && (
                <article className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
                    <p className="text-slate-700 font-semibold">No active trip assigned.</p>
                    <p className="mt-1 text-sm text-slate-500">
                        Ask supervisor to assign a trip. This screen auto-refreshes automatically.
                    </p>
                </article>
            )}

            {activeTrips.length > 0 && activeTrip && (
                <>
                    <section className="flex flex-wrap gap-2">
                        {activeTrips.map((trip) => (
                            <button
                                key={trip.id}
                                type="button"
                                onClick={() => setSelectedTripId(trip.id)}
                                className={`min-h-12 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                                    activeTrip.id === trip.id
                                        ? "bg-slate-900 text-white"
                                        : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
                                }`}
                            >
                                Trip #{trip.id.toUpperCase()}
                            </button>
                        ))}
                    </section>

                    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
                        <div className="space-y-4">
                            <RouteMap trip={mapTrip || activeTrip} />

                            <section className="grid grid-cols-3 gap-3">
                                <article className="rounded-[24px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Progress</p>
                                    <p className="mt-2 text-2xl font-black text-slate-900">{progressPct}%</p>
                                </article>
                                <article className="rounded-[24px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Pending</p>
                                    <p className="mt-2 text-2xl font-black text-amber-700">{pendingCount}</p>
                                </article>
                                <article className="rounded-[24px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Distance</p>
                                    <p className="mt-2 text-2xl font-black text-slate-900">{selectedRouteDistance.toFixed(1)} km</p>
                                </article>
                            </section>
                        </div>

                        <div className="space-y-4">
                            <section className="rounded-[28px] bg-slate-900 px-5 py-5 text-white shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-100">
                                            Next Stop
                                        </p>
                                        <h3 className="mt-4 text-2xl font-black leading-tight">
                                            {nextStop ? nextStop.customerName : "All stops completed"}
                                        </h3>
                                        <p className="mt-2 text-sm font-medium text-slate-300">
                                            {nextStop?.address || "Waiting for supervisor review."}
                                        </p>
                                    </div>
                                    {nextStop && (
                                        <span className="rounded-2xl bg-white/10 px-3 py-2 text-right text-xs font-bold text-white">
                                            {nextStopDistance.toFixed(1)} km
                                        </span>
                                    )}
                                </div>

                                {nextStop && (
                                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
                                        <span className="rounded-full bg-white/10 px-3 py-1">ETA {nextStopEta}</span>
                                        {nextStop.priority && (
                                            <span className="rounded-full bg-amber-400/15 px-3 py-1 text-amber-200">
                                                {nextStop.priority} priority
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="mt-5 space-y-3">
                                    {activeTrip.status !== "in-progress" ? (
                                        <button
                                            type="button"
                                            disabled={onBreak || !dayStarted}
                                            onClick={() => {
                                                void acceptTrip(activeTrip.id);
                                                if (user?.id) {
                                                    void registerDriverActivity(user.id);
                                                }
                                            }}
                                            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-white px-4 py-4 text-base font-black text-slate-900 disabled:opacity-50"
                                        >
                                            Start Delivery
                                        </button>
                                    ) : (
                                        <a
                                            href={getNavUrl(activeTrip, nextStop)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-base font-black text-slate-900"
                                        >
                                            <MapPinIcon className="h-5 w-5" />
                                            Start Delivery
                                        </a>
                                    )}

                                    <a
                                        href={getNavUrl(activeTrip, nextStop)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/15"
                                    >
                                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                        Open in Map
                                    </a>
                                </div>
                            </section>

                            <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Stops</p>
                                        <h3 className="mt-1 text-lg font-black text-slate-900">{pendingCount} remaining</h3>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1">
                                        <button
                                            type="button"
                                            disabled={onBreak}
                                            onClick={() => setRouteMode("optimized")}
                                            className={`min-h-10 rounded-2xl px-3 text-xs font-bold ${
                                                routeMode === "optimized" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                                            }`}
                                        >
                                            Optimized
                                        </button>
                                        <button
                                            type="button"
                                            disabled={onBreak}
                                            onClick={() => setRouteMode("original")}
                                            className={`min-h-10 rounded-2xl px-3 text-xs font-bold ${
                                                routeMode === "original" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                                            }`}
                                        >
                                            Original
                                        </button>
                                    </div>
                                </div>

                                {activeTrip.status === "in-progress" &&
                                    activeTrip.drops.every((drop) => drop.status === "delivered" || drop.status === "failed") && (
                                        <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                                            All stops are submitted. Waiting for supervisor stop-proof verification and final completion.
                                        </div>
                                    )}

                                {!dayStarted && (
                                    <div className="mb-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-200">
                                        Start your day from the driver dashboard before starting a trip.
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {selectedRouteDrops.map((drop, index) => {
                                        const failureReason = failureReasonByDrop[drop.id] || "";
                                        const isNext = nextStop?.id === drop.id;

                                        return (
                                            <article
                                                key={drop.id}
                                                className={`rounded-[24px] p-4 shadow-sm ring-1 ${
                                                    isNext
                                                        ? "bg-slate-900 text-white ring-slate-900"
                                                        : "bg-white text-slate-900 ring-slate-200/70"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {isNext && (
                                                                <span className="rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                                                                    Next Stop
                                                                </span>
                                                            )}
                                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${isNext ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"}`}>
                                                                Stop {index + 1}
                                                            </span>
                                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(drop.status)}`}>
                                                                {drop.status}
                                                            </span>
                                                        </div>
                                                        <h4 className={`mt-3 text-lg font-black ${isNext ? "text-white" : "text-slate-900"}`}>
                                                            {drop.customerName}
                                                        </h4>
                                                        <p className={`mt-1 text-sm ${isNext ? "text-slate-300" : "text-slate-500"}`}>
                                                            {drop.address}
                                                        </p>
                                                        {drop.notes && (
                                                            <p className={`mt-2 text-xs font-semibold ${isNext ? "text-slate-300" : "text-slate-500"}`}>
                                                                {drop.notes}
                                                            </p>
                                                        )}
                                                        {drop.failureReason && (
                                                            <p className="mt-2 text-sm font-semibold text-rose-300">
                                                                {drop.failureReason}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {drop.status === "pending" && (
                                                        <span className={`rounded-2xl px-3 py-2 text-xs font-bold ${isNext ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"}`}>
                                                            {(index === 0 ? nextStopDistance : Math.max(0.6, nextStopDistance + index * 0.8)).toFixed(1)} km
                                                        </span>
                                                    )}
                                                </div>

                                                {drop.status === "pending" && (
                                                    <div className="mt-4 space-y-3">
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
                                                            className={`flex min-h-12 w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-black ${
                                                                isNext
                                                                    ? "bg-white text-slate-900"
                                                                    : "bg-emerald-600 text-white"
                                                            } disabled:opacity-50`}
                                                        >
                                                            Deliver
                                                        </button>

                                                        <div className="space-y-2">
                                                            <input
                                                                disabled={onBreak || !dayStarted || activeTrip.status !== "in-progress"}
                                                                value={failureReason}
                                                                onChange={(event) =>
                                                                    setFailureReasonByDrop((prev) => ({
                                                                        ...prev,
                                                                        [drop.id]: event.target.value,
                                                                    }))
                                                                }
                                                                placeholder="Failure reason"
                                                                className={`w-full rounded-2xl px-4 py-3 text-sm outline-none ring-1 ${
                                                                    isNext
                                                                        ? "bg-white/10 text-white placeholder:text-slate-400 ring-white/10"
                                                                        : "bg-slate-50 text-slate-900 placeholder:text-slate-400 ring-slate-200"
                                                                } disabled:opacity-50`}
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
                                                                className={`flex min-h-12 w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold ${
                                                                    isNext
                                                                        ? "bg-transparent text-white ring-1 ring-white/25"
                                                                        : "bg-white text-rose-700 ring-1 ring-rose-200"
                                                                } disabled:opacity-50`}
                                                            >
                                                                <ExclamationTriangleIcon className="mr-2 h-4 w-4" />
                                                                Fail
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {drop.proofImage && (
                                                    <img
                                                        src={drop.proofImage}
                                                        alt={`Proof ${drop.id}`}
                                                        className="mt-4 h-36 w-full rounded-2xl object-cover ring-1 ring-slate-200/70"
                                                    />
                                                )}
                                                {drop.proofLocation && (
                                                    <p className={`mt-3 text-xs font-semibold ${isNext ? "text-emerald-200" : "text-emerald-700"}`}>
                                                        Proof location: {drop.proofLocation}
                                                    </p>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </section>
                </>
            )}

            {proofTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
                    <article className="w-full max-w-xl rounded-[28px] bg-white p-5 shadow-xl ring-1 ring-slate-200">
                        <h3 className="text-lg font-black text-slate-900">Delivery Proof</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {proofTarget.customerName} • {proofTarget.address}
                        </p>

                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Photo Proof</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (!file) return;
                                        setProofFile(file);
                                    }}
                                    className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-2xl file:border-0 file:bg-emerald-600 file:px-4 file:py-3 file:text-xs file:font-bold file:text-white hover:file:bg-emerald-700"
                                />
                                {proofImage && (
                                    <img
                                        src={proofImage}
                                        alt="Proof preview"
                                        className="mt-3 h-40 w-full rounded-2xl object-cover ring-1 ring-slate-200/70"
                                    />
                                )}
                            </div>

                            <div className="rounded-[24px] bg-slate-100/90 p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Location</p>
                                    <button
                                        type="button"
                                        disabled={proofLocating}
                                        onClick={() => {
                                            void captureProofLocation();
                                        }}
                                        className="min-h-10 rounded-2xl bg-blue-600 px-3 text-xs font-bold text-white disabled:opacity-50"
                                    >
                                        {proofLocating ? "Fetching..." : "Use Current Location"}
                                    </button>
                                </div>
                                <p className="mt-3 text-sm font-medium text-slate-600">
                                    {proofLocation || "No location captured yet."}
                                </p>
                                {proofLat !== null && proofLng !== null && (
                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                        Lat: {proofLat.toFixed(6)} | Lng: {proofLng.toFixed(6)}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Notes</label>
                                <textarea
                                    value={proofNotes}
                                    onChange={(event) => setProofNotes(event.target.value)}
                                    rows={2}
                                    className="w-full rounded-[24px] border-0 bg-slate-100/90 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200"
                                    placeholder="Receiver details, remarks, etc."
                                />
                            </div>

                            {proofError && <p className="text-sm font-semibold text-rose-700">{proofError}</p>}
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={closeProof}
                                className="min-h-12 flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void submitProof();
                                }}
                                disabled={proofSubmitting}
                                className="min-h-12 flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
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
