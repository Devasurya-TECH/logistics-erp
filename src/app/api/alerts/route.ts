import { NextResponse } from 'next/server';
import { getDbData, writeDbData } from '@/lib/db-utils';
import type { Alert } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await getDbData();
        return NextResponse.json(db.alerts || []);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const newAlert = (await request.json()) as Alert;
        const db = await getDbData();
        db.alerts = [newAlert, ...(db.alerts || [])];
        const persisted = await writeDbData(db);
        if (!persisted) {
            return NextResponse.json(
                { error: 'Persistence unavailable. Use local server or configure persistent database.' },
                { status: 503 },
            );
        }
        return NextResponse.json(newAlert, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { id, updates } = (await request.json()) as {
            id: string;
            updates: Partial<Alert>;
        };

        const db = await getDbData();
        const index = db.alerts.findIndex((item: Alert) => item.id === id);
        if (index < 0) {
            return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
        }

        db.alerts[index] = { ...db.alerts[index], ...updates };
        const persisted = await writeDbData(db);
        if (!persisted) {
            return NextResponse.json(
                { error: 'Persistence unavailable. Use local server or configure persistent database.' },
                { status: 503 },
            );
        }
        return NextResponse.json(db.alerts[index]);
    } catch {
        return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }
}
