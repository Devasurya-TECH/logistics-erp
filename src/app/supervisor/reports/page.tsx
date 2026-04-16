"use client";

import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
    ArrowDownTrayIcon,
    ChartBarIcon,
    TruckIcon,
    UserGroupIcon,
    CurrencyRupeeIcon,
    ClockIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
import { generateTripCSV, downloadCSV } from "@/lib/utils/export";

type ReportTab = 'overview' | 'drivers' | 'fuel' | 'trips';

export default function ReportsPage() {
    const { trips, drivers, vehicles, fuelEntries, alerts } = useStore();
    const [activeTab, setActiveTab] = useState<ReportTab>('overview');

    const handleExport = () => {
        const csv = generateTripCSV(trips, drivers, vehicles, fuelEntries, alerts);
        downloadCSV(`Fleet_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`, csv);
    };

    // ─── Computed Analytics ───
    const analytics = useMemo(() => {
        const totalTrips = trips.length;
        const completedTrips = trips.filter(t => t.status === 'completed').length;
        const cancelledTrips = trips.filter(t => t.status === 'cancelled').length;
        const completionRate = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0;

        const allDrops = trips.flatMap(t => t.drops);
        const totalDeliveries = allDrops.length;
        const deliveredCount = allDrops.filter(d => d.status === 'delivered').length;
        const failedCount = allDrops.filter(d => d.status === 'failed').length;
        const deliveryRate = totalDeliveries > 0 ? Math.round((deliveredCount / totalDeliveries) * 100) : 0;

        const totalDistance = trips.reduce((sum, t) => sum + (t.actualDistance || t.estimatedDistance), 0);
        const avgDistPerTrip = totalTrips > 0 ? Math.round(totalDistance / totalTrips) : 0;

        const totalFuelCost = fuelEntries.reduce((sum, f) => sum + f.cost, 0);
        const totalFuelLitres = fuelEntries.reduce((sum, f) => sum + f.amount, 0);
        const avgFuelPerTrip = totalTrips > 0 ? Math.round(totalFuelCost / totalTrips) : 0;
        const pendingFuel = fuelEntries.filter(f => f.status === 'pending').length;

        const activeDrivers = drivers.filter(d => d.status === 'on-trip').length;
        const availableDrivers = drivers.filter(d => d.status === 'available').length;
        const utilization = drivers.length > 0 ? Math.round((activeDrivers / drivers.length) * 100) : 0;

        return {
            totalTrips, completedTrips, cancelledTrips, completionRate,
            totalDeliveries, deliveredCount, failedCount, deliveryRate,
            totalDistance, avgDistPerTrip,
            totalFuelCost, totalFuelLitres, avgFuelPerTrip, pendingFuel,
            activeDrivers, availableDrivers, utilization,
        };
    }, [trips, drivers, fuelEntries]);

    // ─── Per-driver stats ───
    const driverStats = useMemo(() => {
        return drivers.map(driver => {
            const driverTrips = trips.filter(t => t.driverId === driver.id);
            const completed = driverTrips.filter(t => t.status === 'completed').length;
            const allDrops = driverTrips.flatMap(t => t.drops);
            const delivered = allDrops.filter(d => d.status === 'delivered').length;
            const totalKm = driverTrips.reduce((sum, t) => sum + (t.actualDistance || t.estimatedDistance), 0);
            const driverFuel = fuelEntries.filter(f => f.driverId === driver.id);
            const fuelSpend = driverFuel.reduce((sum, f) => sum + f.cost, 0);

            return {
                ...driver,
                totalTrips: driverTrips.length,
                completed,
                delivered,
                totalDeliveries: allDrops.length,
                successRate: allDrops.length > 0 ? Math.round((delivered / allDrops.length) * 100) : 0,
                totalKm,
                fuelSpend,
            };
        }).sort((a, b) => b.successRate - a.successRate);
    }, [drivers, trips, fuelEntries]);

    // ─── Trip timeline (by status) ───
    const tripsByStatus = useMemo(() => {
        const statusGroups: Record<string, number> = {
            'completed': trips.filter(t => t.status === 'completed').length,
            'in-progress': trips.filter(t => t.status === 'in-progress').length,
            'assigned': trips.filter(t => t.status === 'assigned').length,
            'planned': trips.filter(t => t.status === 'planned').length,
            'cancelled': trips.filter(t => t.status === 'cancelled').length,
        };
        return statusGroups;
    }, [trips]);

    const tabs = [
        { id: 'overview' as ReportTab, label: 'Overview', icon: '📊' },
        { id: 'drivers' as ReportTab, label: 'Driver Performance', icon: '👤' },
        { id: 'fuel' as ReportTab, label: 'Fuel Analysis', icon: '⛽' },
        { id: 'trips' as ReportTab, label: 'Trip Breakdown', icon: '🚚' },
    ];

    return (
        <div className="space-y-6 pb-24 md:pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Reports & Analytics</h1>
                    <p className="text-slate-400 text-sm mt-1">Fleet performance insights & data exports</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 text-sm"
                >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Export CSV
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide bg-white rounded-xl border border-gray-100 p-1.5 shadow-sm">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                            : 'text-slate-500 hover:bg-gray-50'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ─── Overview Tab ─── */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in-up">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        <MetricCard
                            label="Trip Completion"
                            value={`${analytics.completionRate}%`}
                            sub={`${analytics.completedTrips}/${analytics.totalTrips} trips`}
                            icon={<ChartBarIcon className="w-5 h-5 text-blue-600" />}
                            color="blue"
                            trend={analytics.completionRate > 75 ? 'up' : 'down'}
                        />
                        <MetricCard
                            label="Delivery Success"
                            value={`${analytics.deliveryRate}%`}
                            sub={`${analytics.deliveredCount}/${analytics.totalDeliveries}`}
                            icon={<TruckIcon className="w-5 h-5 text-emerald-600" />}
                            color="emerald"
                            trend={analytics.deliveryRate > 80 ? 'up' : 'down'}
                        />
                        <MetricCard
                            label="Fleet Utilization"
                            value={`${analytics.utilization}%`}
                            sub={`${analytics.activeDrivers}/${drivers.length} active`}
                            icon={<UserGroupIcon className="w-5 h-5 text-violet-600" />}
                            color="violet"
                        />
                        <MetricCard
                            label="Avg Fuel/Trip"
                            value={`₹${analytics.avgFuelPerTrip.toLocaleString()}`}
                            sub={`₹${analytics.totalFuelCost.toLocaleString()} total`}
                            icon={<CurrencyRupeeIcon className="w-5 h-5 text-amber-600" />}
                            color="amber"
                        />
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        {/* Trip Status Distribution */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="bg-indigo-100 p-1 rounded-lg text-indigo-600 text-xs">📊</span>
                                Trip Status Distribution
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(tripsByStatus).map(([status, count]) => {
                                    const percentage = analytics.totalTrips > 0 ? Math.round((count / analytics.totalTrips) * 100) : 0;
                                    const barColors: Record<string, string> = {
                                        'completed': 'bg-emerald-500',
                                        'in-progress': 'bg-blue-500',
                                        'assigned': 'bg-amber-500',
                                        'planned': 'bg-slate-400',
                                        'cancelled': 'bg-red-400',
                                    };
                                    return (
                                        <div key={status}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-bold text-slate-600 capitalize">{status.replace('-', ' ')}</span>
                                                <span className="font-bold text-slate-500">{count} ({percentage}%)</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-700 ${barColors[status] || 'bg-gray-400'}`} style={{ width: `${percentage}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Distance & Efficiency */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="bg-blue-100 p-1 rounded-lg text-blue-600 text-xs">🗺️</span>
                                Distance & Efficiency
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-black text-slate-800">{analytics.totalDistance.toLocaleString()}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Total KM</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-black text-blue-600">{analytics.avgDistPerTrip}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Avg KM/Trip</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-black text-emerald-600">{analytics.totalFuelLitres}L</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Total Fuel</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-black text-amber-600">{analytics.pendingFuel}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Pending Fuel</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Driver Performance Tab ─── */}
            {activeTab === 'drivers' && (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        <th className="px-5 py-4 text-left">#</th>
                                        <th className="px-5 py-4 text-left">Driver</th>
                                        <th className="px-5 py-4 text-center">Status</th>
                                        <th className="px-5 py-4 text-center">Trips</th>
                                        <th className="px-5 py-4 text-center">Delivered</th>
                                        <th className="px-5 py-4 text-center">Success Rate</th>
                                        <th className="px-5 py-4 text-center">Distance</th>
                                        <th className="px-5 py-4 text-right">Fuel Spend</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {driverStats.map((d, i) => (
                                        <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-5 py-4">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'}`}>
                                                    {i + 1}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                        {d.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{d.name}</p>
                                                        <p className="text-[10px] text-slate-400">{d.licenseNumber}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${d.status === 'available' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : d.status === 'on-trip' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                    {d.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center font-bold text-slate-800">{d.completed}/{d.totalTrips}</td>
                                            <td className="px-5 py-4 text-center font-bold text-emerald-600">{d.delivered}/{d.totalDeliveries}</td>
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${d.successRate >= 90 ? 'bg-emerald-500' : d.successRate >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${d.successRate}%` }} />
                                                    </div>
                                                    <span className={`text-xs font-black ${d.successRate >= 90 ? 'text-emerald-600' : d.successRate >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
                                                        {d.successRate}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center text-xs text-slate-600">{d.totalKm.toLocaleString()} km</td>
                                            <td className="px-5 py-4 text-right font-bold text-slate-700">₹{d.fuelSpend.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-gray-50">
                            {driverStats.map((d, i) => (
                                <div key={d.id} className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>{i + 1}</span>
                                            <p className="font-bold text-slate-800 text-sm">{d.name}</p>
                                        </div>
                                        <span className={`text-sm font-black ${d.successRate >= 90 ? 'text-emerald-600' : d.successRate >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>{d.successRate}%</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-gray-50 rounded-lg p-2">
                                            <p className="text-sm font-bold text-slate-800">{d.completed}</p>
                                            <p className="text-[9px] text-slate-400 uppercase font-bold">Trips</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-2">
                                            <p className="text-sm font-bold text-emerald-600">{d.delivered}</p>
                                            <p className="text-[9px] text-slate-400 uppercase font-bold">Delivered</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-2">
                                            <p className="text-sm font-bold text-slate-700">₹{d.fuelSpend.toLocaleString()}</p>
                                            <p className="text-[9px] text-slate-400 uppercase font-bold">Fuel</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Fuel Analysis Tab ─── */}
            {activeTab === 'fuel' && (
                <div className="space-y-4 animate-fade-in-up">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center card-hover">
                            <p className="text-xl font-black text-slate-800">₹{analytics.totalFuelCost.toLocaleString()}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Total Cost</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center card-hover">
                            <p className="text-xl font-black text-blue-600">{analytics.totalFuelLitres}L</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Total Litres</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-center card-hover">
                            <p className="text-xl font-black text-amber-600">{analytics.pendingFuel}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mt-1">Pending</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 text-center card-hover">
                            <p className="text-xl font-black text-emerald-600">{fuelEntries.filter(f => f.status === 'approved' || f.status === 'verified').length}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mt-1">Approved</p>
                        </div>
                    </div>

                    {/* Fuel entries list */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        <th className="px-5 py-4 text-left">Driver</th>
                                        <th className="px-5 py-4 text-left">Vehicle</th>
                                        <th className="px-5 py-4 text-left">Station</th>
                                        <th className="px-5 py-4 text-center">Litres</th>
                                        <th className="px-5 py-4 text-right">Cost</th>
                                        <th className="px-5 py-4 text-center">Status</th>
                                        <th className="px-5 py-4 text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {fuelEntries.map(entry => {
                                        const driver = drivers.find(d => d.id === entry.driverId);
                                        const vehicle = vehicles.find(v => v.id === entry.vehicleId);
                                        const statusColors: Record<string, string> = {
                                            pending: 'bg-amber-50 text-amber-600 border-amber-200',
                                            verified: 'bg-blue-50 text-blue-600 border-blue-200',
                                            approved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                                            rejected: 'bg-red-50 text-red-600 border-red-200',
                                        };
                                        return (
                                            <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-5 py-4 font-bold text-slate-800">{driver?.name || entry.driverId}</td>
                                                <td className="px-5 py-4 text-xs text-slate-600">{vehicle?.plateNumber || entry.vehicleId}</td>
                                                <td className="px-5 py-4 text-xs text-slate-600 truncate max-w-[150px]">{entry.location}</td>
                                                <td className="px-5 py-4 text-center font-bold text-blue-600">{entry.amount}L</td>
                                                <td className="px-5 py-4 text-right font-bold text-slate-800">₹{entry.cost.toLocaleString()}</td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColors[entry.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                        {entry.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right text-xs text-slate-500">{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Trip Breakdown Tab ─── */}
            {activeTab === 'trips' && (
                <div className="space-y-4 animate-fade-in-up">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            { label: 'Planned', count: tripsByStatus['planned'], bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-600', icon: '📝' },
                            { label: 'Assigned', count: tripsByStatus['assigned'], bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', icon: '🟡' },
                            { label: 'In Progress', count: tripsByStatus['in-progress'], bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', icon: '🔵' },
                            { label: 'Completed', count: tripsByStatus['completed'], bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', icon: '✅' },
                            { label: 'Cancelled', count: tripsByStatus['cancelled'], bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600', icon: '❌' },
                        ].map(item => (
                            <div key={item.label} className={`text-center p-4 rounded-xl border ${item.bg} ${item.border} card-hover`}>
                                <span className="text-xl mb-1 block">{item.icon}</span>
                                <p className={`text-2xl font-black ${item.text}`}>{item.count}</p>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">{item.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Trip List */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        <th className="px-5 py-4 text-left">Trip ID</th>
                                        <th className="px-5 py-4 text-left">Driver</th>
                                        <th className="px-5 py-4 text-left">Vehicle</th>
                                        <th className="px-5 py-4 text-center">Drops</th>
                                        <th className="px-5 py-4 text-center">Distance</th>
                                        <th className="px-5 py-4 text-center">Status</th>
                                        <th className="px-5 py-4 text-right">Start</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {trips.map(trip => {
                                        const driver = drivers.find(d => d.id === trip.driverId);
                                        const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                                        const delivered = trip.drops.filter(d => d.status === 'delivered').length;
                                        const statusColors: Record<string, string> = {
                                            planned: 'bg-slate-50 text-slate-600 border-slate-200',
                                            assigned: 'bg-amber-50 text-amber-600 border-amber-200',
                                            'in-progress': 'bg-blue-50 text-blue-600 border-blue-200',
                                            completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                                            cancelled: 'bg-red-50 text-red-600 border-red-200',
                                        };
                                        return (
                                            <tr key={trip.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-5 py-4">
                                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">#{trip.id.toUpperCase()}</span>
                                                </td>
                                                <td className="px-5 py-4 font-bold text-slate-800 text-sm">{driver?.name || 'Unassigned'}</td>
                                                <td className="px-5 py-4 text-xs text-slate-600">{vehicle?.plateNumber || 'N/A'}</td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="font-bold text-emerald-600">{delivered}</span>
                                                    <span className="text-slate-400">/{trip.drops.length}</span>
                                                </td>
                                                <td className="px-5 py-4 text-center text-xs text-slate-600">{trip.actualDistance || trip.estimatedDistance} km</td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColors[trip.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                        {trip.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right text-xs text-slate-500">
                                                    {trip.startTime ? format(new Date(trip.startTime), 'MMM d, h:mm a') : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Reusable Metric Card Component ───
function MetricCard({ label, value, sub, icon, color, trend }: {
    label: string;
    value: string;
    sub: string;
    icon: React.ReactNode;
    color: string;
    trend?: 'up' | 'down';
}) {
    const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
        blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', badge: 'bg-blue-50 text-blue-600 border-blue-100' },
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        violet: { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-600', badge: 'bg-violet-50 text-violet-600 border-violet-100' },
        amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-600 border-amber-100' },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm card-hover group relative overflow-hidden">
            <div className={`absolute -top-6 -right-6 w-24 h-24 ${c.bg} rounded-full opacity-50 group-hover:opacity-80 transition-opacity`} />
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border} group-hover:scale-110 transition-transform`}>
                        {icon}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${c.badge}`}>
                        {label}
                    </span>
                </div>
                <p className={`text-3xl font-black ${c.text}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>
                {trend && (
                    <div className={`mt-2 flex items-center gap-1 text-[10px] font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trend === 'up' ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />}
                        {trend === 'up' ? 'Above target' : 'Below target'}
                    </div>
                )}
            </div>
        </div>
    );
}
