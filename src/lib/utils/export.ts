"use client";

import { Trip, Driver, Vehicle, FuelEntry, Alert } from "../types";
import { format } from "date-fns";

export interface ExportData {
    date: string;
    tripId: string;
    vehiclePlate: string;
    driverName: string;
    startPoint: string;
    endPoint: string;
    stops: number;
    distance: number;
    timeTaken: string;
    fuelQty: number;
    fuelCost: number;
    avgSpeed: number;
    maxSpeed: number;
    sos: string;
    kmPerLitre: string;
    litrePerKm: string;
    status: string;
}

export const generateTripCSV = (
    trips: Trip[],
    drivers: Driver[],
    vehicles: Vehicle[],
    fuelEntries: FuelEntry[],
    alerts: Alert[]
): string => {
    const headers = [
        "Date", "Trip ID", "Vehicle No", "Driver Name", "Start Point", "End Point",
        "Stops", "Dist. (KM)", "Time", "Fuel Qty (L)", "Fuel Cost (₹)",
        "Avg Speed", "Max Speed", "SOS", "KM/L", "L/KM", "Status"
    ];

    const rows = trips.map(trip => {
        const driver = drivers.find(d => d.id === trip.driverId);
        const vehicle = vehicles.find(v => v.id === trip.vehicleId);
        const tripFuel = fuelEntries.filter(f => f.tripId === trip.id);
        const totalFuel = tripFuel.reduce((sum, f) => sum + f.amount, 0);
        const totalCost = tripFuel.reduce((sum, f) => sum + f.cost, 0);
        const tripAlerts = alerts.filter(a => a.vehicleId === trip.vehicleId && a.timestamp >= (trip.startTime || ''));
        const hasSOS = tripAlerts.some(a => a.severity === 'critical');

        const dist = trip.actualDistance || trip.estimatedDistance || 0;
        const kmL = totalFuel > 0 ? (dist / totalFuel).toFixed(2) : "0.00";
        const lKm = dist > 0 ? (totalFuel / dist).toFixed(3) : "0.000";

        // Simulated speed data
        const avgSpeed = dist > 0 ? Math.floor(Math.random() * 15) + 35 : 0;
        const maxSpeed = dist > 0 ? avgSpeed + Math.floor(Math.random() * 20) + 10 : 0;

        // Calculate time
        let durationStr = "--";
        if (trip.startTime && trip.endTime) {
            const start = new Date(trip.startTime);
            const end = new Date(trip.endTime);
            const diffMs = end.getTime() - start.getTime();
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            durationStr = `${hours}h ${mins}m`;
        }

        return [
            trip.startTime ? format(new Date(trip.startTime), 'yyyy-MM-dd') : "N/A",
            trip.id.toUpperCase(),
            vehicle?.plateNumber || "N/A",
            driver?.name || "Unassigned",
            `"${trip.startLocation.address.replace(/"/g, '""')}"`,
            `"${(trip.drops[trip.drops.length - 1]?.address || "N/A").replace(/"/g, '""')}"`,
            trip.drops.length,
            dist,
            durationStr,
            totalFuel.toFixed(1),
            totalCost,
            avgSpeed,
            maxSpeed,
            hasSOS ? "YES" : "NO",
            kmL,
            lKm,
            trip.status.toUpperCase()
        ];
    });

    return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
};

export const downloadCSV = (filename: string, csv: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
