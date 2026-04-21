"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import TripStartProofModal from "@/components/driver/TripStartProofModal";
import type { FuelEntry } from "@/lib/types";
import { buildDriverMediaPath, fileToDataUrl, uploadDriverMedia } from "@/lib/media";
import {
    ArrowRightIcon,
    ArrowTopRightOnSquareIcon,
    MapPinIcon,
} from "@heroicons/react/24/outline";
import { estimateTime } from "@/lib/utils/optimizer";

type DriverTab = "overview" | "fuel";
type DeliveryProofTarget = {
    tripId: string;
    dropId: string;
    customerName: string;
    address: string;
};
type VehicleIssueType =
    | "engine-check"
    | "flat-tyre"
    | "brake-issue"
    | "battery-issue"
    | "accident"
    | "other";

const tabs: DriverTab[] = ["overview", "fuel"];
const issueOptions: { value: VehicleIssueType; label: string }[] = [
    { value: "engine-check", label: "Engine / Warning Light" },
    { value: "flat-tyre", label: "Flat Tyre" },
    { value: "brake-issue", label: "Brake Issue" },
    { value: "battery-issue", label: "Battery / Electrical" },
    { value: "accident", label: "Accident / Safety Risk" },
    { value: "other", label: "Other Issue" },
];

function tabLabel(tab: DriverTab) {
    if (tab === "overview") return "Overview";
    return "Fuel";
}

function statusClass(status: string) {
    if (status === "delivered") return "bg-emerald-100 text-emerald-700";
    if (status === "pending") return "bg-amber-100 text-amber-700";
    if (status === "failed") return "bg-rose-100 text-rose-700";
    return "bg-slate-100 text-slate-700";
}

function formatMinutes(totalMinutes: number) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours <= 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
}

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

