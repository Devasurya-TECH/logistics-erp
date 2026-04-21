import {
    STORAGE_INFO,
    hydrateDriverMediaUrls,
    hydrateFuelMediaUrls,
    listAlerts,
    listFuelEntries,
    listProfiles,
    listVehicles,
} from '@/lib/supabase-data';
import { getRequestContext, toErrorResponse } from '@/lib/server-session';
import type { Driver } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { supabase, profile } = await getRequestContext();
        const { searchParams } = new URL(request.url);
        const include = new Set((searchParams.get('include') || 'drivers,vehicles,fuel,alerts').split(',').map((item) => item.trim()).filter(Boolean));
        const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || '60') || 60));
        const resolvedFilter = searchParams.get('resolved');

        const [users, vehicles, fuelEntries, alerts] = await Promise.all([
            include.has('drivers')
                ? listProfiles(supabase, { role: 'driver' })
                : Promise.resolve([]),
            include.has('vehicles')
                ? listVehicles(supabase)
                : Promise.resolve([]),
            include.has('fuel')
                ? listFuelEntries(supabase, { limit })
                : Promise.resolve([]),
            include.has('alerts')
                ? listAlerts(
                    supabase,
                    resolvedFilter === null ? { limit } : { limit, resolved: resolvedFilter === 'true' },
                )
                : Promise.resolve([]),
        ]);

        const [hydratedDrivers, hydratedFuel] = await Promise.all([
            hydrateDriverMediaUrls(supabase, users.filter((user): user is Driver => user.role === 'driver')),
            hydrateFuelMediaUrls(supabase, fuelEntries),
        ]);

        return Response.json({
            role: profile.role,
            drivers: hydratedDrivers,
            vehicles,
            users: include.has('users') ? users : undefined,
            fuelEntries: hydratedFuel,
            alerts,
            storage: STORAGE_INFO,
        });
    } catch (error) {
        return toErrorResponse(error, 'Failed to fetch master data');
    }
}
