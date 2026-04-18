import { join } from 'path';
import { promises as fs } from 'fs';
import { Pool } from 'pg';
import * as initialData from './mock-data';

const DB_PATH = join(process.cwd(), 'data', 'db.json');
const STATE_ROW_ID = 'primary';
const POSTGRES_URL =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

const getInitialState = () => ({
    trips: initialData.trips,
    users: initialData.users,
    vehicles: initialData.vehicles,
    fuelEntries: initialData.fuelEntries,
    alerts: initialData.alerts,
});

// In-memory fallback for Vercel/Read-only environments
let inMemoryCache: any = null;
let storageMode: 'file' | 'memory' | 'postgres' = 'file';
let pgPool: Pool | null = null;
let pgInitPromise: Promise<boolean> | null = null;

const getPool = () => {
    if (!POSTGRES_URL) return null;
    if (pgPool) return pgPool;
    pgPool = new Pool({
        connectionString: POSTGRES_URL,
        ssl: POSTGRES_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    });
    return pgPool;
};

async function initPostgres() {
    const pool = getPool();
    if (!pool) return false;

    if (!pgInitPromise) {
        pgInitPromise = (async () => {
            try {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS logistics_app_state (
                        id TEXT PRIMARY KEY,
                        payload JSONB NOT NULL,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                `);

                const existing = await pool.query(
                    'SELECT payload FROM logistics_app_state WHERE id = $1 LIMIT 1',
                    [STATE_ROW_ID]
                );

                if (existing.rowCount === 0) {
                    await pool.query(
                        `
                        INSERT INTO logistics_app_state (id, payload, updated_at)
                        VALUES ($1, $2::jsonb, NOW())
                        `,
                        [STATE_ROW_ID, JSON.stringify(getInitialState())]
                    );
                }

                storageMode = 'postgres';
                return true;
            } catch (error) {
                console.warn('Postgres init failed. Falling back to file/memory mode.');
                return false;
            }
        })();
    }

    return pgInitPromise;
}

async function getPostgresState() {
    const initialized = await initPostgres();
    const pool = getPool();
    if (!initialized || !pool) return null;

    try {
        const result = await pool.query(
            'SELECT payload FROM logistics_app_state WHERE id = $1 LIMIT 1',
            [STATE_ROW_ID]
        );
        if (result.rowCount === 0) {
            return null;
        }
        storageMode = 'postgres';
        return result.rows[0].payload;
    } catch (error) {
        console.warn('Postgres read failed. Falling back to file/memory mode.');
        return null;
    }
}

async function writePostgresState(data: any) {
    const initialized = await initPostgres();
    const pool = getPool();
    if (!initialized || !pool) return false;

    try {
        await pool.query(
            `
            INSERT INTO logistics_app_state (id, payload, updated_at)
            VALUES ($1, $2::jsonb, NOW())
            ON CONFLICT (id)
            DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
            `,
            [STATE_ROW_ID, JSON.stringify(data)]
        );
        storageMode = 'postgres';
        return true;
    } catch (error) {
        console.warn('Postgres write failed. Falling back to file/memory mode.');
        return false;
    }
}

export async function getDbData() {
    const postgresState = await getPostgresState();
    if (postgresState) {
        inMemoryCache = postgresState;
        return postgresState;
    }

    // If we're in a read-only environment and have cache, return it
    if (inMemoryCache) return inMemoryCache;

    try {
        const file = await fs.readFile(DB_PATH, 'utf8');
        const data = JSON.parse(file);
        inMemoryCache = data;
        storageMode = 'file';
        return data;
    } catch (error) {
        console.warn("Using bundled mock data fallback (File read failed)");
        // Seed with initial mock data from the code
        inMemoryCache = getInitialState();
        storageMode = 'memory';
        return inMemoryCache;
    }
}

export async function writeDbData(data: any) {
    const wroteToPostgres = await writePostgresState(data);
    if (wroteToPostgres) {
        inMemoryCache = data;
        return true;
    }

    inMemoryCache = data;
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
        storageMode = 'file';
        return true;
    } catch (error) {
        storageMode = 'memory';
        console.warn("Write to DB file failed (likely Read-Only Environment like Vercel). Data updated in memory only.");
        return false;
    }
}

export function getDbStorageInfo() {
    return {
        mode: storageMode,
        persistent: storageMode === 'file' || storageMode === 'postgres',
    };
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
