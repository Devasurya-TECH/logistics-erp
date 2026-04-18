import { NextResponse } from 'next/server';
import { getDbData, writeDbData } from '@/lib/db-utils';
import type { FuelEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await getDbData();
        return NextResponse.json(db.fuelEntries || []);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch fuel entries' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const newEntry = (await request.json()) as FuelEntry;
        const db = await getDbData();
        db.fuelEntries = [...(db.fuelEntries || []), newEntry];
        await writeDbData(db);
        return NextResponse.json(newEntry, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Failed to create fuel entry' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { id, updates } = (await request.json()) as {
            id: string;
            updates: Partial<FuelEntry>;
        };

        const db = await getDbData();
        const index = db.fuelEntries.findIndex((item: FuelEntry) => item.id === id);
        if (index < 0) {
            return NextResponse.json({ error: 'Fuel entry not found' }, { status: 404 });
        }

        db.fuelEntries[index] = { ...db.fuelEntries[index], ...updates };
        await writeDbData(db);
        return NextResponse.json(db.fuelEntries[index]);
    } catch {
        return NextResponse.json({ error: 'Failed to update fuel entry' }, { status: 500 });
    }
}
