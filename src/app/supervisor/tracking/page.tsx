"use client";

import { useStore } from "@/lib/store";
import { useMemo, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
    MapPinIcon,
    TruckIcon,
    UserIcon,
    SignalIcon,
    SignalSlashIcon,
    ArrowPathIcon,
    ChevronRightIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";

// Dynamic import for Leaflet map
const LiveTrackingMapContent = dynamic(() => import('@/components/maps/LiveTrackingMapContent'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full bg-slate-900 animate-pulse flex items-center justify-center rounded-2xl">
            <div className="text-center">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-xs font-medium">Loading map engine...</p>
            </div>
        </div>
    ),
});

// Simulated live positions
function useSimulatedPositions(vehicles: any[], trips: any[], drivers: any[]) {
    const [positions, setPositions] = useState<Map<string, {
        lat: number;
        lng: number;
        speed: number;
        heading: number;
        lastUpdate: Date;
        driverName: string;
        vehiclePlate: string;
        tripId: string | null;
        status: 'moving' | 'idle' | 'offline';
    }>>(new Map());

    useEffect(() => {
        const initial = new Map<string, any>();
        vehicles.forEach(v => {
            const trip = trips.find((t: any) => t.vehicleId === v.id && (t.status === 'in-progress' || t.status === 'assigned'));
            const driver = trip ? drivers.find((d: any) => d.id === trip.driverId) : null;

            initial.set(v.id, {
                lat: v.location.lat,
                lng: v.location.lng,
                speed: trip?.status === 'in-progress' ? Math.floor(Math.random() * 60) + 20 : 0,
                heading: Math.floor(Math.random() * 360),
                lastUpdate: new Date(),
                driverName: driver?.name || 'Unassigned',
                vehiclePlate: v.plateNumber,
                tripId: trip?.id || null,
                status: trip?.status === 'in-progress' ? 'moving' : v.status === 'active' ? 'idle' : 'offline',
            });
        });
        setPositions(initial);

        const interval = setInterval(() => {
            setPositions(prev => {
                const updated = new Map(prev);
                updated.forEach((pos, id) => {
                    if (pos.status === 'moving') {
                        const deltaLat = (Math.random() - 0.5) * 0.002;
                        const deltaLng = (Math.random() - 0.5) * 0.002;
                        updated.set(id, {
                            ...pos,
                            lat: pos.lat + deltaLat,
                            lng: pos.lng + deltaLng,
                            speed: Math.max(0, pos.speed + (Math.random() - 0.5) * 15),
                            heading: (pos.heading + (Math.random() - 0.5) * 30) % 360,
                            lastUpdate: new Date(),
                        });
                    }
                });
                return updated;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [vehicles.length]);

    return positions;
}

export default function TrackingPage() {
    const { trips, drivers, vehicles } = useStore();
    const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'all' | 'active' | 'idle'>('all');
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const positions = useSimulatedPositions(vehicles, trips, drivers);

    const handleRefresh = useCallback(() => {
        setLastRefresh(new Date());
    }, []);

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v => {
            const pos = positions.get(v.id);
            if (!pos) return false;
            if (viewMode === 'active') return pos.status === 'moving';
            if (viewMode === 'idle') return pos.status === 'idle' || pos.status === 'offline';
            return true;
        });
    }, [vehicles, positions, viewMode]);

    const activeCount = Array.from(positions.values()).filter(p => p.status === 'moving').length;
    const idleCount = Array.from(positions.values()).filter(p => p.status === 'idle').length;

    const selectedPos = selectedVehicle ? positions.get(selectedVehicle) : null;
    const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);
    const selectedTrip = selectedPos?.tripId ? trips.find(t => t.id === selectedPos.tripId) : null;

    // Prepare map positions
    const mapPositions = useMemo(() => {
        return Array.from(positions.entries()).map(([id, pos]) => ({
            id,
            lat: pos.lat,
            lng: pos.lng,
            speed: pos.speed,
            status: pos.status,
            driverName: pos.driverName,
            vehiclePlate: pos.vehiclePlate,
            tripId: pos.tripId,
        }));
    }, [positions]);

    return (
        <div className="space-y-6 pb-24 md:pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Live Fleet Tracking</h1>
                    <p className="text-slate-400 text-sm mt-1">Real-time vehicle positions & driver status</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-slate-500 hover:bg-white hover:border-gray-200 transition-all active:scale-95"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
                <button
                    onClick={() => setViewMode('active')}
                    className={`p-4 rounded-2xl border text-center transition-all card-hover ${viewMode === 'active' ? 'border-emerald-200 bg-emerald-50/80 shadow-md' : 'border-gray-100 bg-white'}`}
                >
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Moving</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
                </button>
                <button
                    onClick={() => setViewMode('idle')}
                    className={`p-4 rounded-2xl border text-center transition-all card-hover ${viewMode === 'idle' ? 'border-amber-200 bg-amber-50/80 shadow-md' : 'border-gray-100 bg-white'}`}
                >
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Idle</span>
                    </div>
                    <p className="text-2xl font-black text-amber-600">{idleCount}</p>
                </button>
                <button
                    onClick={() => setViewMode('all')}
                    className={`p-4 rounded-2xl border text-center transition-all card-hover ${viewMode === 'all' ? 'border-blue-200 bg-blue-50/80 shadow-md' : 'border-gray-100 bg-white'}`}
                >
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">All</span>
                    </div>
                    <p className="text-2xl font-black text-blue-600">{vehicles.length}</p>
                </button>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

                {/* Vehicle List */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-blue-100 p-1 rounded-lg text-blue-600 text-xs">🚛</span>
                            Fleet Vehicles
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                            {filteredVehicles.length} shown
                        </span>
                    </div>
                    <div className="overflow-y-auto max-h-[500px] custom-scrollbar divide-y divide-gray-50">
                        {filteredVehicles.map(vehicle => {
                            const pos = positions.get(vehicle.id);
                            if (!pos) return null;
                            const isSelected = selectedVehicle === vehicle.id;

                            return (
                                <button
                                    key={vehicle.id}
                                    onClick={() => setSelectedVehicle(isSelected ? null : vehicle.id)}
                                    className={`w-full p-4 text-left transition-all flex items-center gap-3 ${isSelected ? 'bg-blue-50/80 border-l-4 border-l-blue-500' : 'hover:bg-gray-50/50 border-l-4 border-l-transparent'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${pos.status === 'moving'
                                        ? 'bg-gradient-to-tr from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-200'
                                        : pos.status === 'idle'
                                            ? 'bg-amber-100 text-amber-600 border border-amber-200'
                                            : 'bg-gray-100 text-gray-400 border border-gray-200'
                                        }`}>
                                        <TruckIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold text-slate-800 truncate">{vehicle.plateNumber}</p>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${pos.status === 'moving'
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                                : pos.status === 'idle'
                                                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                                    : 'bg-gray-50 text-gray-400 border border-gray-200'
                                                }`}>
                                                {pos.status}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                            <UserIcon className="w-3 h-3 inline mr-1" />
                                            {pos.driverName}
                                        </p>
                                        {pos.status === 'moving' && (
                                            <p className="text-[10px] text-emerald-500 font-bold mt-1">
                                                🏎️ {Math.round(pos.speed)} km/h
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRightIcon className={`w-4 h-4 text-slate-300 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                                </button>
                            );
                        })}
                        {filteredVehicles.length === 0 && (
                            <div className="p-8 text-center">
                                <span className="text-3xl mb-2 block">🔍</span>
                                <p className="text-slate-400 text-xs font-medium">No vehicles match current filter</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Map + Details */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Real Leaflet Map */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-emerald-100 p-1 rounded-lg text-emerald-600 text-xs">📍</span>
                                Live Positions
                                <span className="ml-1 flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400">
                                Last update: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
                            </span>
                        </div>
                        <div className="h-[400px] md:h-[500px]">
                            <LiveTrackingMapContent
                                positions={mapPositions}
                                selectedId={selectedVehicle}
                                onSelect={setSelectedVehicle}
                            />
                        </div>
                    </div>

                    {/* Selected Vehicle Detail */}
                    {selectedVehicle && selectedPos && selectedVehicleData && (
                        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden animate-fade-in-up">
                            <div className="p-4 md:p-5 border-b border-blue-50 bg-blue-50/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${selectedPos.status === 'moving'
                                            ? 'bg-gradient-to-tr from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200'
                                            : 'bg-amber-100 text-amber-600 border border-amber-200'
                                            }`}>
                                            <TruckIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">{selectedVehicleData.plateNumber}</h3>
                                            <p className="text-xs text-slate-400">{selectedVehicleData.model} · {selectedPos.driverName}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${selectedPos.status === 'moving'
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        : selectedPos.status === 'idle'
                                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                                            : 'bg-gray-50 text-gray-400 border-gray-200'
                                        }`}>
                                        {selectedPos.status === 'moving' ? '● Moving' : selectedPos.status === 'idle' ? '● Idle' : '● Offline'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 md:p-5">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <p className="text-lg font-black text-slate-800">{Math.round(selectedPos.speed)}</p>
                                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">km/h</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <p className="text-lg font-black text-slate-800">{Math.round(selectedPos.heading)}°</p>
                                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Heading</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <p className="text-lg font-black text-blue-600">{selectedPos.lat.toFixed(4)}</p>
                                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Latitude</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <p className="text-lg font-black text-blue-600">{selectedPos.lng.toFixed(4)}</p>
                                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Longitude</p>
                                    </div>
                                </div>

                                {selectedTrip && (
                                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-blue-600">Active Trip #{selectedTrip.id.toUpperCase()}</span>
                                            <span className="text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">
                                                {selectedTrip.drops.filter((d: any) => d.status === 'delivered').length}/{selectedTrip.drops.length} delivered
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                                                style={{ width: `${(selectedTrip.drops.filter((d: any) => d.status === 'delivered').length / selectedTrip.drops.length) * 100}%` }}
                                            />
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 text-[11px] text-blue-500">
                                            <MapPinIcon className="w-3.5 h-3.5" />
                                            <span className="truncate">{selectedTrip.startLocation.address}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    <span>Last signal: {formatDistanceToNow(selectedPos.lastUpdate, { addSuffix: true })}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
