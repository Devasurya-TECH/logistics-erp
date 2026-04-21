import { hydrateFuelMediaUrls, listFuelEntries, mapFuelEntryRow, mapFuelInputToRow } from '@/lib/supabase-data';
import { getRequestContext, toErrorResponse } from '@/lib/server-session';
import type { FuelEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { supabase } = await getRequestContext();
        const { searchParams } = new URL(request.url);
        const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || '50') || 50));
        const statuses = searchParams.getAll('status');
        const entries = await listFuelEntries(supabase, {
            limit,
            statuses: statuses.length > 0 ? statuses : undefined,
        });
        return Response.json(await hydrateFuelMediaUrls(supabase, entries));
    } catch (error) {
        return toErrorResponse(error, 'Failed to fetch fuel entries');
    }
}

export async function POST(request: Request) {
    try {
        const context = await getRequestContext();
        const newEntry = (await request.json()) as FuelEntry;
        const { data, error } = await context.supabase
            .from('fuel_entries')
            .insert({
                ...mapFuelInputToRow(newEntry),
                created_by: context.authUser.id,
            })
            .select('*')
            .single();

        if (error || !data) {
            throw error || new Error('Failed to create fuel entry');
        }

        return Response.json(mapFuelEntryRow(data), { status: 201 });
    } catch (error) {
        return toErrorResponse(error, 'Failed to create fuel entry');
    }
}

export async function PATCH(request: Request) {
    try {
        const context = await getRequestContext();
        const { id, updates } = (await request.json()) as {
            id: string;
            updates: Partial<FuelEntry>;
        };

        if (!id || !updates || typeof updates !== 'object') {
            return Response.json({ error: 'Invalid fuel update payload' }, { status: 400 });
        }

        const { data, error } = await context.supabase
            .from('fuel_entries')
            .update(mapFuelInputToRow(updates))
            .eq('id', id)
            .select('*')
            .single();

        if (error || !data) {
            return Response.json({ error: 'Fuel entry not found' }, { status: 404 });
        }

        return Response.json(mapFuelEntryRow(data));
    } catch (error) {
        return toErrorResponse(error, 'Failed to update fuel entry');
    }
}
