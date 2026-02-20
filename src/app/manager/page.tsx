"use client";

import { useStore } from "@/lib/store";
import VehicleMap from "@/components/maps/VehicleMap";
import TripList from "@/components/trips/TripList";
// import FuelChart from "@/components/charts/FuelChart"; // Removed as per request
import FuelOptimizedMap from "@/components/maps/FuelOptimizedMap"; // Added new component
import {
    BuildingStorefrontIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const StatCard = ({ title, value, icon, trend }: { title: string; value: string; icon: any; trend: string }) => (
    <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
                <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                        {value}
                    </h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {trend}
                    </span>
                </div>
            </div>
            <div className="p-2 md:p-3 bg-blue-50 text-blue-600 rounded-lg">
                <icon.type className="w-5 h-5 md:w-6 md:h-6" />
            </div>
        </div>
    </div>
);

export default function ManagerDashboard() {
    const { trips, vehicles, fuelEntries, alerts } = useStore();

    const activeTrips = trips.filter(t => t.status === 'in-progress');
    const totalCost = fuelEntries.reduce((acc, curr) => acc + curr.cost, 0);
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;

    return (
        <div className="space-y-8 pb-12">
            {/* KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <StatCard
                    title="Active Fleet"
                    value={`${activeTrips.length}/${vehicles.length}`}
                    icon={<BuildingStorefrontIcon />}
                    trend="+12%"
                />
                <StatCard
                    title="Fuel Costs (YTD)"
                    value={`$${totalCost.toLocaleString()}`}
                    icon={<CurrencyDollarIcon />}
                    trend="+5%"
                />
                <StatCard
                    title="Distance (Km)"
                    value="12,504"
                    icon={<MapPinIcon />}
                    trend="+18%"
                />
                <StatCard
                    title="Critical Alerts"
                    value={criticalAlerts.toString()}
                    icon={<ExclamationCircleIcon />}
                    trend="-2"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    <section>
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Live Fleet Tracking</h3>
                            <span className="text-xs text-slate-500 font-medium bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">Updated just now</span>
                        </div>
                        <VehicleMap vehicles={vehicles} />
                    </section>

                    <section>
                        <TripList trips={trips} />
                    </section>
                </div>

                {/* Right Column (1/3) */}
                <div className="space-y-8">
                    <section>
                        {/* Replaced FuelChart with Route Optimizer */}
                        <FuelOptimizedMap />
                    </section>

                    {/* Recent Activity / Alerts */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col h-[400px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Alerts & Notifications</h3>
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{alerts.length} New</span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                            {alerts.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">All clear. Minimum risk detected.</div>
                            ) : (
                                alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={`p-4 rounded-lg border transition-all hover:shadow-md ${alert.severity === 'critical'
                                            ? 'bg-red-50 border-red-100 hover:bg-white'
                                            : 'bg-white border-gray-100 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <ExclamationCircleIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${alert.severity === 'critical' ? 'text-red-500' : 'text-blue-500'
                                                }`} />
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">{alert.type}</h4>
                                                    <span className="text-[10px] text-slate-400">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                                    {alert.message}
                                                </p>
                                                <div className="mt-3 flex gap-2">
                                                    <button className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md bg-white border border-gray-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm">
                                                        Details
                                                    </button>
                                                    <button className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                                                        Dismiss
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
