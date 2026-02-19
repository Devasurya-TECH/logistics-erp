"use client";

import { Trip } from "@/lib/types";
import { useStore } from "@/lib/store";
import { CheckCircleIcon, XCircleIcon, ClockIcon, MapPinIcon } from "@heroicons/react/24/outline";

export default function MultiDropTracker({ trip }: { trip: Trip }) {
    const { updateDropStatus } = useStore();

    const handleStatusUpdate = (dropId: string, status: 'delivered' | 'failed') => {
        updateDropStatus(trip.id, dropId, status);
    };

    const deliveredCount = trip.drops.filter(d => d.status === 'delivered').length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">Route Stops</h3>
                <span className="text-xs text-slate-500 font-bold bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                    {deliveredCount}/{trip.drops.length} Done
                </span>
            </div>

            {/* Timeline */}
            <div className="relative pl-5 md:pl-6 border-l-2 border-slate-200 ml-2 space-y-4 md:space-y-6">
                {trip.drops.map((drop, index) => {
                    const isNext = drop.status === 'pending' && (index === 0 || trip.drops[index - 1].status !== 'pending');
                    return (
                        <div key={drop.id} className="relative pl-4 md:pl-6 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                            {/* Timeline Dot */}
                            <span className={`absolute -left-[26px] md:-left-[30px] top-2 h-3.5 w-3.5 md:h-4 md:w-4 rounded-full border-2 z-10 transition-all ${drop.status === 'delivered' ? 'bg-green-500 border-green-600 shadow-sm' :
                                    drop.status === 'failed' ? 'bg-red-500 border-red-600 shadow-sm' :
                                        isNext ? 'bg-blue-500 border-blue-600 animate-pulse ring-4 ring-blue-100 shadow-md' : 'bg-gray-200 border-gray-300'
                                }`}></span>

                            <div className={`p-4 md:p-5 rounded-2xl border transition-all duration-300 ${isNext ? 'bg-white border-blue-200 shadow-lg shadow-blue-500/10' :
                                    drop.status === 'delivered' ? 'bg-green-50/30 border-green-100' :
                                        drop.status === 'failed' ? 'bg-red-50/30 border-red-100' :
                                            'bg-gray-50/50 border-gray-100'
                                }`}>
                                {/* Header */}
                                <div className="flex justify-between items-start gap-2 mb-1.5">
                                    <div className="min-w-0 flex-1">
                                        <span className="font-bold text-slate-800 text-sm md:text-base block truncate">{drop.customerName}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{drop.orderId}</span>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full tracking-wider border flex-shrink-0 ${drop.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' :
                                            drop.status === 'failed' ? 'bg-red-100 text-red-700 border-red-200' :
                                                isNext ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                                    'bg-slate-100 text-slate-400 border-slate-200'
                                        }`}>
                                        {drop.status === 'delivered' ? '✅ Done' :
                                            drop.status === 'failed' ? '❌ Failed' :
                                                isNext ? '📍 Next' : 'Queued'}
                                    </span>
                                </div>

                                {/* Address */}
                                <p className="text-xs md:text-sm text-slate-500 mb-3 font-medium flex items-start gap-1.5">
                                    <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
                                    <span className="line-clamp-2">{drop.address}</span>
                                </p>

                                {/* Action buttons */}
                                {drop.status === 'pending' && (
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => handleStatusUpdate(drop.id, 'delivered')}
                                            className={`flex-1 py-3 md:py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${isNext
                                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200'
                                                    : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                                                }`}
                                        >
                                            <CheckCircleIcon className="w-4 h-4 md:w-5 md:h-5" /> Delivered
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(drop.id, 'failed')}
                                            className="px-4 py-3 md:py-3.5 bg-white border border-red-100 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition-colors active:scale-[0.97]"
                                        >
                                            <XCircleIcon className="w-4 h-4 md:w-5 md:h-5" />
                                        </button>
                                    </div>
                                )}

                                {/* Arrival time */}
                                {drop.actualArrival && (
                                    <div className="mt-3 pt-3 border-t border-green-100 text-[11px] text-green-600 font-bold flex items-center gap-1.5">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        Delivered at {new Date(drop.actualArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
