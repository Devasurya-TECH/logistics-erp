"use client";

import dynamic from 'next/dynamic';
import { Trip } from '@/lib/types';
import { GlobeAmericasIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { estimateTime, estimateFuelCost } from '@/lib/utils/optimizer';

const RouteMapContent = dynamic(() => import('./RouteMapComponent'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 mx-auto mb-3 flex items-center justify-center">
                    <GlobeAmericasIcon className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-400 font-medium text-sm">Calculating Optimal Route...</p>
            </div>
        </div>
    ),
});

export default function RouteMap({ trip }: { trip: Trip }) {
    const est = estimateTime(trip.estimatedDistance);
    const fuel = estimateFuelCost(trip.estimatedDistance);
    const pendingStops = trip.drops.filter(d => d.status !== 'delivered').length;

    return (
        <div className='flex flex-col space-y-3 pb-20 md:pb-0'>
            {/* Route Stats Bar */}
            <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-50 p-2 rounded-xl text-green-600 border border-green-100">
                            <GlobeAmericasIcon className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Eco-Route</p>
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <h3 className="text-base md:text-lg font-black text-slate-800">{trip.estimatedDistance} km</h3>
                                <span className="text-xs text-slate-400 font-medium">• {est}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                            ⛽ {fuel.litres}L · ₹{fuel.cost}
                        </span>
                        <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                            📍 {pendingStops} stops left
                        </span>
                    </div>
                </div>
            </div>

            {/* Map Container - responsive height */}
            <div className='w-full rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm relative z-0 map-container'>
                <RouteMapContent trip={trip} />

                {/* Navigation CTA */}
                <div className="absolute bottom-3 left-3 right-3 md:bottom-4 md:left-4 md:right-4 z-[500]">
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${trip.drops[trip.drops.length - 1].lat},${trip.drops[trip.drops.length - 1].lng}&waypoints=${trip.drops.slice(0, -1).map(d => `${d.lat},${d.lng}`).join('|')}&travelmode=driving&dir_action=navigate`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 md:py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.97] text-sm md:text-base"
                    >
                        <ArrowRightIcon className="w-5 h-5 md:w-6 md:h-6" /> Start Navigation
                    </a>
                </div>
            </div>
        </div>
    );
}
