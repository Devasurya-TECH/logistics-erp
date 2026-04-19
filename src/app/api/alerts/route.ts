import { listAlerts, mapAlertInputToRow, mapAlertRow } from '@/lib/supabase-data';
import { getRequestContext, toErrorResponse } from '@/lib/server-session';
import type { Alert } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { supabase } = await getRequestContext();
        return Response.json(await listAlerts(supabase));
    } catch (error) {
        return toErrorResponse(error, 'Failed to fetch alerts');
    }
}

export async function POST(request: Request) {
    try {
        const context = await getRequestContext();
        const newAlert = (await request.json()) as Alert;
        const { data, error } = await context.supabase
            .from('alerts')
            .insert({
                ...mapAlertInputToRow(newAlert),
                created_by: context.authUser.id,
            })
            .select('*')
            .single();

        if (error || !data) {
            throw error || new Error('Failed to create alert');
        }

        return Response.json(mapAlertRow(data), { status: 201 });
    } catch (error) {
        return toErrorResponse(error, 'Failed to create alert');
    }
}

export async function PATCH(request: Request) {
    try {
        const context = await getRequestContext();
        const { id, updates } = (await request.json()) as {
            id: string;
            updates: Partial<Alert>;
        };

        if (!id || !updates || typeof updates !== 'object') {
            return Response.json({ error: 'Invalid alert update payload' }, { status: 400 });
        }

        const { data, error } = await context.supabase
            .from('alerts')
            .update(mapAlertInputToRow(updates))
            .eq('id', id)
            .select('*')
            .single();

        if (error || !data) {
            return Response.json({ error: 'Alert not found' }, { status: 404 });
        }

        return Response.json(mapAlertRow(data));
    } catch (error) {
        return toErrorResponse(error, 'Failed to update alert');
    }
}
