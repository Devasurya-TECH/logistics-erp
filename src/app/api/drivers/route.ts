import { NextResponse } from 'next/server';
import { getDbData, writeDbData } from '@/lib/db-utils';
import type { Driver } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await getDbData();
        const drivers = (db.users || []).filter((user: Driver) => user.role === 'driver');
        return NextResponse.json(drivers);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { id, updates } = (await request.json()) as {
            id: string;
            updates: Partial<Driver>;
        };

        const db = await getDbData();
        const users = db.users || [];
        const index = users.findIndex((user: Driver) => user.id === id && user.role === 'driver');
        if (index < 0) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }

        users[index] = { ...users[index], ...updates };
        db.users = users;
        await writeDbData(db);
        return NextResponse.json(users[index]);
    } catch {
        return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
    }
}
