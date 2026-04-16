"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import VehicleMap from "@/components/maps/VehicleMap";

type ViewMode = "all" | "moving" | "idle" | "offline";

function vehicleClass(status: string) {
    if (status === "active") return "bg-emerald-100 text-emerald-700";
    if (status === "maintenance") return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
}

export default function SupervisorTrackingPage() {
    const { vehicles, trips, drivers, alerts, updateVehicleLocation } = useStore();
    const [viewMode, setViewMode] = useState<ViewMode>("all");
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [autoSimulate, setAutoSimulate] = useState(true);

    const enriched = useMemo(() => {
        return vehicles.map((vehicle) => {
            const activeTrip = trips.find(
                (trip) =>
                    trip.vehicleId === vehicle.id &&
                    (trip.status === "in-progress" || trip.status === "assigned"),
            );
            const driver = activeTrip
                ? drivers.find((candidate) => candidate.id === activeTrip.driverId)
                : null;

            let runtimeState: "moving" | "idle" | "offline" = "idle";
            if (!driver?.isLive) runtimeState = "offline";
            else if (activeTrip?.status === "in-progress") runtimeState = "moving";

            const emergency = alerts.some(
                (alert) =>
                    !alert.resolved &&
                    alert.severity === "critical" &&
                    (alert.vehicleId === vehicle.id || alert.tripId === activeTrip?.id),
            );

            return {
                vehicle,
                activeTrip,
                driver,
                runtimeState,
                emergency,
            };
        });
    }, [vehicles, trips, drivers, alerts]);

    const filtered = enriched.filter((item) => {
        if (viewMode === "all") return true;
        return item.runtimeState === viewMode;
    });

    const movingVehicles = useMemo(
        () => enriched.filter((item) => item.runtimeState === "moving").map((item) => item.vehicle),
        [enriched],
    );

    const selected = enriched.find((item) => item.vehicle.id === selectedVehicleId) || null;

    const movingCount = enriched.filter((item) => item.runtimeState === "moving").length;
    const idleCount = enriched.filter((item) => item.runtimeState === "idle").length;
    const offlineCount = enriched.filter((item) => item.runtimeState === "offline").length;

    useEffect(() => {
        if (!autoSimulate || movingVehicles.length === 0) return;

        const interval = setInterval(() => {
            movingVehicles.forEach((vehicle) => {
                const lat = vehicle.location.lat + (Math.random() - 0.5) * 0.01;
                const lng = vehicle.location.lng + (Math.random() - 0.5) * 0.01;
                void updateVehicleLocation(vehicle.id, { lat, lng });
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [autoSimulate, movingVehicles, updateVehicleLocation]);

    return (
        <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-4">
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Total Vehicles</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{vehicles.length}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Moving</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{movingCount}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Idle</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{idleCount}</p>
                </article>
                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Offline</p>
                    <p className="text-2xl font-bold text-slate-600 mt-1">{offlineCount}</p>
                </article>
            </section>

            <section className="flex flex-wrap items-center gap-2">
                {(["all", "moving", "idle", "offline"] as ViewMode[]).map((mode) => (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => setViewMode(mode)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                            viewMode === mode
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-gray-200 text-slate-700"
                        }`}
                    >
                        {mode}
                    </button>
                ))}

                <button
                    type="button"
                    onClick={() => setAutoSimulate((prev) => !prev)}
                    className={`ml-auto px-3 py-2 rounded-lg text-sm font-semibold ${
                        autoSimulate
                            ? "bg-emerald-600 text-white"
                            : "bg-white border border-gray-200 text-slate-700"
                    }`}
                >
                    {autoSimulate ? "Live Simulation ON" : "Live Simulation OFF"}
                </button>
            </section>

            <section className="grid gap-5 xl:grid-cols-3">
                <article className="bg-white border border-gray-200 rounded-xl p-3 xl:col-span-2">
                    <div className="h-[520px] rounded-xl overflow-hidden border border-gray-200">
                        <VehicleMap vehicles={filtered.length > 0 ? filtered.map((item) => item.vehicle) : vehicles} />
                    </div>
                </article>

                <article className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Selected Vehicle</h3>
                    {!selected && <p className="text-sm text-slate-500">Select a vehicle from the list to inspect details.</p>}
                    {selected && (
                        <div className="space-y-2">
                            <div className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-900">{selected.vehicle.plateNumber}</p>
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${vehicleClass(selected.vehicle.status)}`}>
                                        {selected.vehicle.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{selected.vehicle.model}</p>
                                <p className="text-xs text-slate-500 mt-2">Driver: {selected.driver?.name || "Unassigned"}</p>
                                <p className="text-xs text-slate-500">
                                    Trip: {selected.activeTrip ? `#${selected.activeTrip.id.toUpperCase()}` : "N/A"}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Location: {selected.vehicle.location.lat.toFixed(5)}, {selected.vehicle.location.lng.toFixed(5)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const lat = selected.vehicle.location.lat + (Math.random() - 0.5) * 0.02;
                                    const lng = selected.vehicle.location.lng + (Math.random() - 0.5) * 0.02;
                                    void updateVehicleLocation(selected.vehicle.id, { lat, lng });
                                }}
                                className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Nudge Position
                            </button>
                        </div>
                    )}
                </article>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Fleet Tracking List</h3>
                <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar">
                    {filtered.map((item) => (
                        <div
                            key={item.vehicle.id}
                            className={`border rounded-lg p-3 ${
                                selectedVehicleId === item.vehicle.id ? "border-blue-300 bg-blue-50" : "border-gray-200"
                            }`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{item.vehicle.plateNumber}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{item.driver?.name || "Unassigned"}</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${vehicleClass(item.vehicle.status)}`}>
                                        {item.vehicle.status}
                                    </span>
                                    <span
                                        className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                                            item.runtimeState === "moving"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : item.runtimeState === "idle"
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-slate-100 text-slate-700"
                                        }`}
                                    >
                                        {item.runtimeState}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-slate-500 grid sm:grid-cols-2 gap-2">
                                <p>Trip: {item.activeTrip ? `#${item.activeTrip.id.toUpperCase()}` : "N/A"}</p>
                                <p>Fuel: {item.vehicle.fuelLevel}%</p>
                                <p>
                                    Lat: {item.vehicle.location.lat.toFixed(4)} | Lng: {item.vehicle.location.lng.toFixed(4)}
                                </p>
                                <p>Live: {item.driver?.isLive ? "Yes" : "No"}</p>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedVehicleId(item.vehicle.id)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-slate-700 hover:bg-slate-100"
                                >
                                    Focus
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const lat = item.vehicle.location.lat + (Math.random() - 0.5) * 0.01;
                                        const lng = item.vehicle.location.lng + (Math.random() - 0.5) * 0.01;
                                        void updateVehicleLocation(item.vehicle.id, { lat, lng });
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    Simulate Movement
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
