import { listVehicles, mapVehicleRow, mapVehicleUpdatesToRow } from '@/lib/supabase-data';
import { getRequestContext, toErrorResponse } from '@/lib/server-session';
import type { Vehicle } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { supabase } = await getRequestContext();
        return Response.json(await listVehicles(supabase));
    } catch (error) {
        return toErrorResponse(error, 'Failed to fetch vehicles');
    }
}

export async function PATCH(request: Request) {
    try {
        const context = await getRequestContext();
        const { id, updates } = (await request.json()) as {
            id: string;
            updates: Partial<Vehicle>;
        };

        if (!id || !updates || typeof updates !== 'object') {
            return Response.json({ error: 'Invalid vehicle update payload' }, { status: 400 });
        }

        const { data, error } = await context.supabase
            .from('vehicles')
            .update(mapVehicleUpdatesToRow(updates))
            .eq('id', id)
            .select('*')
            .single();

        if (error || !data) {
            return Response.json({ error: 'Vehicle not found' }, { status: 404 });
        }

        return Response.json(mapVehicleRow(data));
    } catch (error) {
        return toErrorResponse(error, 'Failed to update vehicle');
    }
}
