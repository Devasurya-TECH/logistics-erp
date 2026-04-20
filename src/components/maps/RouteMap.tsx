"use client";

import dynamic from 'next/dynamic';
import { Trip } from '@/lib/types';
import { GlobeAmericasIcon } from '@heroicons/react/24/outline';
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
    const pendingStops = trip.drops.filter(d => d.status !== 'delivered' && d.status !== 'failed').length;

    return (
        <div className='flex flex-col space-y-3'>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-100/90 px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white p-2 text-blue-700 shadow-sm">
                        <GlobeAmericasIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Route Snapshot</p>
                        <p className="text-sm font-extrabold text-slate-900">{trip.estimatedDistance} km <span className="text-slate-400 font-semibold">• {est}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-700 shadow-sm">
                        {pendingStops} stops left
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
                        Fuel est. {fuel.litres}L
                    </span>
                </div>
            </div>

            <div className='relative z-0 overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200/70 map-container h-[300px] md:h-[340px]'>
                <RouteMapContent trip={trip} />
            </div>
        </div>
    );
}
