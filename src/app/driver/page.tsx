"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import type { FuelEntry } from "@/lib/types";

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
    const activeTrips = myTrips.filter(
        (trip) => trip.status === "assigned" || trip.status === "in-progress",
    );
    const completedTrips = myTrips
        .filter((trip) => trip.status === "completed")
        .sort((a, b) => (b.endTime || "").localeCompare(a.endTime || ""));

    const [selectedTripId, setSelectedTripId] = useState<string | null>(activeTrips[0]?.id || null);
    const activeTrip = activeTrips.find((trip) => trip.id === selectedTripId) || activeTrips[0] || null;
    const [proofTarget, setProofTarget] = useState<DeliveryProofTarget | null>(null);
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
    const [fuelReceiptImage, setFuelReceiptImage] = useState("");

    const [showSosModal, setShowSosModal] = useState(false);
    const [sosIssueType, setSosIssueType] = useState<VehicleIssueType>("engine-check");
    const [sosDescription, setSosDescription] = useState("");
    const [sosEta, setSosEta] = useState("20");
    const [sosSevere, setSosSevere] = useState(false);
    const [sosInformSupervisor, setSosInformSupervisor] = useState(true);

    const [nowTick, setNowTick] = useState(Date.now());

    const recentFuel = fuelEntries
        .filter((entry) => entry.driverId === user?.id)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 6);

    const canSubmitFuel = Boolean(activeTrip && user);
    const dayStarted = me?.dutyStatus !== "off-duty";
    const onBreak = Boolean(me?.onBreak);

    const currentBreakMinutes =
        me?.onBreak && me.breakStartedAt
            ? Math.max(0, Math.round((nowTick - new Date(me.breakStartedAt).getTime()) / 60000))
            : 0;
    const totalBreakMinutes = (me?.totalBreakMinutes || 0) + currentBreakMinutes;

    // Keep time labels fresh
    useEffect(() => {
        const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    // Force always-live tracking for drivers.
    useEffect(() => {
        if (!me || me.isLive) return;
        void toggleLiveStatus(me.id, true);
    }, [me, toggleLiveStatus]);

    // Auto break if inactive for > 8 min while trip is in progress and break not informed
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
        setDeliveryProofImage("");
        setDeliveryProofNotes("");
        setDeliveryProofLocation("");
        setDeliveryProofLat(null);
        setDeliveryProofLng(null);
        setDeliveryProofError("");
        void captureDeliveryLocation();
    };

    const closeDeliveryProofModal = () => {
        setProofTarget(null);
        setDeliveryProofImage("");
        setDeliveryProofNotes("");
        setDeliveryProofLocation("");
        setDeliveryProofLat(null);
        setDeliveryProofLng(null);
        setDeliveryProofError("");
        setDeliveryProofSubmitting(false);
    };

    const submitDeliveryProof = async () => {
        if (!proofTarget || !me) return;

        if (!deliveryProofImage) {
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
            await updateDropStatus(proofTarget.tripId, proofTarget.dropId, "delivered", {
                proofImage: deliveryProofImage,
                proofCapturedAt: new Date().toISOString(),
                proofLat: deliveryProofLat,
                proofLng: deliveryProofLng,
                proofLocation: deliveryProofLocation.trim(),
                notes: deliveryProofNotes.trim() || undefined,
            });
            await registerDriverActivity(me.id);
            closeDeliveryProofModal();
        } finally {
            setDeliveryProofSubmitting(false);
        }
    };

    return (
        <div className="space-y-5">
            <section className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                    <Link
                        key={tab}
                        href={`/driver?tab=${tab}`}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                            activeTab === tab
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-gray-200 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        {tabLabel(tab)}
                    </Link>
                ))}
                <Link
                    href="/driver/routes"
                    className="px-3 py-2 rounded-lg text-sm font-semibold bg-white border border-gray-200 text-slate-700 hover:bg-slate-100"
                >
                    Routes
                </Link>
            </section>

            {activeTab === "overview" && (
                <section className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-4">
                        <article className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-xs text-slate-500">Active Trips</p>
                            <p className="text-2xl font-bold text-blue-700 mt-1">{activeTrips.length}</p>
                        </article>
                        <article className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-xs text-slate-500">Completed Trips</p>
                            <p className="text-2xl font-bold text-emerald-700 mt-1">{completedTrips.length}</p>
                        </article>
                        <article className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-xs text-slate-500">Duty Status</p>
                            <p className={`text-2xl font-bold mt-1 ${dayStarted ? "text-emerald-700" : "text-slate-600"}`}>
                                {dayStarted ? "ON" : "OFF"}
                            </p>
                        </article>
                        <article className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-xs text-slate-500">Break Time Today</p>
                            <p className="text-2xl font-bold text-amber-700 mt-1">{formatMinutes(totalBreakMinutes)}</p>
                        </article>
                    </div>

                    <article className="bg-white border border-gray-200 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-slate-900">Duty Controls</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            If vehicle inactivity crosses 8 minutes during an in-progress trip without informed break, it auto-registers as uninformed break.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!me) return;
                                    void startDriverDay(me.id);
                                }}
                                className="px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                Start Day
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!me) return;
                                    void endDriverDay(me.id);
                                }}
                                className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-700 text-white hover:bg-slate-800"
                            >
                                End Day
                            </button>
                            {!onBreak ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!me) return;
                                        void startDriverBreak(me.id, true);
                                    }}
                                    className="px-3 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700"
                                >
                                    Start Break
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!me) return;
                                        void endDriverBreak(me.id);
                                    }}
                                    className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    End Break
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowSosModal(true)}
                                className="px-3 py-2 rounded-lg text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700"
                            >
                                SOS / Report Issue
                            </button>
                        </div>
                        {onBreak && (
                            <p className="mt-2 text-xs font-semibold text-amber-700">
                                Break active ({me?.breakType || "informed"}) • {formatMinutes(currentBreakMinutes)}
                            </p>
                        )}
                    </article>

                    <div className="flex flex-wrap gap-2">
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
                    </div>

                    {!activeTrip && (
                        <article className="bg-white border border-gray-200 rounded-xl p-6">
                            <p className="text-slate-600">No active trip assigned right now.</p>
                        </article>
                    )}

                    {activeTrip && (
                        <article className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Trip #{activeTrip.id.toUpperCase()}
                                    </h3>
                                    <p className="text-sm text-slate-500">{activeTrip.startLocation.address}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {activeTrip.status === "assigned" && (
                                        <button
                                            type="button"
                                            disabled={!dayStarted || onBreak}
                                            onClick={() => {
                                                void acceptTrip(activeTrip.id);
                                            }}
                                            className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Start Trip
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {activeTrip.drops.map((drop) => (
                                    <div key={drop.id} className="border border-gray-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{drop.customerName}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{drop.address}</p>
                                            </div>
                                            <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${statusClass(drop.status)}`}>
                                                {drop.status}
                                            </span>
                                        </div>
                                        {drop.status === "pending" && (
                                            <div className="mt-2 flex flex-wrap gap-2">
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
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Upload Proof & Deliver
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!dayStarted || onBreak}
                                                    onClick={() => {
                                                        if (!me) return;
                                                        void updateDropStatus(activeTrip.id, drop.id, "failed");
                                                        void registerDriverActivity(me.id);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Mark Failed
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </article>
                    )}
                </section>
            )}

            {activeTab === "fuel" && (
                <section className="grid gap-4 xl:grid-cols-2">
                    <article className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-slate-900">Submit Fuel Entry</h3>
                        <div>
                            <label className="block text-xs text-slate-600 mb-1">Litres</label>
                            <input
                                type="number"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={fuelAmount}
                                onChange={(event) => setFuelAmount(event.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-600 mb-1">Cost (INR)</label>
                            <input
                                type="number"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={fuelCost}
                                onChange={(event) => setFuelCost(event.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-600 mb-1">Pump Location</label>
                            <input
                                type="text"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={fuelLocation}
                                onChange={(event) => setFuelLocation(event.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-600 mb-1">Odometer</label>
                            <input
                                type="number"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={fuelOdometer}
                                onChange={(event) => setFuelOdometer(event.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-600 mb-1">
                                Upload Fuel Bill Photo
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
                                        setFuelReceiptImage(image);
                                    };
                                    reader.readAsDataURL(file);
                                }}
                                className="block w-full text-xs text-slate-600 file:mr-3 file:px-3 file:py-2 file:border-0 file:rounded-lg file:bg-blue-600 file:text-white file:text-xs file:font-semibold hover:file:bg-blue-700"
                            />
                            {fuelReceiptImage && (
                                <img
                                    src={fuelReceiptImage}
                                    alt="Fuel receipt preview"
                                    className="mt-2 w-48 h-28 object-cover rounded-lg border border-gray-200"
                                />
                            )}
                        </div>
                        <button
                            type="button"
                            disabled={!canSubmitFuel || !dayStarted || onBreak}
                            onClick={() => {
                                if (!user || !activeTrip) return;
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
                                    receiptImage: fuelReceiptImage || undefined,
                                    status: "pending",
                                };
                                void addFuelEntry(newEntry);
                                setFuelReceiptImage("");
                            }}
                            className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Submit Fuel Entry
                        </button>
                        {(!canSubmitFuel || !dayStarted || onBreak) && (
                            <p className="text-xs text-rose-600">
                                Fuel submission requires active trip, day started, and break ended.
                            </p>
                        )}
                    </article>

                    <article className="bg-white border border-gray-200 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Fuel Entries</h3>
                        <div className="space-y-2">
                            {recentFuel.length === 0 && <p className="text-sm text-slate-500">No fuel entries yet.</p>}
                            {recentFuel.map((entry) => (
                                <div key={entry.id} className="border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-slate-900">#{entry.id.toUpperCase()}</p>
                                        <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${statusClass(entry.status)}`}>
                                            {entry.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{entry.location}</p>
                                    <p className="text-xs text-slate-500 mt-1">₹{entry.cost.toLocaleString()} • {entry.amount}L</p>
                                    {entry.receiptImage && (
                                        <img
                                            src={entry.receiptImage}
                                            alt={`Receipt ${entry.id}`}
                                            className="mt-2 w-44 h-24 object-cover rounded-lg border border-gray-200"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </article>
                </section>
            )}

            {proofTarget && (
                <div className="fixed inset-0 z-50 bg-black/35 p-4 flex items-center justify-center">
                    <article className="w-full max-w-xl rounded-xl bg-white border border-gray-200 p-4">
                        <h3 className="text-lg font-bold text-slate-900">Delivery Proof Required</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Customer: {proofTarget.customerName} • Upload photo and confirm capture location.
                        </p>

                        <div className="mt-3 space-y-3">
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Delivery Photo</label>
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
                                            setDeliveryProofImage(image);
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                    className="block w-full text-xs text-slate-600 file:mr-3 file:px-3 file:py-2 file:border-0 file:rounded-lg file:bg-emerald-600 file:text-white file:text-xs file:font-semibold hover:file:bg-emerald-700"
                                />
                                {deliveryProofImage && (
                                    <img
                                        src={deliveryProofImage}
                                        alt="Delivery proof preview"
                                        className="mt-2 w-56 h-36 object-cover rounded-lg border border-gray-200"
                                    />
                                )}
                            </div>

                            <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-slate-50">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-700">Capture Location</p>
                                    <button
                                        type="button"
                                        disabled={deliveryProofLoadingLocation}
                                        onClick={() => {
                                            void captureDeliveryLocation();
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {deliveryProofLoadingLocation ? "Fetching..." : "Use Current Location"}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-600">
                                    {deliveryProofLocation || "No location captured yet."}
                                </p>
                                {deliveryProofLat !== null && deliveryProofLng !== null && (
                                    <p className="text-[11px] text-slate-500">
                                        Lat: {deliveryProofLat.toFixed(6)} | Lng: {deliveryProofLng.toFixed(6)}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Proof Notes (optional)</label>
                                <textarea
                                    value={deliveryProofNotes}
                                    onChange={(event) => setDeliveryProofNotes(event.target.value)}
                                    rows={2}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    placeholder="Gate pass number, receiver info, etc."
                                />
                            </div>

                            {deliveryProofError && (
                                <p className="text-xs font-semibold text-rose-700">{deliveryProofError}</p>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeDeliveryProofModal}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void submitDeliveryProof();
                                }}
                                disabled={deliveryProofSubmitting}
                                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {deliveryProofSubmitting ? "Submitting..." : "Submit Proof & Deliver"}
                            </button>
                        </div>
                    </article>
                </div>
            )}

            {showSosModal && (
                <div className="fixed inset-0 z-50 bg-black/35 p-4 flex items-center justify-center">
                    <article className="w-full max-w-lg rounded-xl bg-white border border-gray-200 p-4">
                        <h3 className="text-lg font-bold text-slate-900">SOS / Vehicle Issue</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Choose issue type, estimated repair time, and whether supervisor escalation is required.
                        </p>

                        <div className="mt-3 space-y-3">
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Issue</label>
                                <select
                                    value={sosIssueType}
                                    onChange={(event) => setSosIssueType(event.target.value as VehicleIssueType)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                >
                                    {issueOptions.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Description</label>
                                <textarea
                                    value={sosDescription}
                                    onChange={(event) => setSosDescription(event.target.value)}
                                    rows={3}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    placeholder="Explain the issue briefly"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Estimated time to resume (minutes)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={sosEta}
                                    onChange={(event) => setSosEta(event.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={sosSevere}
                                    onChange={(event) => setSosSevere(event.target.checked)}
                                />
                                Serious issue (critical)
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={sosInformSupervisor}
                                    onChange={(event) => setSosInformSupervisor(event.target.checked)}
                                />
                                Inform supervisor immediately
                            </label>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowSosModal(false)}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-slate-600"
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
                                className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
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
