"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
    MapPinIcon,
    TruckIcon,
    BoltIcon, // Using BoltIcon as a proxy for "Fuel/Energy"
    ClockIcon,
    ArrowPathIcon,
    AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

const MapContent = dynamic(() => import('./FuelOptimizedMapContent'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-medium">Loading Map Engine...</div>
});

const DEFAULT_LOCATIONS = {
    "Kochin Port": [9.9312, 76.2673] as [number, number],
    "Trivandrum Hub": [8.5241, 76.9366] as [number, number],
    "Kozhikode Center": [11.2588, 75.7804] as [number, number],
    "Bangalore HQ": [12.9716, 77.5946] as [number, number],
    "Chennai Port": [13.0827, 80.2707] as [number, number]
};

export default function FuelOptimizedMap() {
    const [start, setStart] = useState<keyof typeof DEFAULT_LOCATIONS>("Kochin Port");
    const [end, setEnd] = useState<keyof typeof DEFAULT_LOCATIONS>("Trivandrum Hub");
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [stats, setStats] = useState({
        distance: "210 km",
        time: "4h 30m",
        fuelSaved: "12.5 L",
        co2Saved: "32 kg"
    });

    const handleOptimize = () => {
        setIsOptimizing(true);
        // Simulate API call delay
        setTimeout(() => {
            // Mock new stats based on selections (randomized slightly for effect)
            setStats({
                distance: `${Math.floor(Math.random() * 100 + 150)} km`,
                time: `${Math.floor(Math.random() * 3 + 2)}h ${Math.floor(Math.random() * 59)}m`,
                fuelSaved: `${(Math.random() * 5 + 5).toFixed(1)} L`,
                co2Saved: `${Math.floor(Math.random() * 20 + 20)} kg`
            });
            setIsOptimizing(false);
        }, 1500);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
            {/* Header / Controls */}
            <div className="p-6 border-b border-gray-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <TruckIcon className="w-5 h-5 text-blue-600" />
                            Route Optimizer AI
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">AI-powered route planning for maximum fuel efficiency.</p>
                    </div>
                    <button className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <AdjustmentsHorizontalIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Origin</label>
                        <div className="relative">
                            <MapPinIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <select
                                value={start}
                                onChange={(e) => setStart(e.target.value as any)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all"
                            >
                                {Object.keys(DEFAULT_LOCATIONS).map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="md:col-span-4 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Destination</label>
                        <div className="relative">
                            <MapPinIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <select
                                value={end}
                                onChange={(e) => setEnd(e.target.value as any)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all"
                            >
                                {Object.keys(DEFAULT_LOCATIONS).map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="md:col-span-4">
                        <button
                            onClick={handleOptimize}
                            disabled={isOptimizing}
                            className={`w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-95 ${isOptimizing ? 'opacity-75 cursor-wait' : ''}`}
                        >
                            {isOptimizing ? (
                                <>Processing...</>
                            ) : (
                                <><BoltIcon className="w-5 h-5" /> Optimize Route</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative bg-slate-100">
                <MapContent
                    start={DEFAULT_LOCATIONS[start]}
                    end={DEFAULT_LOCATIONS[end]}
                />

                {/* Stats Overlay */}
                <div className="absolute top-4 right-4 z-[400] w-64 space-y-3">
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-emerald-100 shadow-lg">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <BoltIcon className="w-3 h-3" /> Eco-Savings
                        </p>
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-2xl font-black text-slate-800">{stats.fuelSaved}</span>
                                <span className="text-xs text-slate-500 font-medium block">Fuel Saved</span>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-slate-800">{stats.co2Saved}</span>
                                <span className="text-xs text-slate-500 font-medium block">CO₂ Reduced</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-blue-100 shadow-lg">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <ClockIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-800">{stats.time}</p>
                                    <p className="text-xs text-slate-500 font-medium">Estimated Time</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-700">{stats.distance}</p>
                                <p className="text-xs text-slate-500 font-medium">Total Distance</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Google Maps Link */}
                <div className="absolute bottom-4 left-4 z-[400]">
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${DEFAULT_LOCATIONS[start][0]},${DEFAULT_LOCATIONS[start][1]}&destination=${DEFAULT_LOCATIONS[end][0]},${DEFAULT_LOCATIONS[end][1]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white hover:bg-gray-50 text-slate-700 font-bold text-sm rounded-lg shadow-md border border-gray-200 flex items-center gap-2 transition-colors"
                    >
                        <ArrowPathIcon className="w-4 h-4" /> Open in Google Maps
                    </a>
                </div>
            </div>
        </div>
    );
}
