"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
    TruckIcon,
    ArrowPathIcon,
    MapPinIcon,
    CheckCircleIcon,
    PlayCircleIcon,
    ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';
import { Trip, DropPoint } from '@/lib/types';
import { useStore } from '@/lib/store';
import { estimateTime, estimateFuelCost } from '@/lib/utils/optimizer';

const FuelOptimizedMapContent = dynamic(() => import('@/components/maps/FuelOptimizedMapContent'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-50 animate-pulse flex items-center justify-center text-slate-400 font-medium rounded-2xl">Loading Route Engine...</div>
});

interface DriverRouteMapProps {
    trip?: Trip;
}

export default function DriverRouteMap({ trip: propTrip }: DriverRouteMapProps) {
    const { updateDropStatus, updateTripStatus } = useStore();
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [isNavigating, setIsNavigating] = useState(false);

    if (!propTrip) {
        return (
            <div className="flex items-center justify-center py-16 md:py-24 bg-white rounded-2xl border border-gray-200">
                <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 mx-auto mb-4 flex items-center justify-center">
                        <TruckIcon className="w-8 h-8 text-slate-200" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-600">No Active Route</h3>
                    <p className="text-slate-400 text-sm mt-1">Waiting for trip assignments...</p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-500 font-bold bg-blue-50 rounded-full px-4 py-2 mx-auto w-fit">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        Auto-syncing
                    </div>
                </div>
            </div>
        );
    }

    const activeDrops = propTrip.drops.filter(d => d.status !== 'delivered' && d.status !== 'failed');
    const completedDrops = propTrip.drops.filter(d => d.status === 'delivered');
    const currentStop = propTrip.drops[currentStopIndex];
    const fuelEst = estimateFuelCost(propTrip.estimatedDistance);

    if (currentStop && currentStop.status === 'delivered' && currentStopIndex < propTrip.drops.length - 1) {
        setCurrentStopIndex(currentStopIndex + 1);
    }

    const handleStartTrip = () => {
        setIsNavigating(true);
        updateTripStatus(propTrip.id, 'in-progress');
    };

    const handleMarkDelivered = (dropId: string) => {
        updateDropStatus(propTrip.id, dropId, 'delivered');
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 pb-24 md:pb-4">

            {/* LEFT Panel */}
            <div className="w-full lg:w-[380px] xl:w-96 flex flex-col gap-3 shrink-0 order-2 lg:order-1">

                {/* Status Card */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <TruckIcon className="w-32 h-32 text-blue-900" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Assignment</h3>
                                <h2 className="text-xl font-black text-slate-800 truncate" title={propTrip.id}>#{propTrip.id}</h2>
                            </div>
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider border ${isNavigating
                                    ? 'bg-green-50 text-green-600 border-green-200'
                                    : 'bg-amber-50 text-amber-600 border-amber-200'
                                }`}>
                                {isNavigating ? '● Active' : '● Ready'}
                            </span>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-2 mt-3">
                            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                <p className="text-lg md:text-xl font-black text-slate-800">{activeDrops.length}</p>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Stops Left</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                <p className="text-lg md:text-xl font-black text-slate-800">{propTrip.estimatedDistance}<span className="text-[10px] font-medium text-slate-400">km</span></p>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Distance</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                <p className="text-lg md:text-xl font-black text-slate-800">{fuelEst.litres}<span className="text-[10px] font-medium text-slate-400">L</span></p>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Fuel Est.</p>
                            </div>
                        </div>

                        {/* Action area */}
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
                            {!isNavigating ? (
                                <button
                                    onClick={handleStartTrip}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-[0.97] text-sm"
                                >
                                    <PlayCircleIcon className="w-6 h-6" /> Start Route
                                </button>
                            ) : (
                                <>
                                    <div className="text-xs text-green-600 font-bold bg-green-50 px-3 py-2.5 rounded-xl border border-green-100 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        Navigation Active · Fuel-Optimized
                                    </div>
                                    <button
                                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all text-sm shadow-md shadow-blue-200 active:scale-[0.97]"
                                        onClick={() => {
                                            const origin = `${propTrip.startLocation.lat},${propTrip.startLocation.lng}`;
                                            const remainingDrops = propTrip.drops.filter(d => d.status !== 'delivered');
                                            if (remainingDrops.length === 0) return;
                                            const destination = `${remainingDrops[remainingDrops.length - 1].lat},${remainingDrops[remainingDrops.length - 1].lng}`;
                                            const waypointDrops = remainingDrops.slice(0, -1);
                                            const waypointsParam = waypointDrops.length > 0
                                                ? `&waypoints=${waypointDrops.map(d => `${d.lat},${d.lng}`).join('|')}`
                                                : '';
                                            window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=driving`, '_blank');
                                        }}
                                    >
                                        🗺️ Open in Google Maps
                                    </button>
                                    <button
                                        className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-slate-600 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm border border-gray-200"
                                        onClick={() => {
                                            if (currentStop) {
                                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${currentStop.lat},${currentStop.lng}&travelmode=driving`, '_blank');
                                            }
                                        }}
                                    >
                                        <MapPinIcon className="w-5 h-5" /> Next Stop Only
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Current Stop Card */}
                {currentStop && currentStop.status !== 'delivered' && isNavigating && (
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 md:p-5 rounded-2xl shadow-xl shadow-blue-200 animate-fade-in-up relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
                        <div className="relative">
                            <div className="flex justify-between items-start mb-3">
                                <span className="bg-white/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm border border-white/20">
                                    Stop #{currentStopIndex + 1} of {propTrip.drops.length}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentStop.priority === 'high' ? 'bg-red-400/30 text-red-100' : 'bg-white/10 text-blue-200'
                                    }`}>
                                    {currentStop.priority || 'Medium'} Priority
                                </span>
                            </div>

                            <h3 className="text-lg md:text-xl font-extrabold mb-1">{currentStop.customerName}</h3>
                            <p className="text-blue-200 text-sm mb-4 leading-relaxed">{currentStop.address}</p>

                            <div className="bg-white/10 rounded-xl p-3 mb-4 backdrop-blur-sm border border-white/10 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-blue-300 block">Order</span>
                                    <span className="font-mono font-bold">{currentStop.orderId || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-blue-300 block">Ref</span>
                                    <span className="font-mono font-bold text-[11px]">{currentStop.id.substring(0, 16)}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => handleMarkDelivered(currentStop.id)}
                                className="w-full py-3.5 bg-white text-blue-700 font-extrabold rounded-xl shadow-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
                            >
                                <CheckCircleIcon className="w-5 h-5" /> Mark Delivered
                            </button>
                        </div>
                    </div>
                )}

                {/* Itinerary List */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-3.5 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Itinerary</h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                            {completedDrops.length}/{propTrip.drops.length} done
                        </span>
                    </div>
                    <div className="overflow-y-auto max-h-[300px] lg:max-h-[400px] p-2 space-y-1 custom-scrollbar">
                        {propTrip.drops.map((drop, idx) => (
                            <div
                                key={drop.id}
                                className={`p-3 rounded-xl flex items-center gap-3 transition-all ${drop.status === 'delivered' ? 'bg-green-50/50 opacity-50' :
                                        idx === currentStopIndex ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'hover:bg-gray-50'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${drop.status === 'delivered' ? 'bg-green-100 text-green-600' :
                                        idx === currentStopIndex ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-slate-500'
                                    }`}>
                                    {drop.status === 'delivered' ? <CheckCircleIcon className="w-4 h-4" /> : idx + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className={`text-sm font-bold truncate ${drop.status === 'delivered' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                        {drop.customerName}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 truncate">{drop.address}</p>
                                </div>
                                {idx === currentStopIndex && drop.status !== 'delivered' && (
                                    <ChevronDoubleRightIcon className="w-4 h-4 text-blue-500 animate-pulse flex-shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: Map */}
            <div className="flex-1 rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative order-1 lg:order-2 map-container bg-white">
                <FuelOptimizedMapContent
                    start={[propTrip.startLocation.lat, propTrip.startLocation.lng]}
                    end={[propTrip.drops[propTrip.drops.length - 1].lat, propTrip.drops[propTrip.drops.length - 1].lng]}
                    waypoints={activeDrops.map(d => [d.lat, d.lng] as [number, number])}
                />

                {/* Map Overlay */}
                <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
                    <button className="bg-white/90 backdrop-blur-md p-2.5 rounded-xl shadow-lg text-slate-500 hover:text-blue-600 transition-colors border border-white/50 active:scale-95" title="Recalculate">
                        <ArrowPathIcon className="w-5 h-5" />
                    </button>
                    <button className="bg-white/90 backdrop-blur-md p-2.5 rounded-xl shadow-lg text-slate-500 hover:text-blue-600 transition-colors border border-white/50 active:scale-95" title="Center">
                        <MapPinIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
