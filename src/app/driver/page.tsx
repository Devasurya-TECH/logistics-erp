"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import type { FuelEntry } from "@/lib/types";

type DriverTab = "overview" | "fuel";

const tabs: DriverTab[] = ["overview", "fuel"];

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

    const [fuelAmount, setFuelAmount] = useState("20");
    const [fuelCost, setFuelCost] = useState("2200");
    const [fuelLocation, setFuelLocation] = useState("HP Fuel Station");
    const [fuelOdometer, setFuelOdometer] = useState("12000");
    const [fuelReceiptImage, setFuelReceiptImage] = useState("");

    const recentFuel = fuelEntries
        .filter((entry) => entry.driverId === user?.id)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 6);

    const canSubmitFuel = Boolean(activeTrip && user);

    // Force always-live tracking for drivers.
    useEffect(() => {
        if (!me || me.isLive) return;
        void toggleLiveStatus(me.id, true);
    }, [me, toggleLiveStatus]);

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
                    <div className="grid gap-3 sm:grid-cols-3">
                        <article className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-xs text-slate-500">Active Trips</p>
                            <p className="text-2xl font-bold text-blue-700 mt-1">{activeTrips.length}</p>
                        </article>
                        <article className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-xs text-slate-500">Completed Trips</p>
                            <p className="text-2xl font-bold text-emerald-700 mt-1">{completedTrips.length}</p>
                        </article>
                        <article className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-xs text-slate-500">Live Tracking</p>
                            <p className="text-2xl font-bold text-emerald-700 mt-1">ON</p>
                        </article>
                    </div>

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
                                            onClick={() => {
                                                void acceptTrip(activeTrip.id);
                                            }}
                                            className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                        >
                                            Start Trip
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!user) return;
                                            void triggerEmergency(user.id, activeTrip.id);
                                        }}
                                        className="px-3 py-2 rounded-lg text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700"
                                    >
                                        SOS
                                    </button>
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
                                                    onClick={() => {
                                                        void updateDropStatus(activeTrip.id, drop.id, "delivered");
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                                                >
                                                    Mark Delivered
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void updateDropStatus(activeTrip.id, drop.id, "failed");
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
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
                            disabled={!canSubmitFuel}
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
                        {!canSubmitFuel && (
                            <p className="text-xs text-rose-600">Fuel submission requires an active trip.</p>
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

        </div>
    );
}
