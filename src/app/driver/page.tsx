"use client";

import { useStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { MapPinIcon, TruckIcon, MapIcon } from "@heroicons/react/24/outline";
import MultiDropTracker from "@/components/trips/MultiDropTracker";
import RouteMap from "@/components/maps/RouteMap";
import FuelTab from "@/components/common/FuelTab";

export default function DriverDashboard({ searchParams }: { searchParams: { tab?: string } }) {
    const { user } = useAuth();
    const { trips } = useStore();

    // Directly use searchParams or default to 'overview'
    // If searchParams is not available in client component this way, we might need useSearchParams
    // But since we are moving away from tabs inside the page to distinct routes (as per user request "not in home"),
    // we actually want to render DIFFERENT CONTENT based on the route/param, but keep the Sidebar as the navigation method.

    // Wait, the user said "i want these three session in leftside side not in home".
    // This implies they want the "Home", "Route", "Fuel & Bills" to be ACCESSED via the Sidebar, and NOT have a tab bar inside the Home page.
    // My Sidebar already links to ?tab=fuel etc.
    // So I just need to REMOVE the inner tab bar and just render the active content.

    // Wait, Next.js 13/14 App Router: searchParams prop is only available in Server Components. 
    // For Client Component, I must use useSearchParams();

    // Let's refactor to separate pages or just use the param to switch content WITHOUT the internal tab bar.

    return <DriverDashboardContent />;
}

import { useSearchParams } from "next/navigation";

function DriverDashboardContent() {
    const { user } = useAuth();
    const { trips } = useStore();
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') || 'overview';

    const myTrips = trips.filter(t => t.driverId === user?.id);
    const currentTrip = myTrips.find(t => t.status === 'in-progress' || t.status === 'assigned');

    if (!currentTrip) {
        return (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md mx-auto mt-12">
                <TruckIcon className="w-24 h-24 mx-auto mb-6 text-slate-200" />
                <h2 className="text-xl font-bold text-slate-600">No Active Assignment</h2>
                <p className="text-sm mt-2 text-slate-400">You are currently off-duty.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] pb-20 md:pb-0 relative max-w-3xl mx-auto w-full">
            {/* NO INTERNAL TAB BAR HERE ANYMORE */}

            <div className="flex-1 overflow-y-auto px-4 sm:px-0 scrollbar-hide">
                {tab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Trip Header Card */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <TruckIcon className="w-32 h-32" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-wider opacity-80 mb-1">Current Trip</h2>
                                <h3 className="text-3xl font-extrabold tracking-tight">#{currentTrip.id.toUpperCase()}</h3>
                                <p className="text-blue-100 text-sm font-medium mt-1">{format(new Date(), 'EEEE, MMMM do')}</p>
                            </div>
                            <div className="mt-6 flex gap-3">
                                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/30">
                                    {currentTrip.status}
                                </span>
                                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/30 flex items-center gap-1">
                                    <MapIcon className="w-3 h-3" /> {currentTrip.estimatedDistance} km
                                </span>
                            </div>
                        </div>

                        {/* Stops */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <MultiDropTracker trip={currentTrip} />
                        </div>
                    </div>
                )}

                {tab === 'map' && (
                    <div className="h-full animate-fade-in flex flex-col">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">Route & Navigation</h2>
                        <RouteMap trip={currentTrip} />
                    </div>
                )}

                {tab === 'fuel' && (
                    <div className="animate-fade-in">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">Fuel & Expenses</h2>
                        <FuelTab tripId={currentTrip.id} />
                    </div>
                )}
            </div>
        </div>
    );
}
