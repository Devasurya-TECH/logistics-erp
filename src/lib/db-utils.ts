import { join } from 'path';
import { promises as fs } from 'fs';

const DB_PATH = join(process.cwd(), 'data', 'db.json');

// In-memory fallback for Vercel/Read-only environments
let inMemoryCache: any = null;
let isReadOnly = false; // Detected on first write failure

export async function getDbData() {
    // If we're in a read-only environment, use cache
    if (isReadOnly && inMemoryCache) return inMemoryCache;

    try {
        const file = await fs.readFile(DB_PATH, 'utf8');
        const data = JSON.parse(file);
        inMemoryCache = data; // Update cache
        return data;
    } catch (error) {
        console.warn("Using in-memory DB fallback (File read failed)");
        if (!inMemoryCache) {
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
        isReadOnly = true;
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
