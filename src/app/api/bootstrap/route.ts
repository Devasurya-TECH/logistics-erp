import {
    STORAGE_INFO,
    hydrateDriverMediaUrls,
    hydrateFuelMediaUrls,
    hydrateTripMediaUrls,
    listAlerts,
    listFuelEntries,
    listProfiles,
    listTrips,
    listVehicles,
} from "@/lib/supabase-data";
import { getRequestContext, toErrorResponse } from "@/lib/server-session";
import type { Driver } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const context = await getRequestContext();
        const { supabase, profile, isAdmin, authUser } = context;

        const asDrivers = (items: Array<Driver | { role: string }>) =>
            items.filter((item): item is Driver => item.role === "driver");

        if (profile.role === "driver") {
            const [drivers, activeTrips, recentTrips, fuelEntries, alerts] = await Promise.all([
                listProfiles(supabase, { ids: [authUser.id], role: "driver" }),
                listTrips(supabase, {
                    statuses: ["assigned", "in-progress"],
                    limit: 6,
                    includeDrops: true,
                }),
                listTrips(supabase, {
                    statuses: ["completed", "cancelled"],
                    limit: 6,
                    includeDrops: false,
                }),
                listFuelEntries(supabase, { limit: 20 }),
                listAlerts(supabase, { limit: 20 }),
            ]);
            const trips = [...activeTrips, ...recentTrips];

            const activeVehicleIds = Array.from(
                new Set(
                    trips
                        .filter((trip) => trip.status === "assigned" || trip.status === "in-progress")
                        .map((trip) => trip.vehicleId)
                        .filter(Boolean) as string[],
                ),
            );

            const [hydratedDrivers, hydratedTrips, hydratedFuelEntries, vehicles] = await Promise.all([
                hydrateDriverMediaUrls(supabase, asDrivers(drivers)),
                hydrateTripMediaUrls(supabase, trips),
                hydrateFuelMediaUrls(supabase, fuelEntries),
                activeVehicleIds.length > 0 ? listVehicles(supabase, { ids: activeVehicleIds }) : Promise.resolve([]),
            ]);

            return Response.json({
                role: profile.role,
                drivers: hydratedDrivers,
                trips: hydratedTrips,
                vehicles,
                fuelEntries: hydratedFuelEntries,
                alerts,
                storage: STORAGE_INFO,
            });
        }

        const [drivers, vehicles, activeTrips, recentTrips, fuelEntries, alerts] = await Promise.all([
            listProfiles(supabase, { role: "driver" }),
            listVehicles(supabase),
            listTrips(supabase, {
                statuses: ["planned", "assigned", "in-progress"],
                limit: 120,
                includeDrops: true,
            }),
            listTrips(supabase, {
                statuses: ["completed", "cancelled"],
                limit: 40,
                includeDrops: true,
            }),
            listFuelEntries(supabase, {
                limit: isAdmin ? 120 : 60,
            }),
            listAlerts(supabase, { limit: 80 }),
        ]);

        const hydratedTrips = await hydrateTripMediaUrls(supabase, [...activeTrips, ...recentTrips]);
        const hydratedDrivers = await hydrateDriverMediaUrls(supabase, asDrivers(drivers));
        const hydratedFuelEntries = await hydrateFuelMediaUrls(supabase, fuelEntries);

        return Response.json({
            role: profile.role,
            drivers: hydratedDrivers,
            trips: hydratedTrips,
            vehicles,
            fuelEntries: hydratedFuelEntries,
            alerts,
            storage: STORAGE_INFO,
        });
    } catch (error) {
        return toErrorResponse(error, "Failed to fetch bootstrap data");
    }
}
