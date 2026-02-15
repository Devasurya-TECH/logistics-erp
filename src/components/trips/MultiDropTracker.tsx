"use client";

import { Trip } from "@/lib/types";
import { useStore } from "@/lib/store";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

export default function MultiDropTracker({ trip }: { trip: Trip }) {
    const { updateDropStatus } = useStore();

    const handleStatusUpdate = (dropId: string, status: 'delivered' | 'failed') => {
        updateDropStatus(trip.id, dropId, status);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Route Stops</h3>
                <span className="text-xs text-slate-500 font-bold bg-gray-100 px-2.5 py-1 rounded-full">{trip.drops.filter(d => d.status === 'delivered').length}/{trip.drops.length} Completed</span>
            </div>

            <div className="relative pl-6 border-l-2 border-slate-200 ml-2 space-y-8">
                {trip.drops.map((drop, index) => {
                    const isNext = drop.status === 'pending' && (index === 0 || trip.drops[index - 1].status !== 'pending');
                    return (
                        <div key={drop.id} className="relative pl-6">
                            {/* Timeline Dot */}
                            <span className={`absolute -left-[30px] top-1.5 h-4 w-4 rounded-full border-2 z-10 shadow-sm ${drop.status === 'delivered' ? 'bg-green-500 border-green-600' :
                                    drop.status === 'failed' ? 'bg-red-500 border-red-600' :
                                        isNext ? 'bg-blue-500 border-blue-600 animate-pulse ring-4 ring-blue-100' : 'bg-gray-100 border-gray-300'
                                }`}></span>

                            <div className={`p-5 rounded-2xl border transition-all duration-300 ${isNext ? 'bg-white border-blue-200 shadow-lg shadow-blue-500/10 scale-[1.02]' :
                                    drop.status === 'delivered' ? 'bg-green-50/50 border-green-100 opacity-80' :
                                        'bg-gray-50 border-gray-100'
                                }`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-slate-800 text-base">{drop.customerName}</span>
                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider border ${drop.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' :
                                            drop.status === 'failed' ? 'bg-red-100 text-red-700 border-red-200' :
                                                'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                        {drop.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mb-4 font-medium">{drop.address}</p>

                                {drop.status === 'pending' && (
                                    <div className="flex gap-2.5 mt-4">
                                        <button
                                            onClick={() => handleStatusUpdate(drop.id, 'delivered')}
                                            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-green-600/20"
                                        >
                                            <CheckCircleIcon className="w-5 h-5" /> Delivered
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(drop.id, 'failed')}
                                            className="px-4 py-3 bg-white border border-red-100 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-xl transition-colors shadow-sm"
                                        >
                                            <XCircleIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                {drop.actualArrival && (
                                    <div className="mt-3 pt-3 border-t border-green-200/50 text-xs text-green-700 font-bold flex items-center gap-1.5">
                                        <ClockIcon className="w-4 h-4" /> Arrived: {new Date(drop.actualArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
