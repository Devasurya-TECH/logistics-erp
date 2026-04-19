import { listAlerts, listFuelEntries, listProfiles, listVehicles, STORAGE_INFO } from '@/lib/supabase-data';
import { getRequestContext, toErrorResponse } from '@/lib/server-session';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { supabase } = await getRequestContext();
        const [users, vehicles, fuelEntries, alerts] = await Promise.all([
            listProfiles(supabase),
            listVehicles(supabase),
            listFuelEntries(supabase),
            listAlerts(supabase),
        ]);

        return Response.json({
            drivers: users.filter((user) => user.role === 'driver'),
            vehicles,
            users,
            fuelEntries,
            alerts,
            storage: STORAGE_INFO,
        });
    } catch (error) {
        return toErrorResponse(error, 'Failed to fetch master data');
    }
}
