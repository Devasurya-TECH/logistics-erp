import type { SupabaseClient } from "@supabase/supabase-js";
import type { Alert, Driver, FuelEntry, Trip, User, UserRole, Vehicle } from "@/lib/types";

export const STORAGE_INFO = {
    mode: "supabase",
    persistent: true,
} as const;

export function isAdminRole(role: string | null | undefined) {
    return role === "manager" || role === "supervisor";
}

const asString = (value: unknown, fallback = "") =>
    typeof value === "string" ? value : fallback;

const asOptionalString = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : undefined;

const asNumber = (value: unknown, fallback = 0) => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value: unknown, fallback = false) =>
    typeof value === "boolean" ? value : fallback;

const asObject = <T>(value: unknown, fallback: T) =>
    value && typeof value === "object" ? (value as T) : fallback;

const isDisplayImage = (value: string) => value.startsWith("http://") || value.startsWith("https://");
const isDataImage = (value: string) => value.startsWith("data:");
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

function normalizeCheckpointProof<T extends { image?: string; imagePath?: string } | undefined>(proof: T) {
    if (!proof) return proof;

    const next = { ...proof };
    if (typeof next.image === "string" && !next.imagePath) {
        if (isDisplayImage(next.image)) {
            next.image = undefined;
        } else if (!isDataImage(next.image)) {
            next.imagePath = next.image;
            next.image = undefined;
        }
    }

    return next as T;
}

function checkpointProofForStorage(proof: Driver["dayStartProof"] | Driver["dayEndProof"]) {
    if (!proof) return proof;
    const normalized = normalizeCheckpointProof(proof);
    return {
        ...normalized,
        image:
            typeof normalized?.image === "string" && isDataImage(normalized.image)
                ? normalized.image
                : undefined,
    };
}

function normalizeDrop(drop: Trip["drops"][number]) {
    const next = { ...drop };
    if (typeof next.proofImage === "string" && !next.proofImagePath) {
        if (isDisplayImage(next.proofImage)) {
            next.proofImage = undefined;
        } else if (!isDataImage(next.proofImage)) {
            next.proofImagePath = next.proofImage;
            next.proofImage = undefined;
        }
    }
    return next;
}

function dropForStorage(drop: Trip["drops"][number]) {
    const normalized = normalizeDrop(drop);
    return {
        ...normalized,
        proofImage:
            typeof normalized.proofImage === "string" && isDataImage(normalized.proofImage)
                ? normalized.proofImage
                : undefined,
    };
}

export function mapProfileRow(row: Record<string, unknown>): User | Driver {
    const base: User = {
        id: asString(row.id),
        name: asString(row.name),
        email: asString(row.email),
        role: row.role as UserRole,
        avatar: asOptionalString(row.avatar),
    };

    if (row.role !== "driver") {
        return base;
    }

    const currentLocation = asObject<Record<string, unknown> | undefined>(row.current_location, undefined);
    const {
        dayStartProof: rawDayStartProof,
        dayEndProof: rawDayEndProof,
        ...currentLocationBase
    } = currentLocation || {};

    return {
        ...base,
        licenseNumber: asString(row.license_number),
        status: asString(row.status, "available") as Driver["status"],
        currentVehicleId: asOptionalString(row.current_vehicle_id),
        isLive: asBoolean(row.is_live, true),
        lastLocationUpdate: asOptionalString(row.last_location_update),
        dutyStatus: asString(row.duty_status, "on-duty") as Driver["dutyStatus"],
        dayStartedAt: asOptionalString(row.day_started_at),
        dayEndedAt: asOptionalString(row.day_ended_at),
        onBreak: asBoolean(row.on_break, false),
        breakStartedAt: asOptionalString(row.break_started_at),
        breakType: row.break_type as Driver["breakType"] | undefined,
        totalBreakMinutes: asNumber(row.total_break_minutes),
        lastActivityAt: asOptionalString(row.last_activity_at),
        currentLocation: currentLocationBase as Driver["currentLocation"] | undefined,
        dayStartProof: normalizeCheckpointProof(rawDayStartProof as Driver["dayStartProof"]),
        dayEndProof: normalizeCheckpointProof(rawDayEndProof as Driver["dayEndProof"]),
        lastDeliveryProof: normalizeCheckpointProof(
            row.last_delivery_proof as Driver["lastDeliveryProof"] | undefined,
        ) as Driver["lastDeliveryProof"] | undefined,
    };
}

