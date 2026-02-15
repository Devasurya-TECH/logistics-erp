"use client";

import { useStore } from "@/lib/store";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Expense } from "@/lib/types";

export default function ExpenseForm({ onClose, tripId }: { onClose: () => void, tripId: string }) {
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<Expense['category']>('other');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        console.log("Expense submitted:", { amount, category, description });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 w-full max-w-md shadow-2xl relative transform transition-all scale-100">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-gray-50 rounded-full p-2 h-8 w-8 flex items-center justify-center hover:bg-gray-100 transition-colors">✕</button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-green-100 p-2 rounded-xl text-green-600">
                        💵
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Submit Expense</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Amount ($)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-slate-800 text-2xl font-bold outline-none ring-2 ring-transparent focus:ring-green-500 transition-all placeholder-gray-300"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Category</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value as any)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-green-600 transition-all font-medium"
                        >
                            <option value="toll">Toll</option>
                            <option value="food">Food</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-green-600 transition-all font-medium min-h-[100px]"
                            placeholder="Enter details..."
                            required
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-6">
                        <button type="submit" className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-green-600/30 transition-all text-sm uppercase tracking-wide transform active:scale-95 flex items-center justify-center gap-2">
                            Submit Expense
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
