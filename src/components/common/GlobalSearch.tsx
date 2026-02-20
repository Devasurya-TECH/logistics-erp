"use client";

import { useStore } from "@/lib/store";
import { useState, useMemo, useRef, useEffect } from "react";
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    TruckIcon,
    UserIcon,
    MapPinIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

type SearchResult = {
    type: 'trip' | 'driver' | 'vehicle' | 'delivery';
    id: string;
    title: string;
    subtitle: string;
    status?: string;
    href: string;
};

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
    const { trips, drivers, vehicles } = useStore();
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery('');
        }
    }, [isOpen]);

    // Keyboard shortcut handler
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handler);
            return () => document.removeEventListener('keydown', handler);
        }
    }, [isOpen, onClose]);

    const results = useMemo(() => {
        if (!query || query.length < 2) return [];

        const q = query.toLowerCase();
        const searchResults: SearchResult[] = [];

        // Search trips
        trips.forEach(trip => {
            if (trip.id.toLowerCase().includes(q) || trip.startLocation.address.toLowerCase().includes(q)) {
                searchResults.push({
                    type: 'trip',
                    id: trip.id,
                    title: `Trip #${trip.id.toUpperCase()}`,
                    subtitle: `${trip.startLocation.address} · ${trip.drops.length} stops`,
                    status: trip.status,
                    href: '/supervisor/trips',
                });
            }

            // Search within drops
            trip.drops.forEach(drop => {
                if (drop.customerName.toLowerCase().includes(q) || drop.address.toLowerCase().includes(q)) {
                    searchResults.push({
                        type: 'delivery',
                        id: drop.id,
                        title: drop.customerName,
                        subtitle: `${drop.address} · ${drop.status}`,
                        status: drop.status,
                        href: '/supervisor/deliveries',
                    });
                }
            });
        });

        // Search drivers
        drivers.forEach(driver => {
            if (driver.name.toLowerCase().includes(q) || driver.email?.toLowerCase().includes(q) || driver.licenseNumber?.toLowerCase().includes(q)) {
                searchResults.push({
                    type: 'driver',
                    id: driver.id,
                    title: driver.name,
                    subtitle: `${driver.status} · ${driver.licenseNumber || 'No license #'}`,
                    status: driver.status,
                    href: '/supervisor/drivers',
                });
            }
        });

        // Search vehicles
        vehicles.forEach(vehicle => {
            if (vehicle.plateNumber.toLowerCase().includes(q) || vehicle.model.toLowerCase().includes(q)) {
                searchResults.push({
                    type: 'vehicle',
                    id: vehicle.id,
                    title: vehicle.plateNumber,
                    subtitle: `${vehicle.model} · ${vehicle.status}`,
                    status: vehicle.status,
                    href: '/supervisor/tracking',
                });
            }
        });

        return searchResults.slice(0, 12);
    }, [query, trips, drivers, vehicles]);

    const typeIcons = {
        trip: TruckIcon,
        driver: UserIcon,
        vehicle: TruckIcon,
        delivery: MapPinIcon,
    };

    const typeColors = {
        trip: 'bg-blue-100 text-blue-600',
        driver: 'bg-purple-100 text-purple-600',
        vehicle: 'bg-emerald-100 text-emerald-600',
        delivery: 'bg-amber-100 text-amber-600',
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[80] animate-fade-in"
                onClick={onClose}
            />
            <div className="fixed top-0 left-0 right-0 z-[81] flex justify-center pt-[10vh] px-4 animate-fade-in-up">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 ring-1 ring-black/5">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                        <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search trips, drivers, vehicles, deliveries..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="flex-1 text-sm text-slate-800 placeholder:text-slate-300 outline-none bg-transparent font-medium"
                        />
                        {query && (
                            <button onClick={() => setQuery('')} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                <XCircleIcon className="w-4 h-4 text-slate-300" />
                            </button>
                        )}
                        <kbd className="hidden sm:block text-[10px] font-bold text-slate-300 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">ESC</kbd>
                    </div>

                    {/* Results */}
                    <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                        {query.length < 2 ? (
                            <div className="p-8 text-center">
                                <MagnifyingGlassIcon className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                <p className="text-sm text-slate-400 font-medium">Type to search across all fleet data</p>
                                <p className="text-xs text-slate-300 mt-1">Trips, drivers, vehicles, and deliveries</p>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="p-8 text-center">
                                <span className="text-3xl block mb-2">🔍</span>
                                <p className="text-sm text-slate-400 font-medium">No results for &quot;{query}&quot;</p>
                                <p className="text-xs text-slate-300 mt-1">Try a different search term</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 py-1">
                                {results.map(result => {
                                    const Icon = typeIcons[result.type];
                                    const colorClass = typeColors[result.type];
                                    return (
                                        <button
                                            key={`${result.type}-${result.id}`}
                                            onClick={() => {
                                                router.push(result.href);
                                                onClose();
                                            }}
                                            className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-blue-50/50 transition-colors"
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">{result.title}</p>
                                                <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>
                                            </div>
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                                                {result.type}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
                        <span className="text-[10px] text-slate-300 font-medium">⌘K to open search</span>
                        <span className="text-[10px] text-slate-300 font-medium">{results.length} results</span>
                    </div>
                </div>
            </div>
        </>
    );
}