export function mapVehicleRow(row: Record<string, unknown>): Vehicle {
    return {
        id: asString(row.id),
        plateNumber: asString(row.plate_number),
        model: asString(row.model),
        status: asString(row.status, "active") as Vehicle["status"],
        fuelLevel: asNumber(row.fuel_level),
        mileage: asNumber(row.mileage),
        location: asObject(row.location, { lat: 0, lng: 0 }),
        lastServiceDate: asString(row.last_service_date, new Date().toISOString().slice(0, 10)),
        fuelType: row.fuel_type as Vehicle["fuelType"] | undefined,
    };
}

export function mapTripRow(row: Record<string, unknown>): Trip {
    return {
        id: asString(row.id),
        vehicleId: asOptionalString(row.vehicle_id),
        driverId: asOptionalString(row.driver_id),
        supervisorId: asOptionalString(row.supervisor_id),
        status: asString(row.status) as Trip["status"],
        startLocation: asObject(row.start_location, { lat: 0, lng: 0, address: "" }),
        drops: Array.isArray(row.drops) ? (row.drops as Trip["drops"]).map((drop) => normalizeDrop(drop)) : [],
        startTime: asOptionalString(row.start_time),
        endTime: asOptionalString(row.end_time),
        estimatedDistance: asNumber(row.estimated_distance),
        actualDistance: row.actual_distance === null || row.actual_distance === undefined
            ? undefined
            : asNumber(row.actual_distance),
    };
}

export function mapFuelEntryRow(row: Record<string, unknown>): FuelEntry {
    const storedReceipt = asOptionalString(row.receipt_image);
    return {
        id: asString(row.id),
        tripId: asString(row.trip_id),
        driverId: asString(row.driver_id),
        vehicleId: asString(row.vehicle_id),
        amount: asNumber(row.amount),
        cost: asNumber(row.cost),
        currency: asString(row.currency, "INR"),
        odometer: asNumber(row.odometer),
        location: asString(row.location),
        pumpName: asOptionalString(row.pump_name),
        fuelType: row.fuel_type as FuelEntry["fuelType"] | undefined,
        timestamp: asString(row.timestamp, new Date().toISOString()),
        receiptImage:
            storedReceipt && (isDisplayImage(storedReceipt) || isDataImage(storedReceipt))
                ? storedReceipt
                : undefined,
        receiptImagePath:
            storedReceipt && !isDisplayImage(storedReceipt) && !isDataImage(storedReceipt)
                ? storedReceipt
                : undefined,
        status: asString(row.status) as FuelEntry["status"],
        verifiedBy: asOptionalString(row.verified_by),
        approvedBy: asOptionalString(row.approved_by),
    };
}

export function mapAlertRow(row: Record<string, unknown>): Alert {
    return {
        id: asString(row.id),
        type: asString(row.type) as Alert["type"],
        severity: asString(row.severity) as Alert["severity"],
        message: asString(row.message),
        timestamp: asString(row.timestamp, new Date().toISOString()),
        vehicleId: asOptionalString(row.vehicle_id),
        tripId: asOptionalString(row.trip_id),
        resolved: asBoolean(row.resolved, false),
        metadata: row.metadata as Alert["metadata"] | undefined,
    };
}

export function mapTripInputToRow(input: Partial<Trip>) {
    const row: Record<string, unknown> = {};

    if ("id" in input) row.id = input.id;
    if ("vehicleId" in input) row.vehicle_id = input.vehicleId ?? null;
    if ("driverId" in input) row.driver_id = input.driverId ?? null;
    if ("supervisorId" in input) row.supervisor_id = input.supervisorId ?? null;
    if ("status" in input) row.status = input.status;
    if ("startLocation" in input) row.start_location = input.startLocation ?? null;
    if ("drops" in input) row.drops = (input.drops ?? []).map((drop) => dropForStorage(drop));
    if ("startTime" in input) row.start_time = input.startTime ?? null;
    if ("endTime" in input) row.end_time = input.endTime ?? null;
    if ("estimatedDistance" in input) row.estimated_distance = input.estimatedDistance ?? 0;
    if ("actualDistance" in input) row.actual_distance = input.actualDistance ?? null;

    return row;
}

