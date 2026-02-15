"use client";

import dynamic from 'next/dynamic';
import { Trip } from '@/lib/types';
import { MapPinIcon, GlobeAmericasIcon, ArrowRightIcon } from '@heroicons/react/24/outline'; // Updated icons for maps

const RouteMapContent = dynamic(() => import('./RouteMapComponent'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-medium">Calculating Optimal Route...</div>
});

export default function RouteMap({ trip }: { trip: Trip }) {
    // Mock Stats for the Route - would come from Google API in real impl
    const mockRouteStats = {
        distance: "45.2 km",
        duration: "1h 12m",
        fuelSaved: "1.2 L (Eco Mode)",
        traffic: "Light"
    };

    return (
        <div className='h-full flex flex-col space-y-4'>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg text-green-600">
                        <GlobeAmericasIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Eco-Route Selected</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-lg font-bold text-slate-800">{mockRouteStats.distance}</h3>
                            <span className="text-xs text-slate-400">• {mockRouteStats.duration}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full border border-green-100">
                        ♻️ {mockRouteStats.fuelSaved}
                    </p>
                </div>
            </div>

            <div className='flex-1 w-full rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm relative z-0 h-[400px]'>
                <RouteMapContent trip={trip} />

                <div className="absolute bottom-4 left-4 right-4 z-[500]">
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${trip.startLocation.lat},${trip.startLocation.lng}&destination=${trip.drops[trip.drops.length - 1].lat},${trip.drops[trip.drops.length - 1].lng}&waypoints=${trip.drops.slice(0, -1).map(d => `${d.lat},${d.lng}`).join('|')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 text-lg"
                    >
                        <ArrowRightIcon className="w-6 h-6" /> Start Turn-by-Turn Navigation
                    </a>
                </div>
            </div>
        </div>
    );
}
