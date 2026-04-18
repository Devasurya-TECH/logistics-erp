import { NextResponse } from 'next/server';
import { getDbData, getDbStorageInfo } from '@/lib/db-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await getDbData();
        const data = {
            drivers: db.users.filter((u: any) => u.role === 'driver'),
            vehicles: db.vehicles,
            users: db.users,
            fuelEntries: db.fuelEntries || [],
            alerts: db.alerts || [],
            storage: getDbStorageInfo(),
        };
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch master data' }, { status: 500 });
    }
}
