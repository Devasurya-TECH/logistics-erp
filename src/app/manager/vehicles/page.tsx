"use client";

import { useStore } from "@/lib/store";

function statusClass(status: string): string {
    if (status === "active") return "bg-emerald-100 text-emerald-700";
    if (status === "maintenance") return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
}

export default function ManagerVehiclesPage() {
    const { vehicles, trips } = useStore();

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((vehicle) => {
                const activeTrip = trips.find(
                    (trip) =>
                        trip.vehicleId === vehicle.id &&
                        (trip.status === "in-progress" || trip.status === "assigned"),
                );

                return (
                    <article key={vehicle.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">{vehicle.plateNumber}</h3>
                                <p className="text-sm text-slate-500">{vehicle.model}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusClass(vehicle.status)}`}>
                                {vehicle.status}
                            </span>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                            <div className="flex items-center justify-between">
                                <span>Fuel Level</span>
                                <span className="font-semibold text-slate-800">{vehicle.fuelLevel}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                                    style={{ width: `${vehicle.fuelLevel}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Mileage</span>
                                <span className="font-semibold text-slate-800">
                                    {vehicle.mileage.toLocaleString()} km
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Fuel Type</span>
                                <span className="font-semibold text-slate-800 uppercase">
                                    {vehicle.fuelType || "N/A"}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                            {activeTrip ? (
                                <span>
                                    Assigned to trip <strong>#{activeTrip.id.toUpperCase()}</strong>
                                </span>
                            ) : (
                                <span>No active trip assigned.</span>
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