export function mapDriverUpdatesToRow(
    updates: Partial<Driver>,
    existingCurrentLocation?: Record<string, unknown> | null,
) {
    const row: Record<string, unknown> = {};
    const existingLocation = asObject<Record<string, unknown> | undefined>(existingCurrentLocation, undefined);
    const {
        dayStartProof: existingDayStartProofRaw,
        dayEndProof: existingDayEndProofRaw,
        ...existingBaseLocation
    } = existingLocation || {};
    const existingDayStartProof = existingDayStartProofRaw as Driver["dayStartProof"] | undefined;
    const existingDayEndProof = existingDayEndProofRaw as Driver["dayEndProof"] | undefined;

    if ("name" in updates) row.name = updates.name ?? null;
    if ("email" in updates) row.email = updates.email ?? null;
    if ("avatar" in updates) row.avatar = updates.avatar ?? null;
    if ("licenseNumber" in updates) row.license_number = updates.licenseNumber ?? null;
    if ("status" in updates) row.status = updates.status ?? null;
    if ("currentVehicleId" in updates) row.current_vehicle_id = updates.currentVehicleId ?? null;
    if ("isLive" in updates) row.is_live = updates.isLive ?? true;
    if ("lastLocationUpdate" in updates) row.last_location_update = updates.lastLocationUpdate ?? null;
    if ("dutyStatus" in updates) row.duty_status = updates.dutyStatus ?? null;
    if ("dayStartedAt" in updates) row.day_started_at = updates.dayStartedAt ?? null;
    if ("dayEndedAt" in updates) row.day_ended_at = updates.dayEndedAt ?? null;
    if ("onBreak" in updates) row.on_break = updates.onBreak ?? false;
    if ("breakStartedAt" in updates) row.break_started_at = updates.breakStartedAt ?? null;
    if ("breakType" in updates) row.break_type = updates.breakType ?? null;
    if ("totalBreakMinutes" in updates) row.total_break_minutes = updates.totalBreakMinutes ?? 0;
    if ("lastActivityAt" in updates) row.last_activity_at = updates.lastActivityAt ?? null;
    if ("lastDeliveryProof" in updates) {
        row.last_delivery_proof = updates.lastDeliveryProof
            ? {
                ...normalizeCheckpointProof(updates.lastDeliveryProof),
                image:
                    typeof updates.lastDeliveryProof.image === "string" && isDataImage(updates.lastDeliveryProof.image)
                        ? updates.lastDeliveryProof.image
                        : undefined,
            }
            : null;
    }

    if ("currentLocation" in updates || "dayStartProof" in updates || "dayEndProof" in updates) {
        const nextLocation: Record<string, unknown> =
            "currentLocation" in updates
                ? updates.currentLocation
                    ? { ...updates.currentLocation }
                    : {}
                : { ...existingBaseLocation };

        const nextDayStartProof =
            "dayStartProof" in updates ? updates.dayStartProof : existingDayStartProof;
        const nextDayEndProof =
            "dayEndProof" in updates ? updates.dayEndProof : existingDayEndProof;

        if (nextDayStartProof) {
            nextLocation.dayStartProof = checkpointProofForStorage(nextDayStartProof);
        }
        if (nextDayEndProof) {
            nextLocation.dayEndProof = checkpointProofForStorage(nextDayEndProof);
        }

        row.current_location = Object.keys(nextLocation).length > 0 ? nextLocation : null;
    }

    return row;
}

export function mapVehicleUpdatesToRow(updates: Partial<Vehicle>) {
    const row: Record<string, unknown> = {};

    if ("plateNumber" in updates) row.plate_number = updates.plateNumber ?? null;
    if ("model" in updates) row.model = updates.model ?? null;
    if ("status" in updates) row.status = updates.status ?? null;
    if ("fuelLevel" in updates) row.fuel_level = updates.fuelLevel ?? 0;
    if ("mileage" in updates) row.mileage = updates.mileage ?? 0;
    if ("location" in updates) row.location = updates.location ?? null;
    if ("lastServiceDate" in updates) row.last_service_date = updates.lastServiceDate ?? null;
    if ("fuelType" in updates) row.fuel_type = updates.fuelType ?? null;

    return row;
}

