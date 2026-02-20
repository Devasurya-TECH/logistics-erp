"use client";

import { useStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { format } from "date-fns";
import { MapPinIcon, TruckIcon, MapIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import MultiDropTracker from "@/components/trips/MultiDropTracker";
import RouteMap from "@/components/maps/RouteMap";
import FuelTab from "@/components/common/FuelTab";
import { useSearchParams } from "next/navigation";
import { Trip } from "@/lib/types";
import { estimateFuelCost } from "@/lib/utils/optimizer";

export default function DriverDashboard() {
    return <DriverDashboardContent />;
}

function DriverDashboardContent() {
    const { user } = useAuth();
    const { trips } = useStore();
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') || 'overview';

    const myTrips = trips.filter(t => t.driverId === user?.id);
    const activeTrips = myTrips.filter(t => t.status === 'in-progress' || t.status === 'assigned');
    const completedTrips = myTrips.filter(t => t.status === 'completed');
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

    const currentTrip: Trip | undefined = activeTrips.find(t => t.id === selectedTripId) || activeTrips[0];

    if (activeTrips.length === 0) {
        return (
            <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
                <div className="p-8 md:p-12 text-center bg-white rounded-3xl shadow-sm border border-gray-100 max-w-sm w-full animate-scale-in">
                    <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 bg-slate-50 rounded-2xl flex items-center justify-center">
                        <TruckIcon className="w-10 h-10 md:w-12 md:h-12 text-slate-200" />
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-700">No Active Trips</h2>
                    <p className="text-sm mt-2 text-slate-400 leading-relaxed">You&apos;re currently off-duty. New assignments will appear here automatically.</p>
                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-blue-500 font-bold bg-blue-50 rounded-full px-4 py-2 mx-auto w-fit">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        Auto-syncing every 5s
                    </div>
                    {completedTrips.length > 0 && (
                        <div className="mt-6 pt-5 border-t border-gray-100">
                            <p className="text-xs text-slate-400 font-medium">
                                ✅ {completedTrips.length} trip{completedTrips.length !== 1 ? 's' : ''} completed today
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const pendingDrops = currentTrip?.drops.filter(d => d.status !== 'delivered') || [];
    const deliveredDrops = currentTrip?.drops.filter(d => d.status === 'delivered') || [];
    const fuelEst = currentTrip ? estimateFuelCost(currentTrip.estimatedDistance) : null;

    return (
        <div className="flex flex-col pb-24 md:pb-4 relative max-w-3xl mx-auto w-full">
            <div className="px-4 sm:px-0">
                {tab === 'overview' && (
                    <div className="space-y-4 animate-fade-in-up">

                        {/* Trip Selector — horizontal scroll on mobile */}
                        {activeTrips.length > 1 && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                    {activeTrips.length} active trips — swipe to switch
                                </p>
                                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
                                    {activeTrips.map((trip) => {
                                        const pDrops = trip.drops.filter(d => d.status !== 'delivered');
                                        const isSelected = trip.id === (currentTrip?.id);
                                        const progress = trip.drops.length > 0
                                            ? ((trip.drops.length - pDrops.length) / trip.drops.length) * 100
                                            : 0;
                                        return (
                                            <button
                                                key={trip.id}
                                                onClick={() => setSelectedTripId(trip.id)}
                                                className={`flex-shrink-0 p-3.5 rounded-2xl border-2 transition-all text-left min-w-[170px] snap-start active:scale-[0.97] ${isSelected
                                                    ? 'border-blue-500 bg-blue-50/80 shadow-lg shadow-blue-100'
                                                    : 'border-gray-200 bg-white hover:border-blue-200 shadow-sm'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isSelected ? 'text-blue-600' : 'text-slate-400'
                                                        }`}>
                                                        #{trip.id}
                                                    </span>
                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${trip.status === 'in-progress'
                                                        ? 'bg-green-100 text-green-600'
                                                        : 'bg-amber-100 text-amber-600'
                                                        }`}>
                                                        {trip.status === 'in-progress' ? '🟢 Live' : '🟡 Queued'}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-700 truncate mb-2">{trip.startLocation.address}</p>
                                                {/* Progress bar */}
                                                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                                                    <div
                                                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                                    <span>📍 {pDrops.length}/{trip.drops.length}</span>
                                                    <span>•</span>
                                                    <span>🛣️ {trip.estimatedDistance} km</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Current Trip Hero */}
                        {currentTrip && (
                            <>
                                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-5 md:p-7 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
                                    {/* Decorative elements */}
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>

                                    <div className="relative">
                                        {/* Top row */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">
                                                    {activeTrips.length > 1 ? `Trip ${activeTrips.indexOf(currentTrip) + 1} of ${activeTrips.length}` : 'Current Trip'}
                                                </p>
                                                <h3 className="text-xl md:text-3xl font-black tracking-tight tracking-tight">#{currentTrip.id}</h3>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider backdrop-blur-md border ${currentTrip.status === 'in-progress'
                                                    ? 'bg-green-500/20 text-green-200 border-green-400/30'
                                                    : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                                                    }`}>
                                                    {currentTrip.status === 'in-progress' ? '● In Progress' : '● Assigned'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Trip info */}
                                        <p className="text-blue-100 text-xs font-medium mb-1">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
                                        <p className="text-blue-200/80 text-xs font-medium flex items-center gap-1">
                                            <MapPinIcon className="w-3 h-3" /> From: {currentTrip.startLocation.address}
                                        </p>

                                        {/* Stats row */}
                                        <div className="grid grid-cols-3 gap-2 mt-5">
                                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/10">
                                                <p className="text-xl md:text-2xl font-black">{currentTrip.estimatedDistance}</p>
                                                <p className="text-[9px] uppercase tracking-wider text-blue-200 font-bold mt-0.5">km total</p>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/10">
                                                <p className="text-xl md:text-2xl font-black">{pendingDrops.length}</p>
                                                <p className="text-[9px] uppercase tracking-wider text-blue-200 font-bold mt-0.5">stops left</p>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/10">
                                                <p className="text-xl md:text-2xl font-black">{fuelEst?.litres || 0}L</p>
                                                <p className="text-[9px] uppercase tracking-wider text-blue-200 font-bold mt-0.5">est. fuel</p>
                                            </div>
                                        </div>

                                        {/* Google Maps CTA */}
                                        {pendingDrops.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    const origin = `${currentTrip.startLocation.lat},${currentTrip.startLocation.lng}`;
                                                    const destination = `${pendingDrops[pendingDrops.length - 1].lat},${pendingDrops[pendingDrops.length - 1].lng}`;
                                                    const waypointDrops = pendingDrops.slice(0, -1);
                                                    const waypointsParam = waypointDrops.length > 0
                                                        ? `&waypoints=${waypointDrops.map(d => `${d.lat},${d.lng}`).join('|')}`
                                                        : '';
                                                    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=driving`;
                                                    window.open(url, '_blank');
                                                }}
                                                className="w-full mt-5 py-3.5 bg-white text-blue-700 font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg text-sm hover:shadow-xl"
                                            >
                                                🗺️ Navigate in Google Maps
                                                <ChevronRightIcon className="w-4 h-4" />
                                            </button>
                                        )}

                                        {/* All delivered */}
                                        {pendingDrops.length === 0 && (
                                            <div className="mt-5 py-3.5 bg-green-500/20 text-green-200 font-bold rounded-2xl flex items-center justify-center gap-2 border border-green-400/30 text-sm">
                                                ✅ All {deliveredDrops.length} deliveries completed!
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Progress summary */}
                                {currentTrip.drops.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-slate-600">Delivery Progress</span>
                                                <span className="text-xs font-extrabold text-blue-600">
                                                    {deliveredDrops.length}/{currentTrip.drops.length}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                <div
                                                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                                                    style={{ width: `${(deliveredDrops.length / currentTrip.drops.length) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Stops timeline */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
                                    <MultiDropTracker trip={currentTrip} />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {tab === 'map' && currentTrip && (
                    <div className="animate-fade-in flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
                        <h2 className="text-xl font-extrabold text-slate-800 mb-4 px-1">Route & Navigation</h2>
                        <RouteMap trip={currentTrip} />
                    </div>
                )}

                {tab === 'fuel' && currentTrip && (
                    <div className="animate-fade-in">
                        <h2 className="text-xl font-extrabold text-slate-800 mb-4 px-1">Fuel & Expenses</h2>
                        <FuelTab tripId={currentTrip.id} />
                    </div>
                )}
            </div>
        </div>
    );
}
