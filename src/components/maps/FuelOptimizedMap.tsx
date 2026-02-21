"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
    TruckIcon,
    BoltIcon,
    ClockIcon,
    ArrowPathIcon,
    AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import AddressInput from '@/components/common/AddressInput';

const MapContent = dynamic(() => import('./FuelOptimizedMapContent'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-medium">Loading Map Engine...</div>
});

export default function FuelOptimizedMap() {
    const [startLabel, setStartLabel] = useState('');
    const [endLabel, setEndLabel] = useState('');
    const [startCoords, setStartCoords] = useState<[number, number]>([9.9312, 76.2673]); // Kochi default
    const [endCoords, setEndCoords] = useState<[number, number]>([8.5241, 76.9366]); // Trivandrum default
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [hasStart, setHasStart] = useState(false);
    const [hasEnd, setHasEnd] = useState(false);
    const [stats, setStats] = useState({
        distance: "---",
        time: "---",
        fuelSaved: "---",
        co2Saved: "---"
    });

    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLng = (lng2 - lng1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleOptimize = () => {
        if (!hasStart || !hasEnd) {
            return;
        }
        setIsOptimizing(true);
        setTimeout(() => {
            const dist = calculateDistance(startCoords[0], startCoords[1], endCoords[0], endCoords[1]);
            const roadDist = dist * 1.3; // Rough road-distance multiplier
            const timeHrs = roadDist / 45; // Avg 45 km/h
            const timeMins = Math.round(timeHrs * 60);
            const h = Math.floor(timeMins / 60);
            const m = timeMins % 60;
            const fuelSaved = (roadDist * 0.05).toFixed(1); // ~5% savings via eco-route
            const co2Saved = Math.round(parseFloat(fuelSaved) * 2.6); // ~2.6 kg CO2 per liter

            setStats({
                distance: `${Math.round(roadDist)} km`,
                time: `${h}h ${m}m`,
                fuelSaved: `${fuelSaved} L`,
                co2Saved: `${co2Saved} kg`
            });
            setIsOptimizing(false);
        }, 1200);
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
                        <p className="text-sm text-slate-500 mt-1">Type any place name — AI finds it & optimizes the route.</p>
                    </div>
                    <button className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <AdjustmentsHorizontalIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Origin</label>
                        <AddressInput
                            value={startLabel}
                            onChange={(address, lat, lng) => {
                                setStartLabel(address);
                                setStartCoords([lat, lng]);
                                setHasStart(true);
                            }}
                            placeholder="e.g. Kochi Port, Ernakulam..."
                        />
                        {hasStart && (
                            <p className="text-[10px] text-emerald-500 font-medium ml-1">✓ Located on map</p>
                        )}
                    </div>

                    <div className="md:col-span-4 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Destination</label>
                        <AddressInput
                            value={endLabel}
                            onChange={(address, lat, lng) => {
                                setEndLabel(address);
                                setEndCoords([lat, lng]);
                                setHasEnd(true);
                            }}
                            placeholder="e.g. Trivandrum, Thrissur..."
                        />
                        {hasEnd && (
                            <p className="text-[10px] text-emerald-500 font-medium ml-1">✓ Located on map</p>
                        )}
                    </div>

                    <div className="md:col-span-4">
                        <button
                            onClick={handleOptimize}
                            disabled={isOptimizing || !hasStart || !hasEnd}
                            className={`w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-95 ${isOptimizing ? 'opacity-75 cursor-wait' : ''} ${!hasStart || !hasEnd ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    start={startCoords}
                    end={endCoords}
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
                        href={`https://www.google.com/maps/dir/?api=1&destination=${endCoords[0]},${endCoords[1]}&dir_action=navigate`}
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
