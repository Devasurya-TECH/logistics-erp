import { NextResponse } from 'next/server';
import { getDbData, getDbStorageInfo, writeDbData } from '@/lib/db-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await getDbData();
        return NextResponse.json({
            data: db.trips,
            storage: getDbStorageInfo(),
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const newTrip = await request.json();
        const db = await getDbData();
        db.trips.push(newTrip);
        await writeDbData(db);
        return NextResponse.json({
            data: newTrip,
            storage: getDbStorageInfo(),
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add trip' }, { status: 500 });
    }
}

export async function PATCH(request: Request) { // For multi-edit or status updates
    try {
        const { id, updates } = await request.json();
        const db = await getDbData();
        const index = db.trips.findIndex((t: any) => t.id === id);
        if (index > -1) {
            db.trips[index] = { ...db.trips[index], ...updates };
            await writeDbData(db);
            return NextResponse.json({
                data: db.trips[index],
                storage: getDbStorageInfo(),
            });
        }
        return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 });
    }
}
