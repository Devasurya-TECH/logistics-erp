"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";

type DriverActivity = {
    id: string;
    title: string;
    description: string;
    timestamp: string;
};

export default function DriverActivityPage() {
    const { user } = useAuth();
    const { trips, fuelEntries, alerts } = useStore();

    const myTrips = trips.filter((trip) => trip.driverId === user?.id);

    const activity = useMemo(() => {
        const items: DriverActivity[] = [];

        myTrips.forEach((trip) => {
            if (trip.startTime) {
                items.push({
                    id: `start-${trip.id}`,
                    title: `Trip #${trip.id.toUpperCase()} started`,
                    description: trip.startLocation.address,
                    timestamp: trip.startTime,
                });
            }

            if (trip.endTime) {
                items.push({
                    id: `end-${trip.id}`,
                    title: `Trip #${trip.id.toUpperCase()} completed`,
                    description: `${trip.drops.filter((drop) => drop.status === "delivered").length}/${trip.drops.length} delivered`,
                    timestamp: trip.endTime,
                });
            }

            trip.drops.forEach((drop) => {
                if (drop.status !== "pending") {
                    items.push({
                        id: `drop-${trip.id}-${drop.id}`,
                        title: `${drop.customerName} • ${drop.status}`,
                        description: drop.address,
                        timestamp: drop.actualArrival || trip.endTime || trip.startTime || new Date().toISOString(),
                    });
                }
            });
        });

        fuelEntries
            .filter((entry) => entry.driverId === user?.id)
            .forEach((entry) => {
                items.push({
                    id: `fuel-${entry.id}`,
                    title: `Fuel #${entry.id.toUpperCase()} • ${entry.status}`,
                    description: `₹${entry.cost.toLocaleString()} • ${entry.amount}L • ${entry.location}`,
                    timestamp: entry.timestamp,
                });
            });

        alerts
            .filter((alert) => {
                if (!user) return false;
                const trip = myTrips.find((candidate) => candidate.id === alert.tripId);
                return Boolean(trip || alert.tripId === user.id);
            })
            .forEach((alert) => {
                items.push({
                    id: `alert-${alert.id}`,
                    title: `Alert • ${alert.severity}`,
                    description: alert.message,
                    timestamp: alert.timestamp,
                });
            });

        return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }, [myTrips, fuelEntries, alerts, user]);

    return (
        <div className="space-y-3">
            {activity.length === 0 && (
                <article className="bg-white border border-gray-200 rounded-xl p-6">
                    <p className="text-slate-600">No activity logged yet.</p>
                </article>
            )}
            {activity.map((item) => (
                <article key={item.id} className="bg-white border border-gray-200 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                </article>
            ))}
        </div>
    );
}

