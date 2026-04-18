"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import AddressInput from "@/components/common/AddressInput";
import RouteMap from "@/components/maps/RouteMap";
import {
    calculateFuelSavings,
    calculateTotalDistance,
    estimateFuelCost,
    estimateTime,
    optimizeRoute,
} from "@/lib/utils/optimizer";
import type { DropPoint, Trip } from "@/lib/types";

type DeliveryFilter = "all" | "pending" | "delivered" | "failed";

interface DropDraft {
    id: string;
    customerName: string;
    address: string;
    lat: number | null;
    lng: number | null;
    priority: "high" | "medium" | "low";
}

const createDropDraft = (): DropDraft => ({
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    customerName: "",
    address: "",
    lat: null,
    lng: null,
    priority: "medium",
});

const segmentDistance = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) =>
    calculateTotalDistance(from, [
        {
            id: "segment",
            address: "segment",
            lat: to.lat,
            lng: to.lng,
            customerName: "segment",
            status: "pending",
        },
    ]);

export default function SupervisorDeliveriesPage() {
    const { user } = useAuth();
    const { trips, drivers, vehicles, addTrip, assignDriver } = useStore();

    const [startAddress, setStartAddress] = useState("Kochi Dispatch Hub");
    const [startLat, setStartLat] = useState<number | null>(9.9312);
    const [startLng, setStartLng] = useState<number | null>(76.2673);
    const [dropDrafts, setDropDrafts] = useState<DropDraft[]>([createDropDraft()]);
    const [createDriverId, setCreateDriverId] = useState("");
    const [createVehicleId, setCreateVehicleId] = useState("");

    const [filter, setFilter] = useState<DeliveryFilter>("all");
    const [search, setSearch] = useState("");

    const [assignmentState, setAssignmentState] = useState<
        Record<string, { driverId: string; vehicleId: string }>
    >({});

    const allDeliveries = useMemo(() => {
        return trips.flatMap((trip) =>
            trip.drops.map((drop) => ({
                ...drop,
                tripId: trip.id,
                tripStatus: trip.status,
                driverId: trip.driverId || "",
            })),
        );
    }, [trips]);

    const filteredDeliveries = allDeliveries.filter((delivery) => {
        const matchesFilter = filter === "all" || delivery.status === filter;
        const q = search.trim().toLowerCase();
        const matchesSearch =
            q.length === 0 ||
            delivery.customerName.toLowerCase().includes(q) ||
            delivery.address.toLowerCase().includes(q) ||
            delivery.tripId.toLowerCase().includes(q);
        return matchesFilter && matchesSearch;
    });

    const pendingTrips = trips.filter(
        (trip) => trip.status === "planned" || !trip.driverId || !trip.vehicleId,
    );

    const busyDriverIds = new Set(
        trips
            .filter((trip) => trip.status === "assigned" || trip.status === "in-progress")
            .map((trip) => trip.driverId)
            .filter(Boolean) as string[],
    );
    const busyVehicleIds = new Set(
        trips
            .filter((trip) => trip.status === "assigned" || trip.status === "in-progress")
            .map((trip) => trip.vehicleId)
            .filter(Boolean) as string[],
    );

    const availableDrivers = drivers.filter(
        (driver) => driver.status === "available" && !busyDriverIds.has(driver.id),
    );
    const availableVehicles = vehicles.filter(
        (vehicle) => vehicle.status === "active" && !busyVehicleIds.has(vehicle.id),
    );

    const validDrops = useMemo(
        () =>
            dropDrafts
                .filter(
                    (draft) =>
                        draft.customerName.trim().length > 0 &&
                        draft.address.trim().length > 0 &&
                        draft.lat !== null &&
                        draft.lng !== null,
                )
                .map(
                    (draft) =>
                        ({
                            id: draft.id,
                            customerName: draft.customerName.trim(),
                            address: draft.address.trim(),
                            lat: draft.lat as number,
                            lng: draft.lng as number,
                            priority: draft.priority,
                            status: "pending",
                        }) as DropPoint,
                ),
        [dropDrafts],
    );

    const optimizedDrops = useMemo(() => {
        if (startLat === null || startLng === null || validDrops.length === 0) return [];
        return optimizeRoute({ lat: startLat, lng: startLng }, validDrops);
    }, [startLat, startLng, validDrops]);

    const baselineDistance = useMemo(() => {
        if (startLat === null || startLng === null || validDrops.length === 0) return 0;
        return calculateTotalDistance({ lat: startLat, lng: startLng }, validDrops);
    }, [startLat, startLng, validDrops]);

    const optimizedDistance = useMemo(() => {
        if (startLat === null || startLng === null || optimizedDrops.length === 0) return 0;
        return calculateTotalDistance({ lat: startLat, lng: startLng }, optimizedDrops);
    }, [startLat, startLng, optimizedDrops]);

    const routeTime = estimateTime(optimizedDistance);
    const fuelEstimate = estimateFuelCost(optimizedDistance);
    const savings =
        startLat !== null && startLng !== null && validDrops.length > 0
            ? calculateFuelSavings(
                  { lat: startLat, lng: startLng },
                  validDrops,
                  optimizedDrops.length > 0 ? optimizedDrops : validDrops,
              )
            : { savedKm: 0, savedLitres: 0, savedCost: 0 };

    const previewTrip: Trip | null =
        startLat !== null && startLng !== null && optimizedDrops.length > 0
            ? {
                  id: "preview",
                  status: "planned",
                  supervisorId: user?.id,
                  startLocation: {
                      address: startAddress,
                      lat: startLat,
                      lng: startLng,
                  },
                  drops: optimizedDrops,
                  estimatedDistance: optimizedDistance,
              }
            : null;

    const hasPartialCreateAssignment = Boolean(createDriverId) !== Boolean(createVehicleId);
    const canCreateTrip =
        startAddress.trim().length > 0 &&
        startLat !== null &&
        startLng !== null &&
        validDrops.length === dropDrafts.length &&
        validDrops.length > 0 &&
        !hasPartialCreateAssignment;

    return (
        <div className="space-y-5">
            <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Create Optimized Delivery Trip</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Use India place suggestions for start/drop, then auto-optimize route before assigning.
                        </p>
                    </div>
                    <div className="flex gap-2 text-[11px] font-semibold">
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            Distance: {optimizedDistance.toFixed(1)} km
                        </span>
                        <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            ETA: {routeTime}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                            Fuel: ₹{fuelEstimate.cost.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <div className="space-y-3">
                        <AddressInput
                            value={startAddress}
                            label="Starting Point"
                            placeholder="Search dispatch/start point in India"
                            onChange={(address, lat, lng) => {
                                setStartAddress(address);
                                setStartLat(lat);
                                setStartLng(lng);
                            }}
                        />

                        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-extrabold text-blue-800 uppercase tracking-wide">
                                    Assign Driver + Vehicle
                                </p>
                                <span className="text-[10px] font-bold text-blue-700 bg-white border border-blue-200 px-2 py-1 rounded-full">
                                    Highlighted
                                </span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <select
                                    value={createDriverId}
                                    onChange={(event) => setCreateDriverId(event.target.value)}
                                    className="border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">Select driver</option>
                                    {availableDrivers.map((driver) => (
                                        <option key={driver.id} value={driver.id}>
                                            {driver.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={createVehicleId}
                                    onChange={(event) => setCreateVehicleId(event.target.value)}
                                    className="border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">Select vehicle</option>
                                    {availableVehicles.map((vehicle) => (
                                        <option key={vehicle.id} value={vehicle.id}>
                                            {vehicle.plateNumber} • {vehicle.model}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {hasPartialCreateAssignment && (
                                <p className="text-[11px] font-semibold text-rose-600">
                                    Select both a driver and a vehicle, or leave both empty.
                                </p>
                            )}
                            {!hasPartialCreateAssignment && createDriverId && createVehicleId && (
                                <p className="text-[11px] font-semibold text-emerald-700">
                                    Trip will be auto-assigned when created.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            {dropDrafts.map((draft, index) => (
                                <div key={draft.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-semibold text-slate-700">Drop #{index + 1}</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDropDrafts((prev) => prev.filter((item) => item.id !== draft.id));
                                            }}
                                            disabled={dropDrafts.length <= 1}
                                            className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-gray-200 text-slate-600 disabled:opacity-40"
                                        >
                                            Remove
                                        </button>
                                    </div>

                                    <input
                                        value={draft.customerName}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setDropDrafts((prev) =>
                                                prev.map((item) =>
                                                    item.id === draft.id ? { ...item, customerName: value } : item,
                                                ),
                                            );
                                        }}
                                        placeholder="Customer / consignee name"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    />

                                    <AddressInput
                                        value={draft.address}
                                        label="Drop Location"
                                        placeholder="Search drop point in India"
                                        onChange={(address, lat, lng) => {
                                            setDropDrafts((prev) =>
                                                prev.map((item) =>
                                                    item.id === draft.id
                                                        ? { ...item, address, lat, lng }
                                                        : item,
                                                ),
                                            );
                                        }}
                                    />

                                    <select
                                        value={draft.priority}
                                        onChange={(event) => {
                                            const value = event.target.value as "high" | "medium" | "low";
                                            setDropDrafts((prev) =>
                                                prev.map((item) =>
                                                    item.id === draft.id ? { ...item, priority: value } : item,
                                                ),
                                            );
                                        }}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="high">High Priority</option>
                                        <option value="medium">Medium Priority</option>
                                        <option value="low">Low Priority</option>
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setDropDrafts((prev) => [...prev, createDropDraft()])}
                                className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-slate-700 text-sm font-semibold hover:bg-slate-100"
                            >
                                Add Drop
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!canCreateTrip || startLat === null || startLng === null) return;

                                    let currentPoint = { lat: startLat, lng: startLng };
                                    const dropsWithDistance = optimizedDrops.map((drop, index) => {
                                        const nextPoint = { lat: drop.lat, lng: drop.lng };
                                        const distanceFromPrev = segmentDistance(currentPoint, nextPoint);
                                        currentPoint = nextPoint;
                                        return {
                                            ...drop,
                                            id: `d-${Date.now()}-${index}`,
                                            distanceFromPrev,
                                        } as DropPoint;
                                    });

                                    const newTrip: Trip = {
                                        id: `t-${Date.now().toString().slice(-8)}`,
                                        status: "planned",
                                        supervisorId: user?.id,
                                        startLocation: {
                                            address: startAddress.trim(),
                                            lat: startLat,
                                            lng: startLng,
                                        },
                                        drops: dropsWithDistance,
                                        estimatedDistance: optimizedDistance,
                                    };

                                    void (async () => {
                                        await addTrip(newTrip);
                                        if (createDriverId && createVehicleId) {
                                            await assignDriver(newTrip.id, createDriverId, createVehicleId);
                                        }
                                        setDropDrafts([createDropDraft()]);
                                        setCreateDriverId("");
                                        setCreateVehicleId("");
                                    })();
                                }}
                                disabled={!canCreateTrip}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {createDriverId && createVehicleId ? "Create + Assign Trip" : "Create Optimized Trip"}
                            </button>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                            <div className="p-2 rounded-lg border border-gray-200 bg-slate-50">
                                <p className="text-slate-500">Original</p>
                                <p className="font-semibold text-slate-900">{baselineDistance.toFixed(1)} km</p>
                            </div>
                            <div className="p-2 rounded-lg border border-gray-200 bg-slate-50">
                                <p className="text-slate-500">Optimized</p>
                                <p className="font-semibold text-emerald-700">{optimizedDistance.toFixed(1)} km</p>
                            </div>
                            <div className="p-2 rounded-lg border border-gray-200 bg-slate-50">
                                <p className="text-slate-500">Saved</p>
                                <p className="font-semibold text-blue-700">{savings.savedKm.toFixed(1)} km</p>
                            </div>
                            <div className="p-2 rounded-lg border border-gray-200 bg-slate-50">
                                <p className="text-slate-500">Fuel Saved</p>
                                <p className="font-semibold text-amber-700">₹{savings.savedCost.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Optimized Route Preview</h4>
                        {!previewTrip && (
                            <div className="border border-dashed border-gray-300 rounded-xl p-6 text-sm text-slate-500">
                                Select start/drop locations from suggestions to preview route optimization.
                            </div>
                        )}
                        {previewTrip && (
                            <div className="rounded-xl overflow-hidden">
                                <RouteMap trip={previewTrip} />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Assign Driver & Vehicle</h3>
                {availableDrivers.length === 0 && (
                    <p className="mb-3 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        All drivers are currently assigned/in-progress. Complete current trips before assigning new ones.
                    </p>
                )}
                <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar">
                    {pendingTrips.length === 0 && (
                        <p className="text-sm text-slate-500">No trips waiting for assignment.</p>
                    )}
                    {pendingTrips.map((trip) => {
                        const selected = assignmentState[trip.id] || { driverId: "", vehicleId: "" };
                        return (
                            <div key={trip.id} className="border border-gray-200 rounded-lg p-3">
                                <p className="text-sm font-semibold text-slate-900">Trip #{trip.id.toUpperCase()}</p>
                                <p className="text-xs text-slate-500 mt-1">{trip.startLocation.address}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {trip.drops.length} drops • {trip.estimatedDistance} km
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2 mt-2">
                                    <select
                                        value={selected.driverId}
                                        onChange={(event) =>
                                            setAssignmentState((prev) => ({
                                                ...prev,
                                                [trip.id]: { ...selected, driverId: event.target.value },
                                            }))
                                        }
                                        className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
                                    >
                                        <option value="">Select driver</option>
                                        {availableDrivers.map((driver) => (
                                            <option key={driver.id} value={driver.id}>
                                                {driver.name}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={selected.vehicleId}
                                        onChange={(event) =>
                                            setAssignmentState((prev) => ({
                                                ...prev,
                                                [trip.id]: { ...selected, vehicleId: event.target.value },
                                            }))
                                        }
                                        className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
                                    >
                                        <option value="">Select vehicle</option>
                                        {availableVehicles.map((vehicle) => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {vehicle.plateNumber}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    disabled={!selected.driverId || !selected.vehicleId}
                                    onClick={() => {
                                        if (!selected.driverId || !selected.vehicleId) return;
                                        void assignDriver(trip.id, selected.driverId, selected.vehicleId);
                                    }}
                                    className="mt-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Assign
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                    {(["all", "pending", "delivered", "failed"] as DeliveryFilter[]).map((item) => (
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
                            {item}
                        </button>
                    ))}
                </div>
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search customer or trip..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
                />
                <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar">
                    {filteredDeliveries.map((delivery) => (
                        <div key={`${delivery.tripId}-${delivery.id}`} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">{delivery.customerName}</p>
                                <span
                                    className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                                        delivery.status === "delivered"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : delivery.status === "failed"
                                                ? "bg-rose-100 text-rose-700"
                                                : "bg-amber-100 text-amber-700"
                                    }`}
                                >
                                    {delivery.status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{delivery.address}</p>
                            <p className="text-xs text-slate-500 mt-1">
                                Trip #{delivery.tripId.toUpperCase()} • {delivery.tripStatus}
                            </p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
