import { hydrateTripMediaUrls, listTrips, mapTripInputToRow, mapTripRow, STORAGE_INFO } from '@/lib/supabase-data';
import { ensureAdmin, getRequestContext, toErrorResponse } from '@/lib/server-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { supabase } = await getRequestContext();
        const { searchParams } = new URL(request.url);
        const scope = searchParams.get('scope') || 'all';
        const includeDrops = searchParams.get('includeDrops') !== 'false';
        const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || '60') || 60));
        const cursor = searchParams.get('cursor') || undefined;

        const statuses =
            scope === 'active'
                ? ['planned', 'assigned', 'in-progress']
                : scope === 'recent'
                    ? ['completed', 'cancelled']
                    : searchParams.getAll('status');

        const trips = await listTrips(supabase, {
            statuses: statuses.length > 0 ? statuses : undefined,
            includeDrops,
            limit,
            cursor,
        });
        const hydratedTrips = includeDrops ? await hydrateTripMediaUrls(supabase, trips) : trips;
        return Response.json({
            data: hydratedTrips,
            storage: STORAGE_INFO,
        });
    } catch (error) {
        return toErrorResponse(error, 'Failed to fetch trips');
    }
}

export async function POST(request: Request) {
    try {
        const context = await getRequestContext();
        ensureAdmin(context);

        const newTrip = await request.json();
        if (!newTrip?.id || !newTrip?.startLocation || !Array.isArray(newTrip?.drops)) {
            return Response.json({ error: 'Invalid trip payload' }, { status: 400 });
        }

        const row = {
            ...mapTripInputToRow(newTrip),
            created_by: context.authUser.id,
            supervisor_id: newTrip.supervisorId ?? context.authUser.id,
        };

        const { data, error } = await context.supabase
            .from('trips')
            .insert(row)
            .select('*')
            .single();

        if (error || !data) {
            throw error || new Error('Failed to create trip');
        }

        return Response.json({
            data: mapTripRow(data),
            storage: STORAGE_INFO,
        });
    } catch (error) {
        return toErrorResponse(error, 'Failed to add trip');
    }
}

export async function PATCH(request: Request) {
    try {
        const context = await getRequestContext();
        const { id, updates } = await request.json();
        if (!id || !updates || typeof updates !== 'object') {
            return Response.json({ error: 'Invalid trip update payload' }, { status: 400 });
        }

        if (!context.isAdmin) {
            const { data: ownedTrip, error: accessError } = await context.supabase
                .from('trips')
                .select('id')
                .eq('id', id)
                .eq('driver_id', context.authUser.id)
                .single();
            if (accessError || !ownedTrip) {
                return Response.json({ error: 'Trip not found' }, { status: 404 });
            }
        }

        const rowUpdates = mapTripInputToRow(updates);
        const { data, error } = await context.supabase
            .from('trips')
            .update(rowUpdates)
            .eq('id', id)
            .select('*')
            .single();

        if (error || !data) {
            return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        return Response.json({
            data: mapTripRow(data),
            storage: STORAGE_INFO,
        });
    } catch (error) {
        return toErrorResponse(error, 'Failed to update trip');
    }
}