export function mapFuelInputToRow(entry: Partial<FuelEntry>) {
    const row: Record<string, unknown> = {};

    if ("id" in entry) row.id = entry.id;
    if ("tripId" in entry) row.trip_id = entry.tripId ?? null;
    if ("driverId" in entry) row.driver_id = entry.driverId ?? null;
    if ("vehicleId" in entry) row.vehicle_id = entry.vehicleId ?? null;
    if ("amount" in entry) row.amount = entry.amount ?? 0;
    if ("cost" in entry) row.cost = entry.cost ?? 0;
    if ("currency" in entry) row.currency = entry.currency ?? "INR";
    if ("odometer" in entry) row.odometer = entry.odometer ?? 0;
    if ("location" in entry) row.location = entry.location ?? null;
    if ("pumpName" in entry) row.pump_name = entry.pumpName ?? null;
    if ("fuelType" in entry) row.fuel_type = entry.fuelType ?? null;
    if ("timestamp" in entry) row.timestamp = entry.timestamp ?? new Date().toISOString();
    if ("receiptImagePath" in entry) {
        row.receipt_image = entry.receiptImagePath ?? null;
    } else if ("receiptImage" in entry) {
        row.receipt_image = entry.receiptImage ?? null;
    }
    if ("status" in entry) row.status = entry.status ?? "pending";
    if ("verifiedBy" in entry) row.verified_by = entry.verifiedBy ?? null;
    if ("approvedBy" in entry) row.approved_by = entry.approvedBy ?? null;

    return row;
}

export function mapAlertInputToRow(alert: Partial<Alert>) {
    const row: Record<string, unknown> = {};

    if ("id" in alert) row.id = alert.id;
    if ("type" in alert) row.type = alert.type ?? null;
    if ("severity" in alert) row.severity = alert.severity ?? null;
    if ("message" in alert) row.message = alert.message ?? null;
    if ("timestamp" in alert) row.timestamp = alert.timestamp ?? new Date().toISOString();
    if ("vehicleId" in alert) row.vehicle_id = alert.vehicleId ?? null;
    if ("tripId" in alert) row.trip_id = alert.tripId ?? null;
    if ("resolved" in alert) row.resolved = alert.resolved ?? false;
    if ("metadata" in alert) row.metadata = alert.metadata ?? null;

    return row;
}

export async function listTrips(
    supabase: SupabaseClient,
    options?: {
        statuses?: string[];
        limit?: number;
        cursor?: string;
        includeDrops?: boolean;
    },
) {
    let query = supabase
        .from("trips")
        .select(
            options?.includeDrops === false
                ? "id,vehicle_id,driver_id,supervisor_id,status,start_location,start_time,end_time,estimated_distance,actual_distance,created_at,updated_at"
                : "*",
        )
        .order("created_at", { ascending: false });

    if (options?.statuses?.length) {
        query = query.in("status", options.statuses);
    }
    if (options?.cursor) {
        query = query.lt("created_at", options.cursor);
    }
    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return ((data || []) as unknown as Record<string, unknown>[]).map(mapTripRow);
}

export async function listProfiles(
    supabase: SupabaseClient,
    options?: { ids?: string[]; role?: UserRole },
) {
    let query = supabase
        .from("profiles")
        .select("*")
        .order("name", { ascending: true });

    if (options?.role) {
        query = query.eq("role", options.role);
    }
    if (options?.ids?.length) {
        query = query.in("id", options.ids);
    }

    const { data, error } = await query;
    if (error) throw error;
    return ((data || []) as unknown as Record<string, unknown>[]).map(mapProfileRow);
}

export async function listVehicles(
    supabase: SupabaseClient,
    options?: { ids?: string[] },
) {
    let query = supabase
        .from("vehicles")
        .select("*")
        .order("plate_number", { ascending: true });

    if (options?.ids?.length) {
        query = query.in("id", options.ids);
    }

    const { data, error } = await query;
    if (error) throw error;
    return ((data || []) as unknown as Record<string, unknown>[]).map(mapVehicleRow);
}

