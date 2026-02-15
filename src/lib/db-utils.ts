import { join } from 'path';
import { promises as fs } from 'fs';

const DB_PATH = join(process.cwd(), 'data', 'db.json');

// In-memory fallback for Vercel/Read-only environments (Note: Data won't persist across re-deploys or cold starts)
let inMemoryCache: any = null;

export async function getDbData() {
    if (inMemoryCache) return inMemoryCache;

    try {
        const file = await fs.readFile(DB_PATH, 'utf8');
        inMemoryCache = JSON.parse(file);
        return inMemoryCache;
    } catch (error) {
        // Fallback for when file doesn't exist or can't be read
        console.warn("Using in-memory DB fallback (File read failed)");
        if (!inMemoryCache) {
            // Initialize with default/mock data if needed, or empty
            // Ideally we should import mock data here as fallback, but for now allow empty structure
            inMemoryCache = { trips: [], users: [], vehicles: [], fuelEntries: [], alerts: [] };
        }
        return inMemoryCache;
    }
}

export async function writeDbData(data: any) {
    inMemoryCache = data; // Always update memory
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.warn("Write to DB file failed (likely Read-Only Environment like Vercel). Data updated in memory only.");
    }
}

export async function updateTrips(newTrips: any[]) {
    const db = await getDbData();
    db.trips = newTrips;
    await writeDbData(db);
}

export async function addTrip(trip: any) {
    const db = await getDbData();
    db.trips.push(trip);
    await writeDbData(db);
    return trip;
}

export async function updateTripStatus(tripId: string, status: string, drops?: any[]) {
    const db = await getDbData();
    const tripIndex = db.trips.findIndex((t: any) => t.id === tripId);
    if (tripIndex > -1) {
        db.trips[tripIndex].status = status;
        if (drops) {
            db.trips[tripIndex].drops = drops;
        }
        await writeDbData(db);
        return db.trips[tripIndex];
    }
    return null;
}
