"use client";

import { useStore } from "@/lib/store";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FuelEntry } from "@/lib/types";

export default function FuelEntryForm({ onClose, tripId, vehicleId }: { onClose: () => void, tripId: string, vehicleId: string }) {
    const { addFuelEntry } = useStore();
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [cost, setCost] = useState('');
    const [odometer, setOdometer] = useState('');
    const [location, setLocation] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const entry: FuelEntry = {
            id: `f-${Math.floor(Math.random() * 10000)}`,
            tripId,
            vehicleId,
            driverId: user.id,
            amount: Number(amount),
            cost: Number(cost),
            currency: 'USD',
            odometer: Number(odometer),
            location,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        addFuelEntry(entry);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 w-full max-w-md shadow-2xl relative transform transition-all scale-100">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-gray-50 rounded-full p-2 h-8 w-8 flex items-center justify-center hover:bg-gray-100 transition-colors">✕</button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                        ⛽
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Log Fuel Entry</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Total Cost ($)</label>
                        <input
                            type="number"
                            value={cost}
                            onChange={e => setCost(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-slate-800 text-2xl font-bold outline-none ring-2 ring-transparent focus:ring-orange-500 transition-all placeholder-gray-300"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Volume (L)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                                placeholder="0"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Odometer (km)</label>
                            <input
                                type="number"
                                value={odometer}
                                onChange={e => setOdometer(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                                placeholder="0"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Location / Gas Station</label>
                        <input
                            type="text"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                            placeholder="e.g. Shell Highway 1"
                            required
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-6">
                        <button type="submit" className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm transform active:scale-95">
                            Submit Entry
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
