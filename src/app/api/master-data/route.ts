import { NextResponse } from 'next/server';
import { getDbData } from '@/lib/db-utils';

export async function GET() {
    try {
        const db = await getDbData();
        const data = {
            drivers: db.users.filter((u: any) => u.role === 'driver'),
            vehicles: db.vehicles,
            // also load other master data if needed
            users: db.users, // Might need for auth
        };
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch master data' }, { status: 500 });
    }
}