export async function listFuelEntries(
    supabase: SupabaseClient,
    options?: {
        statuses?: string[];
        limit?: number;
    },
) {
    let query = supabase
        .from("fuel_entries")
        .select("*")
        .order("timestamp", { ascending: false });

    if (options?.statuses?.length) {
        query = query.in("status", options.statuses);
    }
    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return ((data || []) as unknown as Record<string, unknown>[]).map(mapFuelEntryRow);
}

export async function listAlerts(
    supabase: SupabaseClient,
    options?: {
        resolved?: boolean;
        limit?: number;
    },
) {
    let query = supabase
        .from("alerts")
        .select("*")
        .order("timestamp", { ascending: false });

    if (typeof options?.resolved === "boolean") {
        query = query.eq("resolved", options.resolved);
    }
    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return ((data || []) as unknown as Record<string, unknown>[]).map(mapAlertRow);
}

async function createSignedUrlMap(supabase: SupabaseClient, paths: string[]) {
    const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
    if (uniquePaths.length === 0) return new Map<string, string>();

    const { data, error } = await supabase.storage
        .from("proofs")
        .createSignedUrls(uniquePaths, SIGNED_URL_TTL_SECONDS);

    if (error) throw error;

    return new Map(
        (data || [])
            .filter((item) => item.path && item.signedUrl)
            .map((item) => [item.path, item.signedUrl]),
    );
}

export async function hydrateTripMediaUrls(supabase: SupabaseClient, trips: Trip[]) {
    const paths = trips.flatMap((trip) =>
        trip.drops.map((drop) => drop.proofImagePath).filter(Boolean) as string[],
    );
    const signedMap = await createSignedUrlMap(supabase, paths);

    return trips.map((trip) => ({
        ...trip,
        drops: trip.drops.map((drop) => ({
            ...drop,
            proofImage: drop.proofImagePath
                ? signedMap.get(drop.proofImagePath) || drop.proofImage
                : drop.proofImage,
        })),
    }));
}

export async function hydrateFuelMediaUrls(supabase: SupabaseClient, entries: FuelEntry[]) {
    const signedMap = await createSignedUrlMap(
        supabase,
        entries.map((entry) => entry.receiptImagePath).filter(Boolean) as string[],
    );

    return entries.map((entry) => ({
        ...entry,
        receiptImage: entry.receiptImagePath
            ? signedMap.get(entry.receiptImagePath) || entry.receiptImage
            : entry.receiptImage,
    }));
}

export async function hydrateDriverMediaUrls(supabase: SupabaseClient, drivers: Driver[]) {
    const paths = drivers.flatMap((driver) =>
        [
            driver.dayStartProof?.imagePath,
            driver.dayEndProof?.imagePath,
            driver.lastDeliveryProof?.imagePath,
        ].filter(Boolean) as string[],
    );
    const signedMap = await createSignedUrlMap(supabase, paths);

    return drivers.map((driver) => ({
        ...driver,
        dayStartProof: driver.dayStartProof
            ? {
                ...driver.dayStartProof,
                image: driver.dayStartProof.imagePath
                    ? signedMap.get(driver.dayStartProof.imagePath) || driver.dayStartProof.image
                    : driver.dayStartProof.image,
            }
            : driver.dayStartProof,
        dayEndProof: driver.dayEndProof
            ? {
                ...driver.dayEndProof,
                image: driver.dayEndProof.imagePath
                    ? signedMap.get(driver.dayEndProof.imagePath) || driver.dayEndProof.image
                    : driver.dayEndProof.image,
            }
            : driver.dayEndProof,
        lastDeliveryProof: driver.lastDeliveryProof
            ? {
                ...driver.lastDeliveryProof,
                image: driver.lastDeliveryProof.imagePath
                    ? signedMap.get(driver.lastDeliveryProof.imagePath) || driver.lastDeliveryProof.image
                    : driver.lastDeliveryProof.image,
            }
            : driver.lastDeliveryProof,
    }));
}
