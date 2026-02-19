"use client";

import { useStore } from "@/lib/store";
import { useState } from "react";
import { Trip, DropPoint } from "@/lib/types";
import { optimizeRoute, calculateTotalDistance, estimateTime, estimateFuelCost, calculateFuelSavings } from "@/lib/utils/optimizer";
import AddressInput from "@/components/common/AddressInput";

// Default center: Kochi, Kerala
const KERALA_CENTER = { lat: 9.9312, lng: 76.2673 };

export default function TripForm({ onClose }: { onClose: () => void }) {
    const { addTrip, vehicles, drivers } = useStore();
    const [formData, setFormData] = useState<Partial<Trip>>({
        startLocation: { lat: KERALA_CENTER.lat, lng: KERALA_CENTER.lng, address: '' },
        drops: [],
        status: 'planned'
    });

    // Track whether start location has been geocoded
    const [startGeocoded, setStartGeocoded] = useState(false);
    // Track which drops have been geocoded (by index)
    const [geocodedDrops, setGeocodedDrops] = useState<Set<number>>(new Set());

    // Optimization preview stats
    const [previewStats, setPreviewStats] = useState<{ distance: string; time: string; fuelLitres: number; fuelCost: number; savedKm: number; savedCost: number } | null>(null);

    const updatePreviewStats = (startLoc: { lat: number; lng: number }, drops: DropPoint[]) => {
        if (drops.length === 0) {
            setPreviewStats(null);
            return;
        }
        const optimized = optimizeRoute(startLoc, drops);
        const dist = calculateTotalDistance(startLoc, optimized);
        const time = estimateTime(dist);
        const fuel = estimateFuelCost(dist);
        const savings = calculateFuelSavings(startLoc, drops, optimized);
        setPreviewStats({ distance: `${dist} km`, time, fuelLitres: fuel.litres, fuelCost: fuel.cost, savedKm: savings.savedKm, savedCost: savings.savedCost });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate that all addresses have been geocoded
        const allDropsGeocoded = formData.drops?.every((_, idx) => geocodedDrops.has(idx));
        if (!startGeocoded) {
            alert('⚠️ Please select the Start Hub from the dropdown suggestions so we can locate it on the map.');
            return;
        }
        if (!allDropsGeocoded) {
            alert('⚠️ Please select all delivery addresses from the dropdown suggestions so we can locate them on the map.');
            return;
        }

        // AUTO-OPTIMIZATION:
        // 1. Take all selected drops
        // 2. Run them through the optimizer against the Start Location
        const optimizedDrops = optimizeRoute(formData.startLocation!, formData.drops || []);

        // Calculate estimated distance for the optimized route
        const totalDist = calculateTotalDistance(formData.startLocation!, optimizedDrops);

        const newTrip: Trip = {
            id: `TRIP-${Math.floor(Math.random() * 10000)}`,
            status: 'assigned', // Auto-assign if driver selected
            startLocation: formData.startLocation!,
            drops: optimizedDrops,
            estimatedDistance: totalDist,
            vehicleId: formData.vehicleId,
            driverId: formData.driverId,
            startTime: new Date().toISOString()
        };
        addTrip(newTrip);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 z-50 animate-fade-in">
            <div className="bg-white border border-gray-100 rounded-t-2xl md:rounded-2xl p-5 md:p-8 w-full max-w-4xl shadow-2xl relative transform transition-all scale-100 max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 text-slate-400 hover:text-slate-600 bg-gray-50 rounded-full p-2 hover:bg-gray-100 transition-colors z-10">✕</button>

                <div className="mb-8">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight pr-8">Assign Deliveries & Optimize Route</h2>
                    <p className="text-slate-500 text-sm mt-1">Type place names below — the system will find them on the map and calculate the most fuel-efficient route.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Driver & Vehicle Selection */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Assign Driver</label>
                            <select
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                                onChange={e => setFormData({ ...formData, driverId: e.target.value })}
                                required
                            >
                                <option value="">Select Driver...</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.status})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Assign Vehicle</label>
                            <select
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                                onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                            >
                                <option value="">Select Vehicle...</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber} - {v.model}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Start Hub</label>
                            <AddressInput
                                value={formData.startLocation?.address || ''}
                                onChange={(address, lat, lng) => {
                                    const newStart = { lat, lng, address };
                                    setFormData({ ...formData, startLocation: newStart });
                                    setStartGeocoded(true);
                                    updatePreviewStats(newStart, formData.drops || []);
                                }}
                                placeholder="e.g. Kochi Port, Ernakulam..."
                                required
                            />
                            {startGeocoded && (
                                <p className="text-[10px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
                                    ✓ Location found on map
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Delivery Drops Manager */}
                    <div className="bg-slate-50 rounded-2xl p-4 md:p-6 border border-slate-100">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs">{(formData.drops || []).length} Stops</span>
                                Delivery Manifest
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    const newDrop: DropPoint = {
                                        id: `d-${Date.now()}`,
                                        orderId: `ORD-${Math.floor(Math.random() * 1000)}`,
                                        address: '',
                                        lat: 0,
                                        lng: 0,
                                        customerName: '',
                                        status: 'pending',
                                        priority: 'medium',
                                        deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0]
                                    };
                                    setFormData({ ...formData, drops: [...(formData.drops || []), newDrop] });
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-xs shadow-md shadow-blue-200 transition-all active:scale-95 w-full sm:w-auto text-center"
                            >
                                + Add Order to Route
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {formData.drops?.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                                    <p className="text-slate-400 font-medium">No deliveries assigned yet.</p>
                                    <p className="text-xs text-slate-300 mt-1">Add orders to build a route.</p>
                                </div>
                            )}
                            {formData.drops?.map((drop, idx) => (
                                <div key={drop.id} className="grid grid-cols-12 gap-3 items-start bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                    <div className="col-span-1 flex justify-center pt-2">
                                        <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center transition-colors
                                            ${geocodedDrops.has(idx)
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                                            }`}>
                                            {geocodedDrops.has(idx) ? '✓' : idx + 1}
                                        </span>
                                    </div>

                                    <div className="col-span-11 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Order ID</label>
                                            <input
                                                type="text"
                                                placeholder="ORD-XXX"
                                                className="w-full text-xs font-bold text-slate-700 bg-transparent border-b border-gray-100 focus:border-blue-500 outline-none pb-1"
                                                value={drop.orderId}
                                                onChange={(e) => {
                                                    const newDrops = [...(formData.drops || [])];
                                                    newDrops[idx].orderId = e.target.value;
                                                    setFormData({ ...formData, drops: newDrops });
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Customer</label>
                                            <input
                                                type="text"
                                                placeholder="Customer Name"
                                                className="w-full text-sm font-medium text-slate-800 bg-transparent border-b border-gray-100 focus:border-blue-500 outline-none pb-1"
                                                value={drop.customerName}
                                                onChange={(e) => {
                                                    const newDrops = [...(formData.drops || [])];
                                                    newDrops[idx].customerName = e.target.value;
                                                    setFormData({ ...formData, drops: newDrops });
                                                }}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] uppercase font-bold text-slate-400">Delivery Address</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newDrops = formData.drops?.filter((_, i) => i !== idx);
                                                        // Update geocoded tracking
                                                        const newGeocoded = new Set<number>();
                                                        geocodedDrops.forEach(i => {
                                                            if (i < idx) newGeocoded.add(i);
                                                            else if (i > idx) newGeocoded.add(i - 1);
                                                        });
                                                        setGeocodedDrops(newGeocoded);
                                                        setFormData({ ...formData, drops: newDrops });
                                                        updatePreviewStats(formData.startLocation!, newDrops || []);
                                                    }}
                                                    className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors text-xs"
                                                >
                                                    ✕ Remove
                                                </button>
                                            </div>
                                            <AddressInput
                                                value={drop.address}
                                                onChange={(address, lat, lng) => {
                                                    const newDrops = [...(formData.drops || [])];
                                                    newDrops[idx] = { ...newDrops[idx], address, lat, lng };
                                                    const newGeocoded = new Set(geocodedDrops);
                                                    newGeocoded.add(idx);
                                                    setGeocodedDrops(newGeocoded);
                                                    setFormData({ ...formData, drops: newDrops });
                                                    updatePreviewStats(formData.startLocation!, newDrops);
                                                }}
                                                placeholder="Type a place name..."
                                                required
                                            />
                                            {geocodedDrops.has(idx) && (
                                                <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                                                    ✓ Located: {drop.lat.toFixed(4)}°N, {drop.lng.toFixed(4)}°E
                                                </p>
                                            )}
                                        </div>
                                        <div className="md:col-span-4 grid grid-cols-4 gap-3 mt-1 pt-2 border-t border-gray-50">
                                            <select
                                                className="text-xs bg-gray-50 rounded border border-gray-200 py-1 px-2"
                                                value={drop.priority}
                                                onChange={(e) => {
                                                    const newDrops = [...(formData.drops || [])];
                                                    newDrops[idx].priority = e.target.value as any;
                                                    setFormData({ ...formData, drops: newDrops });
                                                }}
                                            >
                                                <option value="low">Low Priority</option>
                                                <option value="medium">Medium Priority</option>
                                                <option value="high">High Priority</option>
                                            </select>
                                            <input
                                                type="date"
                                                className="text-xs bg-gray-50 rounded border border-gray-200 py-1 px-2 col-span-2"
                                                value={drop.deadline ? drop.deadline.split('T')[0] : ''}
                                                onChange={(e) => {
                                                    const newDrops = [...(formData.drops || [])];
                                                    newDrops[idx].deadline = e.target.value;
                                                    setFormData({ ...formData, drops: newDrops });
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Route Preview Stats */}
                    {previewStats && (
                        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 rounded-xl p-4">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-100 p-2 rounded-lg">
                                        <span className="text-lg">⛽</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Fuel-Optimized Route</p>
                                        <p className="text-sm text-slate-500">Shortest path for max fuel economy</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div className="text-center p-2 bg-white rounded-lg border border-gray-100">
                                    <p className="text-lg font-black text-slate-800">{previewStats.distance}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Distance</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg border border-gray-100">
                                    <p className="text-lg font-black text-slate-800">{previewStats.time}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Est. Time</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg border border-gray-100">
                                    <p className="text-lg font-black text-amber-600">{previewStats.fuelLitres}L</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Fuel Needed</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg border border-gray-100">
                                    <p className="text-lg font-black text-red-500">₹{previewStats.fuelCost}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Fuel Cost</p>
                                </div>
                                <div className="text-center p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <p className="text-lg font-black text-emerald-600">{previewStats.savedKm > 0 ? `↓${previewStats.savedKm} km` : '—'}</p>
                                    <p className="text-[10px] uppercase font-bold text-emerald-500">{previewStats.savedCost > 0 ? `Saves ₹${previewStats.savedCost}` : 'Already Optimal'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 md:pt-6 flex flex-col-reverse sm:flex-row justify-between gap-3 border-t border-gray-100 mt-6 md:mt-8 items-center">
                        <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
                            📍 Addresses are auto-located via OpenStreetMap
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-6 py-3 text-slate-500 hover:text-slate-700 font-medium transition-colors">Cancel</button>
                            <button type="submit" className="flex-1 sm:flex-none px-6 md:px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                                <span>⚡</span> Assign & Optimize Route
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
