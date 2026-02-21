"use client";

import { Trip } from "@/lib/types";
import { XMarkIcon, MapPinIcon, ClockIcon } from "@heroicons/react/24/outline";

interface TripSelectionModalProps {
    plannedTrips: Trip[];
    driverName: string;
    onSelect: (tripId: string) => void;
    onClose: () => void;
}

export default function TripSelectionModal({ plannedTrips, driverName, onSelect, onClose }: TripSelectionModalProps) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in px-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-extrabold text-slate-800">Assign Trip</h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">Assigning to <span className="text-blue-600">{driverName}</span></p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-all"
                    >
                        <XMarkIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                    {plannedTrips.length === 0 ? (
                        <div className="py-8 text-center">
                            <span className="text-4xl mb-3 block">📜</span>
                            <p className="text-slate-400 font-medium">No planned trips available</p>
                            <p className="text-[10px] text-slate-300 mt-1">Create a new trip first</p>
                        </div>
                    ) : (
                        plannedTrips.map(trip => (
                            <button
                                key={trip.id}
                                onClick={() => onSelect(trip.id)}
                                className="w-full text-left p-4 rounded-2xl border border-gray-100 bg-white hover:border-blue-500 hover:shadow-md hover:shadow-blue-50 transition-all group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                                        TRIP #{trip.id.toUpperCase()}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {trip.drops.length} stops
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                    <MapPinIcon className="w-3.5 h-3.5 text-slate-300" />
                                    <span className="truncate">{trip.startLocation.address}</span>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        🛣️ {trip.estimatedDistance} km
                                    </span>
                                    <span>•</span>
                                    <span>📦 Delivery Only</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white text-slate-600 font-bold rounded-xl border border-gray-200 text-sm hover:bg-gray-100 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