export default function DriverDashboardPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const {
        trips,
        drivers,
        fuelEntries,
        isLoading: storeLoading,
        acceptTrip,
        updateDropStatus,
        triggerEmergency,
        addFuelEntry,
        toggleLiveStatus,
        startDriverDay,
        endDriverDay,
        startDriverBreak,
        endDriverBreak,
        registerDriverActivity,
    } = useStore();

    const selectedTabParam = searchParams.get("tab");
    const activeTab = tabs.includes(selectedTabParam as DriverTab)
        ? (selectedTabParam as DriverTab)
        : "overview";

    const me = drivers.find((driver) => driver.id === user?.id);
    const myTrips = useMemo(() => trips.filter((trip) => trip.driverId === user?.id), [trips, user?.id]);
    const activeTrips = myTrips.filter((trip) => trip.status !== "completed" && trip.status !== "cancelled");
    const completedTrips = myTrips
        .filter((trip) => trip.status === "completed")
        .sort((a, b) => (b.endTime || "").localeCompare(a.endTime || ""));

    const [selectedTripId, setSelectedTripId] = useState<string | null>(activeTrips[0]?.id || null);
    const activeTrip = activeTrips.find((trip) => trip.id === selectedTripId) || activeTrips[0] || null;
    const [showStartDayProof, setShowStartDayProof] = useState(false);
    const [endProofTripId, setEndProofTripId] = useState<string | null>(null);
    const [proofTarget, setProofTarget] = useState<DeliveryProofTarget | null>(null);
    const [deliveryProofFile, setDeliveryProofFile] = useState<File | null>(null);
    const [deliveryProofImage, setDeliveryProofImage] = useState("");
    const [deliveryProofNotes, setDeliveryProofNotes] = useState("");
    const [deliveryProofLocation, setDeliveryProofLocation] = useState("");
    const [deliveryProofLat, setDeliveryProofLat] = useState<number | null>(null);
    const [deliveryProofLng, setDeliveryProofLng] = useState<number | null>(null);
    const [deliveryProofError, setDeliveryProofError] = useState("");
    const [deliveryProofLoadingLocation, setDeliveryProofLoadingLocation] = useState(false);
    const [deliveryProofSubmitting, setDeliveryProofSubmitting] = useState(false);

    const [fuelAmount, setFuelAmount] = useState("20");
    const [fuelCost, setFuelCost] = useState("2200");
    const [fuelLocation, setFuelLocation] = useState("HP Fuel Station");
    const [fuelOdometer, setFuelOdometer] = useState("12000");
    const [fuelReceiptFile, setFuelReceiptFile] = useState<File | null>(null);
    const [fuelReceiptImage, setFuelReceiptImage] = useState("");

    const [showSosModal, setShowSosModal] = useState(false);
    const [sosIssueType, setSosIssueType] = useState<VehicleIssueType>("engine-check");
    const [sosDescription, setSosDescription] = useState("");
    const [sosEta, setSosEta] = useState("20");
    const [sosSevere, setSosSevere] = useState(false);
    const [sosInformSupervisor, setSosInformSupervisor] = useState(true);
    const [sosHolding, setSosHolding] = useState(false);

    const [nowTick, setNowTick] = useState(Date.now());
    const sosHoldTimerRef = useRef<number | null>(null);
    const tripDetailRef = useRef<HTMLDivElement | null>(null);

    const recentFuel = fuelEntries
        .filter((entry) => entry.driverId === user?.id)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 6);

    const canSubmitFuel = Boolean(activeTrip && user);
    const dayStarted = me?.dutyStatus === "on-duty";
    const onBreak = Boolean(me?.onBreak);
    const driverLockedByBreak = onBreak;
    const nextPendingDrop = activeTrip?.drops.find((drop) => drop.status === "pending");
    const totalStops = activeTrip?.drops.length || 0;
    const completedStops = activeTrip?.drops.filter((drop) => drop.status === "delivered" || drop.status === "failed").length || 0;
    const remainingStops = Math.max(0, totalStops - completedStops);
    const activeTripDone = Boolean(activeTrip && remainingStops === 0 && totalStops > 0);
    const progressPct = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;
    const remainingDistanceKm = activeTrip
        ? Number((((activeTrip.actualDistance || activeTrip.estimatedDistance) * (remainingStops || 1)) / Math.max(totalStops, 1)).toFixed(1))
        : 0;
    const remainingEta = estimateTime(Math.max(0, remainingDistanceKm));
    const nextStopDistance = remainingStops > 0 ? Math.max(0.4, Number((remainingDistanceKm / remainingStops).toFixed(1))) : 0;

    const currentBreakMinutes =
        me?.onBreak && me.breakStartedAt
            ? Math.max(0, Math.round((nowTick - new Date(me.breakStartedAt).getTime()) / 60000))
            : 0;
    const totalBreakMinutes = (me?.totalBreakMinutes || 0) + currentBreakMinutes;

    const primaryHeroLabel = !dayStarted
        ? "Start Day to Continue"
        : activeTrip?.status !== "in-progress"
            ? "Start Delivery"
            : "Navigate to Stop";
    const showBootSkeleton = storeLoading && !me && myTrips.length === 0;

    useEffect(() => {
        const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        return () => {
            if (sosHoldTimerRef.current) {
                window.clearTimeout(sosHoldTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!deliveryProofFile) {
            setDeliveryProofImage("");
            return;
        }

        const objectUrl = URL.createObjectURL(deliveryProofFile);
        setDeliveryProofImage(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [deliveryProofFile]);

    useEffect(() => {
        if (!fuelReceiptFile) {
            setFuelReceiptImage("");
            return;
        }

        const objectUrl = URL.createObjectURL(fuelReceiptFile);
        setFuelReceiptImage(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [fuelReceiptFile]);

    useEffect(() => {
        if (!me || me.isLive) return;
        void toggleLiveStatus(me.id, true);
    }, [me, toggleLiveStatus]);

    useEffect(() => {
        if (!me || !activeTrip || activeTrip.status !== "in-progress" || me.onBreak) return;
        const monitor = window.setInterval(() => {
            const lastActivity = me.lastActivityAt
                ? new Date(me.lastActivityAt).getTime()
                : Date.now();
            if (Date.now() - lastActivity >= 8 * 60 * 1000) {
                void startDriverBreak(me.id, false);
            }
        }, 30000);

        return () => window.clearInterval(monitor);
    }, [me, activeTrip, startDriverBreak]);

    const captureDeliveryLocation = async () => {
        setDeliveryProofLoadingLocation(true);
        setDeliveryProofError("");
        try {
            const position = await getCurrentPosition();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setDeliveryProofLat(lat);
            setDeliveryProofLng(lng);
            const resolvedAddress = await reverseGeocode(lat, lng);
            setDeliveryProofLocation(
                resolvedAddress ||
                `Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`,
            );
        } catch {
            setDeliveryProofError("Location access failed. Enable location permission and try again.");
        } finally {
            setDeliveryProofLoadingLocation(false);
        }
    };

    const openDeliveryProofModal = (target: DeliveryProofTarget) => {
        setProofTarget(target);
        setDeliveryProofFile(null);
        setDeliveryProofNotes("");
        setDeliveryProofLocation("");
        setDeliveryProofLat(null);
        setDeliveryProofLng(null);
        setDeliveryProofError("");
        void captureDeliveryLocation();
    };

    const closeDeliveryProofModal = () => {
        setProofTarget(null);
        setDeliveryProofFile(null);
        setDeliveryProofNotes("");
        setDeliveryProofLocation("");
        setDeliveryProofLat(null);
        setDeliveryProofLng(null);
        setDeliveryProofError("");
        setDeliveryProofSubmitting(false);
    };

    const submitDeliveryProof = async () => {
        if (!proofTarget || !me) return;

        if (!deliveryProofFile) {
            setDeliveryProofError("Delivery photo is required.");
            return;
        }
        if (deliveryProofLat === null || deliveryProofLng === null || !deliveryProofLocation.trim()) {
            setDeliveryProofError("Delivery location is required. Fetch current location and retry.");
            return;
        }

        setDeliveryProofSubmitting(true);
        setDeliveryProofError("");

        try {
            let proofImage = "";
            let proofImagePath: string | undefined;

            try {
                const upload = await uploadDriverMedia({
                    file: deliveryProofFile,
                    objectPath: buildDriverMediaPath({
                        driverId: me.id,
                        tripId: proofTarget.tripId,
                        dropId: proofTarget.dropId,
                        kind: "delivery-proof",
                    }),
                });
                proofImage = upload.signedUrl;
                proofImagePath = upload.objectPath;
            } catch {
                proofImage = await fileToDataUrl(deliveryProofFile);
            }
            await updateDropStatus(proofTarget.tripId, proofTarget.dropId, "delivered", {
                proofImage,
                proofImagePath,
                proofCapturedAt: new Date().toISOString(),
                proofLat: deliveryProofLat,
                proofLng: deliveryProofLng,
                proofLocation: deliveryProofLocation.trim(),
                notes: deliveryProofNotes.trim() || undefined,
            });
            await registerDriverActivity(me.id);
            closeDeliveryProofModal();
        } catch (error) {
            setDeliveryProofError(
                error instanceof Error
                    ? error.message
                    : "Unable to submit proof right now. Please retry.",
            );
        } finally {
            setDeliveryProofSubmitting(false);
        }
    };

    const handleEndDay = () => {
        if (!me) return;
        setEndProofTripId(activeTrip?.id || "day-end");
    };

    const startSosHold = () => {
        if (!dayStarted || onBreak) return;
        setSosHolding(true);
        sosHoldTimerRef.current = window.setTimeout(() => {
            setShowSosModal(true);
            setSosHolding(false);
            sosHoldTimerRef.current = null;
        }, 650);
    };

    const cancelSosHold = () => {
        setSosHolding(false);
        if (sosHoldTimerRef.current) {
            window.clearTimeout(sosHoldTimerRef.current);
            sosHoldTimerRef.current = null;
        }
    };

    if (showBootSkeleton) {
        return (
            <div className="space-y-4 pb-20 md:pb-0">
                <section className="rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-xl">
                    <div className="h-3 w-24 animate-pulse rounded-full bg-white/15" />
                    <div className="mt-4 h-8 w-48 animate-pulse rounded-2xl bg-white/15" />
                    <div className="mt-3 h-4 w-40 animate-pulse rounded-full bg-white/10" />
                    <div className="mt-6 h-14 w-full animate-pulse rounded-2xl bg-white/15" />
                </section>
                <section className="grid gap-3 sm:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="h-24 animate-pulse rounded-[26px] bg-white shadow-sm ring-1 ring-slate-200/70" />
                    ))}
                </section>
                <section className="space-y-3">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="h-28 animate-pulse rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200/70" />
                    ))}
                </section>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-20 md:pb-0">
            <section className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                    <Link
                        key={tab}
                        href={driverLockedByBreak ? "#" : `/driver?tab=${tab}`}
                        onClick={(event) => {
                            if (driverLockedByBreak) {
                                event.preventDefault();
                            }
                        }}
                        aria-disabled={driverLockedByBreak}
                        className={`min-h-12 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                            activeTab === tab
                                ? "bg-slate-900 text-white"
                                : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
                        } ${driverLockedByBreak ? "pointer-events-none opacity-50" : ""}`}
                    >
                        {tabLabel(tab)}
                    </Link>
                ))}
                <Link
                    href={driverLockedByBreak ? "#" : "/driver/routes"}
                    onClick={(event) => {
                        if (driverLockedByBreak) {
                            event.preventDefault();
                        }
                    }}
                    aria-disabled={driverLockedByBreak}
                    className={`min-h-12 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 ${
                        driverLockedByBreak ? "pointer-events-none opacity-50" : "bg-white"
                    }`}
                >
                    Routes
                </Link>
            </section>

            {onBreak && me && (
                <section className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] bg-amber-50 p-4 shadow-sm ring-1 ring-amber-200">
                    <div>
                        <p className="text-sm font-semibold text-amber-900">Break is active</p>
                        <p className="mt-1 text-xs text-amber-700">
                            Only <span className="font-semibold">End Break</span> is available now. All other driver operations stay locked until the break is closed.
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

            {activeTab === "overview" && (
                <section className="space-y-4">
                    <article className="overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-700 via-blue-600 to-slate-900 text-white shadow-sm">
                        <div className="p-5 md:p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-100">Driver Dashboard</p>
                                    <h2 className="mt-2 text-2xl font-black tracking-tight">
                                        {dayStarted ? "Where you go next" : "Start your day"}
                                    </h2>
                                    <p className="mt-1 text-sm text-blue-100">
                                        {activeTrip
                                            ? `Trip #${activeTrip.id.toUpperCase()} • ${remainingStops} stops pending`
                                            : "No open trip assigned right now."}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {!dayStarted && !onBreak && me && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowStartDayProof(true);
                                            }}
                                            className="min-h-12 rounded-2xl bg-white px-4 py-3 text-sm font-black text-blue-700"
                                        >
                                            Start Day
                                        </button>
                                    )}
                                    {dayStarted && !onBreak && me && (
                                        <button
                                            type="button"
                                            onClick={handleEndDay}
                                            className="min-h-12 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/20"
                                        >
                                            End Day
                                        </button>
                                    )}
                                    {!onBreak && dayStarted && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!me) return;
                                                void startDriverBreak(me.id, true);
                                            }}
                                            className="min-h-12 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/20"
                                        >
                                            Start Break
                                        </button>
                                    )}
                                </div>
                            </div>

                            {activeTrip && (
                                <>
                                    <div className="mt-5 rounded-[24px] bg-white/10 px-4 py-3 backdrop-blur-sm ring-1 ring-white/10">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-100">Route Progress</p>
                                                <p className="mt-1 text-lg font-black text-white">
                                                    {completedStops}/{totalStops} completed
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-100">ETA</p>
                                                <p className="mt-1 text-lg font-black text-white">{remainingEta}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 h-2 rounded-full bg-white/15">
                                            <div
                                                className="h-2 rounded-full bg-emerald-400 transition-all"
                                                style={{ width: `${progressPct}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-5 rounded-[28px] bg-white p-5 text-slate-900 shadow-lg">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <span className="inline-flex rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                                                    Next Stop
                                                </span>
                                                <h3 className="mt-4 text-[30px] font-black leading-tight text-slate-900">
                                                    {nextPendingDrop ? nextPendingDrop.customerName : "All stops submitted"}
                                                </h3>
                                                <p className="mt-2 text-base font-medium text-slate-600">
                                                    {nextPendingDrop?.address || "Waiting for supervisor verification."}
                                                </p>
                                            </div>
                                            {nextPendingDrop && (
                                                <div className="rounded-[24px] bg-slate-100 px-3 py-2 text-right">
                                                    <p className="text-xl font-black text-slate-900">{nextStopDistance.toFixed(1)} km</p>
                                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">away</p>
                                                </div>
                                            )}
                                        </div>

                                        {nextPendingDrop && (
                                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                                    ETA {remainingEta}
                                                </span>
                                                {nextPendingDrop.priority && (
                                                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                                        {nextPendingDrop.priority} priority
                                                    </span>
                                                )}
                                                {nextPendingDrop.deadline && (
                                                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                                                        Due {new Date(nextPendingDrop.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                                            {activeTrip.status !== "in-progress" ? (
                                                <button
                                                    type="button"
                                                    disabled={!dayStarted || onBreak}
                                                    onClick={() => {
                                                        void acceptTrip(activeTrip.id);
                                                        if (me) {
                                                            void registerDriverActivity(me.id);
                                                        }
                                                    }}
                                                    className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white disabled:opacity-50"
                                                >
                                                    <ArrowRightIcon className="h-5 w-5" />
                                                    {primaryHeroLabel}
                                                </button>
                                            ) : (
                                                <Link
                                                    href="/driver/routes"
                                                    className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white"
                                                >
                                                    <MapPinIcon className="h-5 w-5" />
                                                    {primaryHeroLabel}
                                                </Link>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    tripDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                                }}
                                                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-4 text-sm font-bold text-slate-800"
                                            >
                                                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                                Open Details
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                                            <span className="text-blue-100">Packages</span> {completedStops}/{totalStops}
                                        </div>
                                        <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                                            <span className="text-blue-100">Distance</span> {remainingDistanceKm.toFixed(1)} km
                                        </div>
                                        <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                                            <span className="text-blue-100">Status</span> {activeTripDone ? "Awaiting review" : "On schedule"}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </article>

                    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_320px]">
                        <div ref={tripDetailRef} className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {activeTrips.map((trip) => (
                                    <button
                                        key={trip.id}
                                        type="button"
                                        disabled={onBreak}
                                        onClick={() => setSelectedTripId(trip.id)}
                                        className={`min-h-12 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                                            activeTrip?.id === trip.id
                                                ? "bg-slate-900 text-white"
                                                : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
                                        } ${onBreak ? "opacity-50 cursor-not-allowed" : ""}`}
                                    >
                                        Trip #{trip.id.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {!activeTrip && (
                                <article className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
                                    <p className="text-slate-600">No active trip assigned right now.</p>
                                </article>
                            )}

                            {activeTrip && (
                                <article className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Assigned Route</p>
                                            <h3 className="mt-1 text-lg font-black text-slate-900">
                                                Trip #{activeTrip.id.toUpperCase()}
                                            </h3>
                                            <p className="mt-1 text-sm text-slate-500">{activeTrip.startLocation.address}</p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusClass(activeTrip.status)}`}>
                                            {activeTrip.status}
                                        </span>
                                    </div>

                                    {activeTrip.status === "in-progress" &&
                                        activeTrip.drops.every((drop) => drop.status === "delivered" || drop.status === "failed") && (
                                            <div className="mt-4 rounded-[24px] bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                                                All stops are submitted. Supervisor must verify the stop proofs before closing this trip.
                                            </div>
                                        )}

                                    <div className="mt-4 space-y-3">
                                        {activeTrip.drops.map((drop, index) => {
                                            const isNext = nextPendingDrop?.id === drop.id;
                                            return (
                                                <div
                                                    key={drop.id}
                                                    className={`rounded-[24px] p-4 ring-1 ${
                                                        isNext
                                                            ? "bg-slate-900 text-white ring-slate-900"
                                                            : "bg-slate-50/80 text-slate-900 ring-slate-200/70"
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
                                                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                                                                    isNext ? "bg-white/10 text-white" : "bg-white text-slate-500"
                                                                }`}>
                                                                    Stop {index + 1}
                                                                </span>
                                                            </div>
                                                            <p className={`mt-3 text-lg font-black ${isNext ? "text-white" : "text-slate-900"}`}>
                                                                {drop.customerName}
                                                            </p>
                                                            <p className={`mt-1 text-sm ${isNext ? "text-slate-300" : "text-slate-500"}`}>
                                                                {drop.address}
                                                            </p>
                                                        </div>
                                                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusClass(drop.status)}`}>
                                                            {drop.status}
                                                        </span>
                                                    </div>

                                                    {drop.status === "pending" && (
                                                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                                            <button
                                                                type="button"
                                                                disabled={!dayStarted || onBreak}
                                                                onClick={() => {
                                                                    openDeliveryProofModal({
                                                                        tripId: activeTrip.id,
                                                                        dropId: drop.id,
                                                                        customerName: drop.customerName,
                                                                        address: drop.address,
                                                                    });
                                                                }}
                                                                className={`min-h-12 rounded-2xl px-4 py-3 text-sm font-black ${
                                                                    isNext ? "bg-white text-slate-900" : "bg-emerald-600 text-white"
                                                                } disabled:opacity-50`}
                                                            >
                                                                Deliver
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={!dayStarted || onBreak}
                                                                onClick={() => {
                                                                    if (!me) return;
                                                                    void updateDropStatus(activeTrip.id, drop.id, "failed");
                                                                    void registerDriverActivity(me.id);
                                                                }}
                                                                className={`min-h-12 rounded-2xl px-4 py-3 text-sm font-bold ${
                                                                    isNext
                                                                        ? "bg-transparent text-white ring-1 ring-white/20"
                                                                        : "bg-white text-rose-700 ring-1 ring-rose-200"
                                                                } disabled:opacity-50`}
                                                            >
                                                                Mark Failed
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </article>
                            )}
                        </div>

                        <div className="space-y-4">
                            <article className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Today</p>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-[24px] bg-slate-100/90 px-4 py-3">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Active Trips</p>
                                        <p className="mt-2 text-2xl font-black text-slate-900">{activeTrips.length}</p>
                                    </div>
                                    <div className="rounded-[24px] bg-slate-100/90 px-4 py-3">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Completed</p>
                                        <p className="mt-2 text-2xl font-black text-emerald-700">{completedTrips.length}</p>
                                    </div>
                                    <div className="rounded-[24px] bg-slate-100/90 px-4 py-3">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Duty</p>
                                        <p className="mt-2 text-2xl font-black text-slate-900">{dayStarted ? "ON" : "OFF"}</p>
                                    </div>
                                    <div className="rounded-[24px] bg-slate-100/90 px-4 py-3">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Break</p>
                                        <p className="mt-2 text-2xl font-black text-amber-700">{formatMinutes(totalBreakMinutes)}</p>
                                    </div>
                                </div>
                            </article>

                            <article className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Driver Controls</p>
                                <p className="mt-2 text-sm text-slate-500">
                                    If vehicle inactivity crosses 8 minutes during an in-progress trip without informed break, it auto-registers as uninformed break.
                                </p>
                                {!dayStarted && !onBreak && (
                                    <p className="mt-3 text-sm font-semibold text-slate-600">
                                        Use the <span className="font-black text-slate-900">Start Day</span> button above before break, SOS, fuel, or route actions.
                                    </p>
                                )}
                                {onBreak && (
                                    <p className="mt-3 text-sm font-semibold text-amber-700">
                                        Break active ({me?.breakType || "informed"}) • {formatMinutes(currentBreakMinutes)}
                                    </p>
                                )}
                            </article>
                        </div>
                    </section>
                </section>
            )}

            {activeTab === "fuel" && (
                <section className="grid gap-4 xl:grid-cols-2">
                    <article className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                        <h3 className="text-lg font-black text-slate-900">Submit Fuel Entry</h3>
                        <p className="mt-1 text-sm text-slate-500">Fast entry form with receipt capture for the current trip.</p>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Litres</label>
                                <input
                                    type="number"
                                    className="min-h-12 w-full rounded-2xl border-0 bg-slate-100/90 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200"
                                    value={fuelAmount}
                                    onChange={(event) => setFuelAmount(event.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Cost (INR)</label>
                                <input
                                    type="number"
                                    className="min-h-12 w-full rounded-2xl border-0 bg-slate-100/90 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200"
                                    value={fuelCost}
                                    onChange={(event) => setFuelCost(event.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Pump Location</label>
                                <input
                                    type="text"
                                    className="min-h-12 w-full rounded-2xl border-0 bg-slate-100/90 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200"
                                    value={fuelLocation}
                                    onChange={(event) => setFuelLocation(event.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Odometer</label>
                                <input
                                    type="number"
                                    className="min-h-12 w-full rounded-2xl border-0 bg-slate-100/90 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200"
                                    value={fuelOdometer}
                                    onChange={(event) => setFuelOdometer(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Upload Fuel Bill Photo</label>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    setFuelReceiptFile(file);
                                }}
                                className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-2xl file:border-0 file:bg-blue-600 file:px-4 file:py-3 file:text-xs file:font-bold file:text-white hover:file:bg-blue-700"
                            />
                            {fuelReceiptImage && (
                                <img
                                    src={fuelReceiptImage}
                                    alt="Fuel receipt preview"
                                    className="mt-3 h-32 w-full rounded-2xl object-cover ring-1 ring-slate-200/70"
                                />
                            )}
                        </div>

                        <button
                            type="button"
                            disabled={!canSubmitFuel || !dayStarted || onBreak}
                            onClick={async () => {
                                if (!user || !activeTrip) return;
                                let receiptImage: string | undefined;
                                let receiptImagePath: string | undefined;

                                if (fuelReceiptFile) {
                                    try {
                                        const upload = await uploadDriverMedia({
                                            file: fuelReceiptFile,
                                            objectPath: buildDriverMediaPath({
                                                driverId: user.id,
                                                tripId: activeTrip.id,
                                                fuelEntryId: `f-${Date.now()}`,
                                                kind: "fuel-receipt",
                                            }),
                                        });
                                        receiptImage = upload.signedUrl;
                                        receiptImagePath = upload.objectPath;
                                    } catch {
                                        receiptImage = await fileToDataUrl(fuelReceiptFile);
                                    }
                                }

                                const newEntry: FuelEntry = {
                                    id: `f-${Date.now()}`,
                                    tripId: activeTrip.id,
                                    driverId: user.id,
                                    vehicleId: activeTrip.vehicleId || "",
                                    amount: Number(fuelAmount) || 0,
                                    cost: Number(fuelCost) || 0,
                                    currency: "INR",
                                    odometer: Number(fuelOdometer) || 0,
                                    location: fuelLocation.trim() || "Fuel Station",
                                    timestamp: new Date().toISOString(),
                                    receiptImage,
                                    receiptImagePath,
                                    status: "pending",
                                };
                                await addFuelEntry(newEntry);
                                setFuelReceiptFile(null);
                            }}
                            className="mt-5 min-h-14 w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-black text-white disabled:opacity-50"
                        >
                            Submit Fuel Entry
                        </button>
                        {(!canSubmitFuel || !dayStarted || onBreak) && (
                            <p className="mt-3 text-sm font-semibold text-rose-600">
                                Fuel submission requires active trip, day started, and break ended.
                            </p>
                        )}
                    </article>

                    <article className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                        <h3 className="text-lg font-black text-slate-900">Recent Fuel Entries</h3>
                        <div className="mt-4 space-y-3">
                            {recentFuel.length === 0 && <p className="text-sm text-slate-500">No fuel entries yet.</p>}
                            {recentFuel.map((entry) => (
                                <div key={entry.id} className="rounded-[24px] bg-slate-100/90 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-black text-slate-900">#{entry.id.toUpperCase()}</p>
                                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusClass(entry.status)}`}>
                                            {entry.status}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm font-medium text-slate-600">{entry.location}</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">₹{entry.cost.toLocaleString()} • {entry.amount}L</p>
                                    {entry.receiptImage && (
                                        <img
                                            src={entry.receiptImage}
                                            alt={`Receipt ${entry.id}`}
                                            className="mt-3 h-28 w-full rounded-2xl object-cover ring-1 ring-slate-200/70"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </article>
                </section>
            )}

            {dayStarted && !onBreak && (
                <button
                    type="button"
                    onPointerDown={startSosHold}
                    onPointerUp={cancelSosHold}
                    onPointerLeave={cancelSosHold}
                    onPointerCancel={cancelSosHold}
                    className={`fixed bottom-24 right-4 z-40 flex h-16 w-16 items-center justify-center rounded-full text-sm font-black text-white shadow-lg transition ${
                        sosHolding ? "scale-95 bg-rose-700" : "bg-rose-600"
                    }`}
                    aria-label="Hold for SOS"
                >
                    <span className="relative z-10">SOS</span>
                    {sosHolding && <span className="absolute inset-0 rounded-full ring-4 ring-rose-300/60" />}
                </button>
            )}

            {showStartDayProof && me && (
                <TripStartProofModal
                    driverId={me.id}
                    tripId={activeTrip?.id || "day-start"}
                    mode="start-day"
                    onClose={() => setShowStartDayProof(false)}
                    onSubmit={async (proof) => {
                        await startDriverDay(me.id, proof);
                    }}
                />
            )}

            {endProofTripId && me && (
                <TripStartProofModal
                    driverId={me.id}
                    tripId={endProofTripId}
                    mode="end-day"
                    onClose={() => setEndProofTripId(null)}
                    onSubmit={async (proof) => {
                        await endDriverDay(me.id, proof);
                    }}
                />
            )}

            {proofTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
                    <article className="w-full max-w-xl rounded-[28px] bg-white p-5 shadow-xl ring-1 ring-slate-200">
                        <h3 className="text-lg font-black text-slate-900">Delivery Proof Required</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Customer: {proofTarget.customerName} • Upload photo and confirm capture location.
                        </p>

                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Delivery Photo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (!file) return;
                                        setDeliveryProofFile(file);
                                    }}
                                    className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-2xl file:border-0 file:bg-emerald-600 file:px-4 file:py-3 file:text-xs file:font-bold file:text-white hover:file:bg-emerald-700"
                                />
                                {deliveryProofImage && (
                                    <img
                                        src={deliveryProofImage}
                                        alt="Delivery proof preview"
                                        className="mt-3 h-40 w-full rounded-2xl object-cover ring-1 ring-slate-200/70"
                                    />
                                )}
                            </div>

                            <div className="rounded-[24px] bg-slate-100/90 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Capture Location</p>
                                    <button
                                        type="button"
                                        disabled={deliveryProofLoadingLocation}
                                        onClick={() => {
                                            void captureDeliveryLocation();
                                        }}
                                        className="min-h-10 rounded-2xl bg-blue-600 px-3 text-xs font-bold text-white disabled:opacity-50"
                                    >
                                        {deliveryProofLoadingLocation ? "Fetching..." : "Use Current Location"}
                                    </button>
                                </div>
                                <p className="mt-3 text-sm font-medium text-slate-600">
                                    {deliveryProofLocation || "No location captured yet."}
                                </p>
                                {deliveryProofLat !== null && deliveryProofLng !== null && (
                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                        Lat: {deliveryProofLat.toFixed(6)} | Lng: {deliveryProofLng.toFixed(6)}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Proof Notes</label>
                                <textarea
                                    value={deliveryProofNotes}
                                    onChange={(event) => setDeliveryProofNotes(event.target.value)}
                                    rows={2}
                                    className="w-full rounded-[24px] border-0 bg-slate-100/90 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200"
                                    placeholder="Gate pass number, receiver info, etc."
                                />
                            </div>

                            {deliveryProofError && (
                                <p className="text-sm font-semibold text-rose-700">{deliveryProofError}</p>
                            )}
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={closeDeliveryProofModal}
                                className="min-h-12 flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void submitDeliveryProof();
                                }}
                                disabled={deliveryProofSubmitting}
                                className="min-h-12 flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                            >
                                {deliveryProofSubmitting ? "Submitting..." : "Submit Proof & Deliver"}
                            </button>
                        </div>
                    </article>
                </div>
            )}

            {showSosModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
                    <article className="w-full max-w-lg rounded-[28px] bg-white p-5 shadow-xl ring-1 ring-slate-200">
                        <h3 className="text-lg font-black text-slate-900">SOS / Vehicle Issue</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Choose issue type, estimated repair time, and whether supervisor escalation is required.
                        </p>

                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Issue</label>
                                <select
                                    value={sosIssueType}
                                    onChange={(event) => setSosIssueType(event.target.value as VehicleIssueType)}
                                    className="min-h-12 w-full rounded-2xl border-0 bg-slate-100/90 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200"
                                >
                                    {issueOptions.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Description</label>
                                <textarea
                                    value={sosDescription}
                                    onChange={(event) => setSosDescription(event.target.value)}
                                    rows={3}
                                    className="w-full rounded-[24px] border-0 bg-slate-100/90 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200"
                                    placeholder="Explain the issue briefly"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Estimated time to resume (minutes)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={sosEta}
                                    onChange={(event) => setSosEta(event.target.value)}
                                    className="min-h-12 w-full rounded-2xl border-0 bg-slate-100/90 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200"
                                />
                            </div>

                            <label className="flex items-center gap-3 rounded-2xl bg-slate-100/90 px-4 py-3 text-sm font-semibold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={sosSevere}
                                    onChange={(event) => setSosSevere(event.target.checked)}
                                />
                                Serious issue (critical)
                            </label>
                            <label className="flex items-center gap-3 rounded-2xl bg-slate-100/90 px-4 py-3 text-sm font-semibold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={sosInformSupervisor}
                                    onChange={(event) => setSosInformSupervisor(event.target.checked)}
                                />
                                Inform supervisor immediately
                            </label>
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowSosModal(false)}
                                className="min-h-12 flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!me) return;
                                    void triggerEmergency(me.id, activeTrip?.id, {
                                        issueType: issueOptions.find((item) => item.value === sosIssueType)?.label,
                                        description: sosDescription,
                                        etaMinutes: Number(sosEta) || 0,
                                        severe: sosSevere,
                                        informSupervisor: sosInformSupervisor,
                                    });
                                    setShowSosModal(false);
                                    setSosDescription("");
                                    setSosEta("20");
                                    setSosSevere(false);
                                    setSosInformSupervisor(true);
                                }}
                                className="min-h-12 flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white"
                            >
                                Send SOS
                            </button>
                        </div>
                    </article>
                </div>
            )}
        </div>
    );
}
