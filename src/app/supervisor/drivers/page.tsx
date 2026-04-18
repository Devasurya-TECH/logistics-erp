"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import VehicleMap from "@/components/maps/VehicleMap";

type DriverCategory = "all" | "on-trip" | "free" | "off-duty";

const categories: DriverCategory[] = ["all", "on-trip", "free", "off-duty"];

function driverStatusClass(status: string) {
    if (status === "available") return "bg-emerald-100 text-emerald-700";
    if (status === "on-trip") return "bg-blue-100 text-blue-700";
    return "bg-slate-100 text-slate-700";
}

function runtimeClass(runtime: "moving" | "idle" | "offline") {
    if (runtime === "moving") return "bg-emerald-100 text-emerald-700";
    if (runtime === "idle") return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-700";
}

function formatDurationFromMinutes(totalMinutes: number) {
    const safe = Math.max(0, Math.round(totalMinutes));
    const hours = Math.floor(safe / 60);
    const minutes = safe % 60;
    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
}

function haversineKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
}

export default function SupervisorDriversPage() {
    const { drivers, trips, vehicles, toggleLiveStatus } = useStore();
    const [category, setCategory] = useState<DriverCategory>("all");
    const [query, setQuery] = useState("");
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

    const enriched = useMemo(() => {
        return drivers.map((driver) => {
            const myTrips = trips.filter((trip) => trip.driverId === driver.id);
            const activeTrip =
                myTrips.find((trip) => trip.status === "in-progress") ||
                myTrips.find((trip) => trip.status === "assigned") ||
                null;
            const completedTrips = myTrips.filter((trip) => trip.status === "completed");
            const deliveredDrops = myTrips
                .flatMap((trip) => trip.drops)
                .filter((drop) => drop.status === "delivered").length;

            const totalKm = completedTrips.reduce((sum, trip) => sum + (trip.actualDistance || trip.estimatedDistance || 0), 0);

            let activeProgressKm = 0;
            let activeTripDurationMinutes = 0;
            if (activeTrip) {
                const deliveredInActive = activeTrip.drops.filter((drop) => drop.status === "delivered");
                deliveredInActive.forEach((drop, index) => {
                    if (typeof drop.distanceFromPrev === "number") {
                        activeProgressKm += drop.distanceFromPrev;
                        return;
                    }

                    const previous =
                        index === 0
                            ? activeTrip.startLocation
                            : {
                                  lat: deliveredInActive[index - 1].lat,
                                  lng: deliveredInActive[index - 1].lng,
                              };
                    activeProgressKm += haversineKm(previous, { lat: drop.lat, lng: drop.lng });
                });

                if (activeTrip.startTime) {
                    const diffMs = Date.now() - new Date(activeTrip.startTime).getTime();
                    activeTripDurationMinutes = Math.max(0, Math.round(diffMs / 60000));
                }
            }

            const currentVehicle = vehicles.find((vehicle) => vehicle.id === (activeTrip?.vehicleId || driver.currentVehicleId));
            const runtime: "moving" | "idle" | "offline" =
                !driver.isLive ? "offline" : activeTrip?.status === "in-progress" ? "moving" : "idle";

            const currentLat = driver.currentLocation?.lat ?? currentVehicle?.location.lat ?? activeTrip?.startLocation.lat ?? null;
            const currentLng = driver.currentLocation?.lng ?? currentVehicle?.location.lng ?? activeTrip?.startLocation.lng ?? null;
            const currentAddress =
                driver.currentLocation?.address ||
                driver.lastDeliveryProof?.address ||
                activeTrip?.startLocation.address ||
                "Location unavailable";
            const currentLocationUpdatedAt =
                driver.currentLocation?.updatedAt ||
                driver.lastDeliveryProof?.capturedAt ||
                driver.lastLocationUpdate ||
                null;

            const breakMinutesLive =
                driver.onBreak && driver.breakStartedAt
                    ? Math.max(0, Math.round((Date.now() - new Date(driver.breakStartedAt).getTime()) / 60000))
                    : 0;

            const isOnTripCategory = Boolean(activeTrip) || driver.status === "on-trip";
            const isOffDutyCategory = driver.status === "off-duty" || driver.dutyStatus === "off-duty";
            const isFreeCategory = !isOnTripCategory && !isOffDutyCategory;

            return {
                ...driver,
                activeTrip,
                completedTripsCount: completedTrips.length,
                deliveredDrops,
                totalKm,
                activeProgressKm,
                activeTripDurationMinutes,
                currentVehicle,
                runtime,
                currentLat,
                currentLng,
                currentAddress,
                currentLocationUpdatedAt,
                totalBreakMinutesLive: (driver.totalBreakMinutes || 0) + breakMinutesLive,
                isOnTripCategory,
                isOffDutyCategory,
                isFreeCategory,
            };
        });
    }, [drivers, trips, vehicles]);

    const counts = useMemo(
        () => ({
            onTrip: enriched.filter((driver) => driver.isOnTripCategory).length,
            free: enriched.filter((driver) => driver.isFreeCategory).length,
            offDuty: enriched.filter((driver) => driver.isOffDutyCategory).length,
        }),
        [enriched],
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return enriched
            .filter((driver) => {
                if (category === "on-trip" && !driver.isOnTripCategory) return false;
                if (category === "free" && !driver.isFreeCategory) return false;
                if (category === "off-duty" && !driver.isOffDutyCategory) return false;
                if (!q) return true;
                return (
                    driver.name.toLowerCase().includes(q) ||
                    driver.email.toLowerCase().includes(q) ||
                    driver.id.toLowerCase().includes(q) ||
                    driver.licenseNumber.toLowerCase().includes(q) ||
                    driver.currentAddress.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [enriched, category, query]);

    const selected = useMemo(() => {
        if (filtered.length === 0) return null;
        const fromSelection = filtered.find((driver) => driver.id === selectedDriverId);
        return fromSelection || filtered[0];
    }, [filtered, selectedDriverId]);

    const mapVehicle = useMemo(() => {
        if (!selected || selected.currentLat === null || selected.currentLng === null) return [];
        const vehicle = selected.currentVehicle;
        return [
            {
                id: vehicle?.id || `${selected.id}-live`,
                plateNumber: vehicle?.plateNumber || `DRV-${selected.id.toUpperCase()}`,
                model: vehicle?.model || `${selected.name} live`,
                status: vehicle?.status || "active",
                fuelLevel: vehicle?.fuelLevel || 0,
                mileage: vehicle?.mileage || 0,
                location: { lat: selected.currentLat, lng: selected.currentLng },
                lastServiceDate: vehicle?.lastServiceDate || new Date().toISOString(),
                fuelType: vehicle?.fuelType,
            },
        ];
    }, [selected]);

    return (
        <div className="space-y-4">
            <section className="grid gap-3 sm:grid-cols-3">
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Drivers On Trip</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{counts.onTrip}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Drivers Free</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{counts.free}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Drivers Off Duty</p>
                    <p className="text-2xl font-bold text-slate-700 mt-1">{counts.offDuty}</p>
                </article>
            </section>

            <section className="flex flex-wrap gap-2">
                {categories.map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => setCategory(item)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                            category === item
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-gray-200 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        {item}
                    </button>
                ))}
            </section>

            <section>
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search driver, license or location..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
                <article className="bg-white border border-gray-200 rounded-xl p-3 xl:col-span-1">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Driver List</h3>
                    <div className="space-y-2 max-h-[640px] overflow-y-auto custom-scrollbar">
                        {filtered.length === 0 && <p className="text-sm text-slate-500">No drivers found.</p>}
                        {filtered.map((driver) => (
                            <button
                                key={driver.id}
                                type="button"
                                onClick={() => setSelectedDriverId(driver.id)}
                                className={`w-full text-left border rounded-lg p-3 ${
                                    selected?.id === driver.id ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-900">{driver.name}</p>
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${driverStatusClass(driver.status)}`}>
                                        {driver.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{driver.licenseNumber}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${runtimeClass(driver.runtime)}`}>
                                        {driver.runtime}
                                    </span>
                                    <span className="text-[11px] px-2 py-1 rounded-full font-semibold bg-slate-100 text-slate-700">
                                        {driver.activeTrip ? `Trip #${driver.activeTrip.id.toUpperCase()}` : "No active trip"}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </article>

                <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-2 space-y-3">
                    {!selected && <p className="text-sm text-slate-500">Select a driver to view live trip metrics.</p>}
                    {selected && (
                        <>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{selected.name}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{selected.email}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">License: {selected.licenseNumber}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${driverStatusClass(selected.status)}`}>
                                        {selected.status}
                                    </span>
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${runtimeClass(selected.runtime)}`}>
                                        {selected.runtime}
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <p className="text-xs text-slate-500">Completed Deliveries</p>
                                    <p className="text-xl font-bold text-emerald-700 mt-1">{selected.deliveredDrops}</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <p className="text-xs text-slate-500">Total KM Completed Trips</p>
                                    <p className="text-xl font-bold text-blue-700 mt-1">{selected.totalKm.toFixed(1)} km</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <p className="text-xs text-slate-500">Active Trip Progress</p>
                                    <p className="text-xl font-bold text-amber-700 mt-1">{selected.activeProgressKm.toFixed(1)} km</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <p className="text-xs text-slate-500">Time Taken (Active Trip)</p>
                                    <p className="text-xl font-bold text-indigo-700 mt-1">
                                        {selected.activeTrip ? formatDurationFromMinutes(selected.activeTripDurationMinutes) : "N/A"}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <p className="text-xs text-slate-500">Break Time</p>
                                    <p className="text-xl font-bold text-slate-800 mt-1">
                                        {formatDurationFromMinutes(selected.totalBreakMinutesLive)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <p className="text-xs text-slate-500">Completed Trips</p>
                                    <p className="text-xl font-bold text-slate-900 mt-1">{selected.completedTripsCount}</p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200 p-3 space-y-1">
                                <p className="text-xs font-semibold text-slate-700">Current / Live Location</p>
                                <p className="text-sm text-slate-900">{selected.currentAddress}</p>
                                <p className="text-xs text-slate-500">
                                    {selected.currentLat !== null && selected.currentLng !== null
                                        ? `Lat ${selected.currentLat.toFixed(6)} | Lng ${selected.currentLng.toFixed(6)}`
                                        : "Coordinates unavailable"}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Updated:{" "}
                                    {selected.currentLocationUpdatedAt
                                        ? new Date(selected.currentLocationUpdatedAt).toLocaleString()
                                        : "N/A"}
                                </p>
                                {selected.lastDeliveryProof && (
                                    <p className="text-xs text-emerald-700 font-semibold">
                                        Last delivery proof: {selected.lastDeliveryProof.address}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <p className="text-xs font-semibold text-slate-700 mb-2">Active Trip</p>
                                    {!selected.activeTrip && (
                                        <p className="text-sm text-slate-500">No active trip currently assigned.</p>
                                    )}
                                    {selected.activeTrip && (
                                        <div className="space-y-1 text-sm text-slate-700">
                                            <p className="font-semibold">#{selected.activeTrip.id.toUpperCase()}</p>
                                            <p>Vehicle: {selected.currentVehicle?.plateNumber || "Unassigned"}</p>
                                            <p>Route start: {selected.activeTrip.startLocation.address}</p>
                                            <p>
                                                Stops delivered:{" "}
                                                {selected.activeTrip.drops.filter((drop) => drop.status === "delivered").length}/
                                                {selected.activeTrip.drops.length}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <p className="text-xs font-semibold text-slate-700 mb-2">Control</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void toggleLiveStatus(selected.id, !selected.isLive);
                                        }}
                                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        Keep Live Tracking Enabled
                                    </button>
                                </div>
                            </div>

                            {mapVehicle.length > 0 && (
                                <div className="rounded-lg overflow-hidden border border-gray-200">
                                    <VehicleMap vehicles={mapVehicle} />
                                </div>
                            )}
                        </>
                    )}
                </article>
            </section>
        </div>
    );
}
