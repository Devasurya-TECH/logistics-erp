"use client";

import { Trip } from "@/lib/types";
import { useState } from "react";
import { format } from "date-fns";

interface TripListProps {
    trips: Trip[];
}

export default function TripList({ trips }: TripListProps) {
    const [filter, setFilter] = useState("all");

    const filteredTrips = filter === "all" ? trips : trips.filter((t) => t.status === filter);

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm w-full p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recent Activity</h2>
                <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                    {(['all', 'planned', 'in-progress'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wider ${filter === s
                                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {s.replace("-", " ")}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 uppercase bg-gray-50/50 border-b border-gray-100 font-semibold">
                        <tr>
                            <th scope="col" className="px-6 py-4">Trip ID</th>
                            <th scope="col" className="px-6 py-4">Timeline</th>
                            <th scope="col" className="px-6 py-4">Status</th>
                            <th scope="col" className="px-6 py-4">Driver</th>
                            <th scope="col" className="px-6 py-4">Vehicle</th>
                            <th scope="col" className="px-6 py-4 text-right">Distance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredTrips.map((trip) => (
                            <tr key={trip.id} className="bg-white hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap group-hover:text-blue-600 transition-colors">
                                    #{trip.id.toUpperCase()}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-slate-800 font-medium truncate max-w-[150px]">{trip.startLocation.address}</div>
                                    <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                                        {trip.startTime ? format(new Date(trip.startTime), "PP p") : "Not started"}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${trip.status === "completed"
                                                ? "bg-green-50 text-green-700 border-green-100"
                                                : trip.status === "in-progress"
                                                    ? "bg-blue-50 text-blue-700 border-blue-100 animate-pulse"
                                                    : trip.status === "assigned"
                                                        ? "bg-yellow-50 text-yellow-700 border-yellow-100"
                                                        : "bg-gray-100 text-slate-600 border-gray-200"
                                            }`}
                                    >
                                        {trip.status.replace("-", " ")}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {trip.driverId ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">
                                                {trip.driverId.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-slate-600 font-medium">Driver {trip.driverId}</span>
                                        </div>
                                    ) : <span className="text-slate-400 italic text-xs">Unassigned</span>}
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                    {trip.vehicleId ? trip.vehicleId : <span className="text-slate-300">--</span>}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-slate-800">{trip.estimatedDistance} km</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTrips.length === 0 && (
                    <div className="p-12 text-center text-slate-400 text-sm">No trips found matching filter.</div>
                )}
            </div>
        </div>
    );
}
