"use client";

import { useStore } from "@/lib/store";
import { useState } from "react";
import { Trip, DropPoint } from "@/lib/types";
import { optimizeRoute, calculateTotalDistance } from "@/lib/utils/optimizer";

export default function TripForm({ onClose }: { onClose: () => void }) {
    const { addTrip, vehicles, drivers } = useStore();
    const [formData, setFormData] = useState<Partial<Trip>>({
        startLocation: { lat: 34.05, lng: -118.24, address: '' },
        drops: [],
        status: 'planned'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white border border-gray-100 rounded-2xl p-8 w-full max-w-4xl shadow-2xl relative transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-gray-50 rounded-full p-2 hover:bg-gray-100 transition-colors">✕</button>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Assign Deliveries & Optimize Route</h2>
                    <p className="text-slate-500 text-sm mt-1">Select drops below. The system will automatically calculate the most fuel-efficient sequence.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Driver & Vehicle Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            <input
                                type="text"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. Central Warehouse"
                                value={formData.startLocation?.address}
                                onChange={e => setFormData({ ...formData, startLocation: { ...formData.startLocation!, address: e.target.value } })}
                                required
                            />
                        </div>
                    </div>

                    {/* Delivery Drops Manager */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
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
                                        lat: 34.05 + (Math.random() * 0.1 - 0.05), // Random spread
                                        lng: -118.24 + (Math.random() * 0.1 - 0.05),
                                        customerName: '',
                                        status: 'pending',
                                        priority: 'medium',
                                        deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0]
                                    };
                                    setFormData({ ...formData, drops: [...(formData.drops || []), newDrop] });
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md shadow-blue-200 transition-all active:scale-95"
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
                                <div key={drop.id} className="grid grid-cols-12 gap-3 items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                    <div className="col-span-1 flex justify-center">
                                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                            {idx + 1}
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
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Address</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Delivery Address"
                                                    className="w-full text-sm text-slate-600 bg-transparent border-b border-gray-100 focus:border-blue-500 outline-none pb-1"
                                                    value={drop.address}
                                                    onChange={(e) => {
                                                        const newDrops = [...(formData.drops || [])];
                                                        newDrops[idx].address = e.target.value;
                                                        setFormData({ ...formData, drops: newDrops });
                                                    }}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newDrops = formData.drops?.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, drops: newDrops });
                                                    }}
                                                    className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </div>
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

                    <div className="pt-6 flex justify-between gap-3 border-t border-gray-100 mt-8 items-center">
                        <div className="text-xs text-slate-500 font-medium">
                            * System will use simulated coordinates for optimization if addresses are not geocoded.
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 hover:text-slate-700 font-medium transition-colors">Cancel</button>
                            <button type="submit" className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all transform active:scale-95 flex items-center gap-2">
                                <span>⚡</span> Assign & Optimize Route
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
