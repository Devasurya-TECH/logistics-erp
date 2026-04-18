import { NextResponse } from 'next/server';
import { getDbData, writeDbData } from '@/lib/db-utils';
import type { Vehicle } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await getDbData();
        return NextResponse.json(db.vehicles || []);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { id, updates } = (await request.json()) as {
            id: string;
            updates: Partial<Vehicle>;
        };

        const db = await getDbData();
        const index = db.vehicles.findIndex((vehicle: Vehicle) => vehicle.id === id);
        if (index < 0) {
            return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }

        db.vehicles[index] = { ...db.vehicles[index], ...updates };
        await writeDbData(db);
        return NextResponse.json(db.vehicles[index]);
    } catch {
        return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
    }
}
