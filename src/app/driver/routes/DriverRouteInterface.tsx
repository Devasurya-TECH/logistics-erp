"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
    TruckIcon,
    ArrowPathIcon,
    MapPinIcon,
    CheckCircleIcon,
    PlayCircleIcon,
    CalendarDaysIcon,
    ChevronDoubleRightIcon,
    StopIcon
} from '@heroicons/react/24/outline';
import { Trip, DropPoint } from '@/lib/types';
import { useStore } from '@/lib/store';
import { estimateTime } from '@/lib/utils/optimizer';

// Dynamic import for the Map component
const FuelOptimizedMapContent = dynamic(() => import('@/components/maps/FuelOptimizedMapContent'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-50 animate-pulse flex items-center justify-center text-slate-400">Loading Route Engine...</div>
});

interface DriverRouteMapProps {
    trip?: Trip;
}

export default function DriverRouteMap({ trip: propTrip }: DriverRouteMapProps) {
    const { updateDropStatus, updateTripStatus } = useStore();
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    // Use local state for trip if it's passed, or ideally update the global store. 
    // For now, we assume propTrip IS the current state from store.
    const [isNavigating, setIsNavigating] = useState(false);

    if (!propTrip) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border border-gray-200">
                <div className="text-center p-8">
                    <TruckIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">No Active Route</h3>
                    <p className="text-slate-400 text-sm">Waiting for new assignments...</p>
                </div>
            </div>
        );
    }

    const activeDrops = propTrip.drops.filter(d => d.status !== 'delivered' && d.status !== 'failed');
    const completedDrops = propTrip.drops.filter(d => d.status === 'delivered');
    const currentStop = propTrip.drops[currentStopIndex];

    // Auto-advance logic if current stop is completed
    if (currentStop && currentStop.status === 'delivered' && currentStopIndex < propTrip.drops.length - 1) {
        setCurrentStopIndex(currentStopIndex + 1);
    }

    const handleStartTrip = () => {
        setIsNavigating(true);
        updateTripStatus(propTrip.id, 'in-progress');
    };

    const handleMarkDelivered = (dropId: string) => {
        updateDropStatus(propTrip.id, dropId, 'delivered');
        // Logic to move to next stop is handled by re-render or useEffect, but here simple state update is fine
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-4">

            {/* LEFT: Route Summary & Controls Panel */}
            <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto">
                {/* Status Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <TruckIcon className="w-32 h-32 text-blue-900" />
                    </div>

                    <div className="relative z-10">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Current Assignment</h3>
                        <h2 className="text-2xl font-black text-slate-800 mb-2 truncate" title={propTrip.id}>Route #{propTrip.id.substring(0, 8)}</h2>

                        <div className="flex gap-4 mt-4">
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{activeDrops.length}</p>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Stops Left</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{propTrip.estimatedDistance} <span className="text-sm font-medium text-slate-400">km</span></p>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Total Dist</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{estimateTime(propTrip.estimatedDistance)}</p>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Est. Time</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                            {!isNavigating ? (
                                <button
                                    onClick={handleStartTrip}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <PlayCircleIcon className="w-6 h-6" /> Start Route
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="text-xs text-green-600 font-bold bg-green-50 px-3 py-2 rounded-lg border border-green-100 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        Navigation Active • Optimized Route
                                    </div>
                                    <button
                                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${currentStop.lat},${currentStop.lng}`, '_blank')}
                                    >
                                        <ArrowPathIcon className="w-5 h-5" /> Open Google Maps
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Current Stop Card (Active) */}
                {currentStop && currentStop.status !== 'delivered' && (
                    <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-lg shadow-blue-200 animate-fade-in">
                        <div className="flex justify-between items-start mb-4">
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm border border-white/20">
                                Next Stop • #{currentStopIndex + 1}
                            </span>
                            <span className="text-xs font-medium text-blue-100 mt-1">
                                Priority: {currentStop.priority || 'Normal'}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold mb-1">{currentStop.customerName}</h3>
                        <p className="text-blue-100 text-sm mb-4 leading-relaxed opacity-90">{currentStop.address}</p>

                        <div className="bg-white/10 rounded-lg p-3 mb-4 backdrop-blur-sm border border-white/10">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-blue-200">Order ID</span>
                                <span className="font-mono font-bold">{currentStop.orderId || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-blue-200">Ref No</span>
                                <span className="font-mono font-bold">{currentStop.id}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => handleMarkDelivered(currentStop.id)}
                            className="w-full py-3 bg-white text-blue-700 font-bold rounded-xl shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <CheckCircleIcon className="w-5 h-5" /> Mark Delivered
                        </button>
                    </div>
                )}

                {/* Remaining Route List */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Itinerary</h3>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                        {propTrip.drops.map((drop, idx) => (
                            <div
                                key={drop.id}
                                className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${drop.status === 'delivered' ? 'bg-green-50/50 opacity-60' :
                                    idx === currentStopIndex ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${drop.status === 'delivered' ? 'bg-green-100 text-green-600' :
                                    idx === currentStopIndex ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-slate-500'
                                    }`}>
                                    {drop.status === 'delivered' ? <CheckCircleIcon className="w-5 h-5" /> : idx + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className={`text-sm font-bold truncate ${drop.status === 'delivered' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                        {drop.customerName}
                                    </h4>
                                    <p className="text-xs text-slate-400 truncate">{drop.address}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: Map Visualization */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
                <FuelOptimizedMapContent
                    start={[propTrip.startLocation.lat, propTrip.startLocation.lng]}
                    end={[propTrip.drops[propTrip.drops.length - 1].lat, propTrip.drops[propTrip.drops.length - 1].lng]}
                    waypoints={activeDrops.map(d => [d.lat, d.lng] as [number, number])} // Only show remaining active waypoints for cleaner map or show all? Let's show all but style differently in map component if possible, but simplest is sending all. 
                // Actually, let's send ALL drops to the map component, but maybe we need to update the Map Component to accept Trip object to render proper markers.
                // For now, re-using the props it accepts: waypoints.
                />

                {/* Map Overlay Controls */}
                <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                    <button className="bg-white p-2 rounded-lg shadow-md text-slate-600 hover:text-blue-600 transition-colors" title="Recalculate Route">
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>
                    <button className="bg-white p-2 rounded-lg shadow-md text-slate-600 hover:text-blue-600 transition-colors" title="Center on Me">
                        <MapPinIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
