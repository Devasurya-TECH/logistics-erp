import { listProfiles, mapDriverUpdatesToRow } from '@/lib/supabase-data';
import { getRequestContext, toErrorResponse } from '@/lib/server-session';
import type { Driver } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { supabase } = await getRequestContext();
        const profiles = await listProfiles(supabase);
        return Response.json(profiles.filter((user): user is Driver => user.role === 'driver'));
    } catch (error) {
        return toErrorResponse(error, 'Failed to fetch drivers');
    }
}

export async function PATCH(request: Request) {
    try {
        const context = await getRequestContext();
        const { id, updates } = (await request.json()) as {
            id: string;
            updates: Partial<Driver>;
        };

        if (!id || !updates || typeof updates !== 'object') {
            return Response.json({ error: 'Invalid driver update payload' }, { status: 400 });
        }

        if (!context.isAdmin && context.authUser.id !== id) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data: existingProfile, error: existingError } = await context.supabase
            .from('profiles')
            .select('current_location')
            .eq('id', id)
            .eq('role', 'driver')
            .single();

        if (existingError || !existingProfile) {
            return Response.json({ error: 'Driver not found' }, { status: 404 });
        }

        const { data, error } = await context.supabase
            .from('profiles')
            .update(mapDriverUpdatesToRow(updates, existingProfile.current_location as Record<string, unknown> | null | undefined))
            .eq('id', id)
            .eq('role', 'driver')
            .select('*')
            .single();

        if (error || !data) {
            return Response.json({ error: 'Driver not found' }, { status: 404 });
        }

        return Response.json(data);
    } catch (error) {
        return toErrorResponse(error, 'Failed to update driver');
    }
}
