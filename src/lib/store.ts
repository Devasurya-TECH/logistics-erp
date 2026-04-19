import { create } from 'zustand';
import { Trip, Vehicle, Driver, FuelEntry, Alert, TripStartProof, TripEndProof } from './types';
import { useNotifications } from './notifications';

interface AppState {
    trips: Trip[];
    vehicles: Vehicle[];
    drivers: Driver[];
    fuelEntries: FuelEntry[];
    alerts: Alert[];
    isLoading: boolean;

    // Actions
    clearData: () => void;
    fetchInitialData: () => Promise<void>;
    addTrip: (trip: Trip) => Promise<void>;
    updateTripStatus: (tripId: string, status: Trip['status']) => Promise<void>;
    updateDropStatus: (
        tripId: string,
        dropId: string,
        status: 'delivered' | 'failed',
        details?: {
            proofImage?: string;
            proofCapturedAt?: string;
            proofLat?: number;
            proofLng?: number;
            proofLocation?: string;
            failureReason?: string;
            notes?: string;
        }
    ) => Promise<void>;

    // Other actions remain local for now or can be hooked up similarly
    assignDriver: (tripId: string, driverId: string, vehicleId: string) => Promise<void>;
    acceptTrip: (tripId: string, startProof: TripStartProof) => Promise<void>;
    verifyTripStartProof: (tripId: string, supervisorId: string) => Promise<void>;
    verifyDropReview: (tripId: string, dropId: string, supervisorId: string) => Promise<void>;
    toggleLiveStatus: (driverId: string, isLive: boolean) => Promise<void>;
    triggerEmergency: (
        driverId: string,
        tripId?: string,
        details?: {
            issueType?: string;
            description?: string;
            etaMinutes?: number;
            severe?: boolean;
            informSupervisor?: boolean;
        }
    ) => Promise<void>;
    startDriverDay: (driverId: string) => Promise<void>;
    endDriverDay: (driverId: string, endProof?: TripEndProof) => Promise<void>;
    startDriverBreak: (driverId: string, informed?: boolean) => Promise<void>;
    endDriverBreak: (driverId: string) => Promise<void>;
    registerDriverActivity: (driverId: string) => Promise<void>;
    addFuelEntry: (entry: FuelEntry) => Promise<void>;
    verifyFuelEntry: (entryId: string, supervisorId: string) => Promise<void>;
    rejectFuelEntry: (entryId: string, supervisorId: string) => Promise<void>;
    approveFuelEntry: (entryId: string, managerId: string) => Promise<void>;
    verifyTripEndProof: (tripId: string, supervisorId: string) => Promise<void>;
    updateVehicleLocation: (vehicleId: string, location: { lat: number; lng: number }) => Promise<void>;
    resolveAlert: (alertId: string) => Promise<void>;
}

// Helper to safely send notifications (doesn't break if notification store isn't ready)
const notify = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    try {
        useNotifications.getState().addNotification(type, title, message);
    } catch { /* silent if store not ready */ }
};

const request = async (url: string, init: RequestInit) => {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...init,
    });

    let payload: { error?: string } | null = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(payload?.error || `Request failed: ${url}`);
    }

    return payload;
};

const isOpenTrip = (trip: Trip) => trip.status !== 'completed' && trip.status !== 'cancelled';

const hasActiveTrip = (trips: Trip[], driverId: string) =>
    trips.some(
        (trip) =>
            trip.driverId === driverId &&
            isOpenTrip(trip)
    );

const calculateBreakMinutes = (startedAt?: string) => {
    if (!startedAt) return 0;
    const diffMs = Date.now() - new Date(startedAt).getTime();
    return Math.max(0, Math.round(diffMs / 60000));
};

const hasValidTripProof = (proof?: TripStartProof | TripEndProof) =>
    Boolean(proof?.image) &&
    Number.isFinite(proof?.odometer) &&
    Number.isFinite(proof?.fuelReading) &&
    Number.isFinite(proof?.lat) &&
    Number.isFinite(proof?.lng) &&
    Boolean(proof?.location?.trim());

const getDriverById = (drivers: Driver[], driverId?: string) =>
    driverId ? drivers.find((driver) => driver.id === driverId) : undefined;

const isDriverOnBreak = (drivers: Driver[], driverId?: string) =>
    Boolean(getDriverById(drivers, driverId)?.onBreak);

let lastSyncErrorAt = 0;

export const useStore = create<AppState>((set, get) => ({
    trips: [],
    vehicles: [],
    drivers: [],
    fuelEntries: [],
    alerts: [],
    isLoading: true,

    clearData: () => {
        set({
            trips: [],
            vehicles: [],
            drivers: [],
            fuelEntries: [],
            alerts: [],
            isLoading: false,
        });
    },

    fetchInitialData: async () => {
        try {
            const current = get();
            const isFirstLoad =
                current.isLoading &&
                current.trips.length === 0 &&
                current.vehicles.length === 0 &&
                current.drivers.length === 0;
            if (isFirstLoad) {
                set({ isLoading: true });
            }

            // Fetch trips
            const tripsRes = await fetch('/api/trips', {
                cache: 'no-store',
                credentials: 'include',
            });
            if (tripsRes.status === 401) {
                set({
                    trips: [],
                    vehicles: [],
                    drivers: [],
                    fuelEntries: [],
                    alerts: [],
                    isLoading: false,
                });
                return;
            }
            const tripsPayload = await tripsRes.json();
            const trips = Array.isArray(tripsPayload) ? tripsPayload : (tripsPayload?.data || []);

            // Fetch master data
            const masterRes = await fetch('/api/master-data', {
                cache: 'no-store',
                credentials: 'include',
            });
            if (masterRes.status === 401) {
                set({
                    trips: [],
                    vehicles: [],
                    drivers: [],
                    fuelEntries: [],
                    alerts: [],
                    isLoading: false,
                });
                return;
            }
            const masterData = await masterRes.json();

            set({
                trips,
                drivers: (masterData.drivers || []).map((driver: Driver) => ({
                    ...driver,
                    isLive: driver.isLive ?? true,
                    dutyStatus: driver.dutyStatus ?? (driver.status === 'off-duty' ? 'off-duty' : 'on-duty'),
                    onBreak: driver.onBreak ?? false,
                    totalBreakMinutes: driver.totalBreakMinutes ?? 0,
                    lastActivityAt: driver.lastActivityAt ?? driver.lastLocationUpdate ?? new Date().toISOString(),
                })),
                vehicles: masterData.vehicles,
                fuelEntries: masterData.fuelEntries || [],
                alerts: masterData.alerts || [],
                isLoading: false
            });
        } catch (error) {
            console.error("Failed to load data", error);
            set({ isLoading: false });
            if (Date.now() - lastSyncErrorAt > 15000) {
                lastSyncErrorAt = Date.now();
                notify('error', 'Connection Error', 'Failed to load fleet data. Retrying...');
            }
        }
    },

    addTrip: async (trip) => {
        try {
            if (trip.driverId && hasActiveTrip(get().trips, trip.driverId)) {
                const driver = get().drivers.find((item) => item.id === trip.driverId);
                throw new Error(`${driver?.name || 'Driver'} already has an open trip.`);
            }

            const payload = await request('/api/trips', {
                method: 'POST',
                body: JSON.stringify(trip),
            }) as { data?: Trip } | null;
            const savedTrip = payload?.data || trip;

            set((state) => ({ trips: [...state.trips.filter((item) => item.id !== savedTrip.id), savedTrip] }));

            if (savedTrip.driverId && savedTrip.status === 'assigned') {
                const driverUpdates: Partial<Driver> = {
                    status: 'on-trip',
                    currentVehicleId: savedTrip.vehicleId,
                    isLive: true,
                    lastLocationUpdate: new Date().toISOString(),
                    lastActivityAt: new Date().toISOString(),
                    onBreak: false,
                    breakStartedAt: undefined,
                    breakType: undefined,
                };

                await request('/api/drivers', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: savedTrip.driverId, updates: driverUpdates }),
                });

                set((state) => ({
                    drivers: state.drivers.map((driver) =>
                        driver.id === savedTrip.driverId ? { ...driver, ...driverUpdates } : driver
                    ),
                }));
            }

            notify('success', 'Trip Created', `Trip #${savedTrip.id.toUpperCase()} has been created successfully.`);
        } catch (error) {
            console.error('Trip creation failed', error);
            notify('error', 'Trip Create Failed', error instanceof Error ? error.message : 'Unable to create trip.');
            throw error;
        }
    },

    updateTripStatus: async (tripId, status) => {
        const trip = get().trips.find((item) => item.id === tripId);
        if (!trip) return;
        if (isDriverOnBreak(get().drivers, trip.driverId)) {
            notify('warning', 'Break Active', 'End the current break before updating the trip.');
            return;
        }

        if (status === 'in-progress' && !trip.startProof) {
            notify(
                'warning',
                'Start Proof Required',
                'Use Start Trip and upload odometer/fuel proof before moving the trip in progress.'
            );
            return;
        }

        if (status === 'completed') {
            const allStopsResolved = trip.drops.length > 0 && trip.drops.every((drop) =>
                drop.status === 'delivered' || drop.status === 'failed'
            );
            const startProofVerified = Boolean(trip.startProof?.verifiedAt);
            const endProofVerified = Boolean(trip.endProof?.verifiedAt);
            const allStopsReviewed = trip.drops.every((drop) => {
                if (drop.status === 'delivered') {
                    return Boolean(drop.proofImage && drop.proofLocation && drop.proofVerifiedAt);
                }
                if (drop.status === 'failed') {
                    return Boolean(drop.reviewedAt);
                }
                return false;
            });

            if (!allStopsResolved || !startProofVerified || !endProofVerified || !allStopsReviewed) {
                notify(
                    'warning',
                    'Supervisor Verification Required',
                    'Verify trip start proof, end proof, and every delivered/failed stop before marking the trip completed.'
                );
                return;
            }
        }

        const tripUpdates: Partial<Trip> = { status };
        if (status === 'in-progress' && !trip.startTime) {
            tripUpdates.startTime = new Date().toISOString();
        }
        if ((status === 'completed' || status === 'cancelled') && !trip.endTime) {
            tripUpdates.endTime = new Date().toISOString();
        }

        // Optimistic trip update
        set((state) => ({
            trips: state.trips.map(t => t.id === tripId ? { ...t, ...tripUpdates } : t)
        }));

        const statusMessages: Record<string, string> = {
            'in-progress': 'Trip is now in progress',
            'completed': 'Trip completed successfully! 🎉',
            'cancelled': 'Trip has been cancelled',
            'assigned': 'Trip has been assigned to driver',
        };
        notify(
            status === 'cancelled' ? 'warning' : 'success',
            `Trip #${tripId.toUpperCase()}`,
            statusMessages[status] || `Status updated to ${status}`
        );

        await request('/api/trips', {
            method: 'PATCH',
            body: JSON.stringify({ id: tripId, updates: tripUpdates })
        });

        if (trip.driverId && (status === 'completed' || status === 'cancelled')) {
            const currentDriver = get().drivers.find((driver) => driver.id === trip.driverId);
            const driverUpdates: Partial<Driver> = {
                status: currentDriver?.dutyStatus === 'off-duty' ? 'off-duty' : 'available',
                currentVehicleId: undefined,
                onBreak: false,
                breakStartedAt: undefined,
                breakType: undefined,
                lastActivityAt: new Date().toISOString(),
            };

            set((state) => ({
                drivers: state.drivers.map((driver) =>
                    driver.id === trip.driverId ? { ...driver, ...driverUpdates } : driver
                ),
            }));

            try {
                await request('/api/drivers', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: trip.driverId, updates: driverUpdates }),
                });
            } catch (error) {
                console.error('Driver release persistence failed', error);
            }
        }
    },

    updateDropStatus: async (tripId, dropId, status, details) => {
        const currentTrip = get().trips.find(t => t.id === tripId);
        if (!currentTrip) return;
        if (isDriverOnBreak(get().drivers, currentTrip.driverId)) {
            notify('warning', 'Break Active', 'End the current break before updating delivery status.');
            return;
        }
        const now = new Date().toISOString();

        if (status === 'delivered') {
            const hasPhoto = Boolean(details?.proofImage);
            const hasGeo =
                typeof details?.proofLat === 'number' &&
                typeof details?.proofLng === 'number' &&
                Boolean(details?.proofLocation?.trim());
            if (!hasPhoto || !hasGeo) {
                notify(
                    'warning',
                    'Delivery Proof Required',
                    'Upload delivery photo and enable location before marking delivered.'
                );
                return;
            }
        }

        const drop = currentTrip.drops.find(d => d.id === dropId);
        const newDrops = currentTrip.drops.map(d =>
            d.id === dropId
                ? {
                    ...d,
                    status,
                    actualArrival: now,
                    proofImage: details?.proofImage || d.proofImage,
                    proofCapturedAt: details?.proofCapturedAt || d.proofCapturedAt || now,
                    proofLat: typeof details?.proofLat === 'number' ? details.proofLat : d.proofLat,
                    proofLng: typeof details?.proofLng === 'number' ? details.proofLng : d.proofLng,
                    proofLocation: details?.proofLocation || d.proofLocation,
                    failureReason: details?.failureReason || d.failureReason,
                    notes: details?.notes || d.notes,
                }
                : d
        );

        const allDone = newDrops.every(d => d.status === 'delivered' || d.status === 'failed');
        const tripUpdates: Partial<Trip> = { drops: newDrops };

        // Optimistic update
        set((state) => ({
            trips: state.trips.map(t => t.id === tripId ? { ...t, ...tripUpdates } : t)
        }));

        if (status === 'delivered') {
            notify('success', 'Delivery Complete', `📦 ${drop?.customerName || 'Package'} marked as delivered.`);
        } else {
            notify('error', 'Delivery Failed', `❌ ${drop?.customerName || 'Package'} delivery failed.`);
        }

        if (allDone) {
            notify('info', 'Supervisor Review Required', `All stops for Trip #${tripId.toUpperCase()} are done. Supervisor must verify proofs before completion.`);
        }

        await request('/api/trips', {
            method: 'PATCH',
            body: JSON.stringify({ id: tripId, updates: tripUpdates })
        });

        const hasProofGeoForThisDrop =
            status === 'delivered' &&
            typeof details?.proofLat === 'number' &&
            typeof details?.proofLng === 'number' &&
            Boolean(details?.proofLocation?.trim());

        if (currentTrip.driverId && (allDone || hasProofGeoForThisDrop)) {
            const driverUpdates: Partial<Driver> = {
                lastActivityAt: now,
            };

            if (hasProofGeoForThisDrop) {
                driverUpdates.lastLocationUpdate = now;
                driverUpdates.currentLocation = {
                    lat: details!.proofLat as number,
                    lng: details!.proofLng as number,
                    address: details!.proofLocation as string,
                    updatedAt: details!.proofCapturedAt || now,
                };
                driverUpdates.lastDeliveryProof = {
                    tripId,
                    dropId,
                    capturedAt: details!.proofCapturedAt || now,
                    lat: details!.proofLat as number,
                    lng: details!.proofLng as number,
                    address: details!.proofLocation as string,
                    image: details!.proofImage,
                };
            }

            set((state) => ({
                drivers: state.drivers.map((driver) =>
                    driver.id === currentTrip.driverId ? { ...driver, ...driverUpdates } : driver
                ),
            }));

            try {
                await request('/api/drivers', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: currentTrip.driverId, updates: driverUpdates }),
                });
            } catch (error) {
                console.error('Driver drop persistence failed', error);
            }
        }

        if (currentTrip.vehicleId && hasProofGeoForThisDrop) {
            const location = {
                lat: details!.proofLat as number,
                lng: details!.proofLng as number,
            };

            set((state) => ({
                vehicles: state.vehicles.map((vehicle) =>
                    vehicle.id === currentTrip.vehicleId ? { ...vehicle, location } : vehicle
                ),
            }));

            try {
                await request('/api/vehicles', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        id: currentTrip.vehicleId,
                        updates: { location },
                    }),
                });
            } catch (error) {
                console.error('Vehicle drop-location persistence failed', error);
            }
        }
    },

    assignDriver: async (tripId, driverId, vehicleId) => {
        const state = get();
        const driver = state.drivers.find(d => d.id === driverId);
        const trip = state.trips.find(t => t.id === tripId);
        if (!driver || !trip) return;

        if (hasActiveTrip(state.trips, driverId)) {
            notify('error', 'Assignment Blocked', `${driver.name} already has an active trip.`);
            return;
        }

        if (driver.status !== 'available') {
            notify('error', 'Assignment Blocked', `${driver.name} is not available for assignment.`);
            return;
        }

        const updates = { driverId, vehicleId, status: 'assigned' as const };
        const driverUpdates: Partial<Driver> = {
            status: 'on-trip',
            currentVehicleId: vehicleId,
            isLive: true,
            lastLocationUpdate: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
            dutyStatus: driver.dutyStatus ?? 'on-duty',
            onBreak: false,
            breakStartedAt: undefined,
            breakType: undefined,
        };

        try {
            await Promise.all([
                request('/api/trips', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: tripId, updates }),
                }),
                request('/api/drivers', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        id: driverId,
                        updates: driverUpdates,
                    }),
                }),
                request('/api/vehicles', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: vehicleId, updates: { status: 'active' } }),
                }),
            ]);

            set((state) => ({
                trips: state.trips.map(t => t.id === tripId ? { ...t, ...updates } : t),
                vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, status: 'active' } : v),
                drivers: state.drivers.map(d => d.id === driverId ? { ...d, ...driverUpdates } : d)
            }));

            notify('success', 'Driver Assigned', `${driver?.name || 'Driver'} assigned to Trip #${tripId.toUpperCase()}`);
        } catch (error) {
            console.error('Assignment persistence failed', error);
            notify('error', 'Assignment Failed', error instanceof Error ? error.message : 'Unable to assign trip.');
        }
    },

    acceptTrip: async (tripId, startProof) => {
        const trip = get().trips.find((item) => item.id === tripId);
        if (!trip) return;
        if (isDriverOnBreak(get().drivers, trip.driverId)) {
            notify('warning', 'Break Active', 'End the current break before starting the trip.');
            return;
        }
        const hasValidStartProof = hasValidTripProof(startProof);
        if (!hasValidStartProof) {
            notify(
                'warning',
                'Start Proof Required',
                'Upload odometer/fuel reading photo and capture location before starting the trip.'
            );
            return;
        }
        const updates = {
            status: 'in-progress' as const,
            startTime: new Date().toISOString(),
            startLocation: trip.startLocation,
            startProof,
        };

        try {
            await request('/api/trips', {
                method: 'PATCH',
                body: JSON.stringify({ id: tripId, updates })
            });
        } catch (error) {
            console.error('Trip start persistence failed', error);
            notify('error', 'Trip Start Failed', error instanceof Error ? error.message : 'Unable to start trip.');
            return;
        }

        set((state) => ({
            trips: state.trips.map(t => t.id === tripId ? { ...t, ...updates } : t)
        }));

        notify('success', 'Trip Started', `Trip #${tripId.toUpperCase()} is now in progress.`);

        if (trip.driverId) {
            const driverUpdates: Partial<Driver> = {
                status: 'on-trip',
                dutyStatus: 'on-duty',
                lastActivityAt: new Date().toISOString(),
                lastLocationUpdate: new Date().toISOString(),
                onBreak: false,
                breakStartedAt: undefined,
                breakType: undefined,
            };
            set((state) => ({
                drivers: state.drivers.map((driver) =>
                    driver.id === trip.driverId ? { ...driver, ...driverUpdates } : driver
                ),
            }));
            try {
                await request('/api/drivers', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: trip.driverId, updates: driverUpdates }),
                });
            } catch (error) {
                console.error('Driver start-trip persistence failed', error);
            }
        }
    },

    verifyTripStartProof: async (tripId, supervisorId) => {
        const trip = get().trips.find((item) => item.id === tripId);
        if (!trip || !trip.startProof) return;

        const startProof = {
            ...trip.startProof,
            verifiedAt: new Date().toISOString(),
            verifiedBy: supervisorId,
        };
        const updates: Partial<Trip> = {
            startLocation: trip.startLocation,
            startProof,
        };

        set((state) => ({
            trips: state.trips.map((item) =>
                item.id === tripId ? { ...item, startProof } : item
            ),
        }));

        await request('/api/trips', {
            method: 'PATCH',
            body: JSON.stringify({ id: tripId, updates }),
        });

        notify('success', 'Start Proof Verified', `Trip #${tripId.toUpperCase()} start proof verified.`);
    },

    verifyTripEndProof: async (tripId, supervisorId) => {
        const trip = get().trips.find((item) => item.id === tripId);
        if (!trip || !trip.endProof) return;

        const endProof = {
            ...trip.endProof,
            verifiedAt: new Date().toISOString(),
            verifiedBy: supervisorId,
        };
        const updates: Partial<Trip> = {
            startLocation: trip.startLocation,
            endProof,
        };

        set((state) => ({
            trips: state.trips.map((item) =>
                item.id === tripId ? { ...item, endProof } : item
            ),
        }));

        await request('/api/trips', {
            method: 'PATCH',
            body: JSON.stringify({ id: tripId, updates }),
        });

        notify('success', 'End Proof Verified', `Trip #${tripId.toUpperCase()} end proof verified.`);
    },

    verifyDropReview: async (tripId, dropId, supervisorId) => {
        const trip = get().trips.find((item) => item.id === tripId);
        if (!trip) return;
        const now = new Date().toISOString();
        const drops = trip.drops.map((drop) => {
            if (drop.id !== dropId) return drop;
            return {
                ...drop,
                reviewedAt: now,
                reviewedBy: supervisorId,
                proofVerifiedAt: drop.status === 'delivered' ? now : drop.proofVerifiedAt,
                proofVerifiedBy: drop.status === 'delivered' ? supervisorId : drop.proofVerifiedBy,
            };
        });
        const updates: Partial<Trip> = { drops };

        set((state) => ({
            trips: state.trips.map((item) =>
                item.id === tripId ? { ...item, drops } : item
            ),
        }));

        await request('/api/trips', {
            method: 'PATCH',
            body: JSON.stringify({ id: tripId, updates }),
        });

        notify('success', 'Stop Reviewed', `Stop proof reviewed for Trip #${tripId.toUpperCase()}.`);
    },

    toggleLiveStatus: async (driverId, isLive) => {
        const forcedLive = true;
        set((state) => ({
            drivers: state.drivers.map(d => d.id === driverId ? { ...d, isLive: forcedLive } : d)
        }));

        notify('success',
            'Location Live',
            'Live tracking is always enabled for active fleet visibility.'
        );

        try {
            await request('/api/drivers', {
                method: 'PATCH',
                body: JSON.stringify({
                    id: driverId,
                    updates: { isLive: forcedLive, lastLocationUpdate: new Date().toISOString() },
                }),
            });
        } catch (error) {
            console.error('Live status persistence failed', error);
        }
    },

    triggerEmergency: async (driverId, tripId, details) => {
        const driver = get().drivers.find(d => d.id === driverId);
        if (driver?.onBreak) {
            notify('warning', 'Break Active', 'End the current break before performing other driver actions.');
            return;
        }
        const issueType = details?.issueType || 'vehicle issue';
        const etaText =
            typeof details?.etaMinutes === 'number' && details.etaMinutes > 0
                ? ` ETA: ~${details.etaMinutes} min.`
                : '';
        const detailText = details?.description?.trim() ? ` ${details.description.trim()}` : '';
        const newAlert: Alert = {
            id: `a-${Math.floor(Math.random() * 10000)}`,
            type: 'sos',
            severity: details?.severe ? 'critical' : 'high',
            message: `SOS from ${driver?.name || 'Unknown'}: ${issueType}.${detailText}${etaText}`,
            timestamp: new Date().toISOString(),
            vehicleId: driver?.currentVehicleId || '',
            tripId,
            resolved: false,
            metadata: {
                issueType,
                etaMinutes: details?.etaMinutes,
                informed: details?.informSupervisor ?? true,
            },
        };

        set((state) => ({
            alerts: [newAlert, ...state.alerts],
            drivers: state.drivers.map((item) =>
                item.id === driverId
                    ? {
                        ...item,
                        lastActivityAt: new Date().toISOString(),
                        lastLocationUpdate: new Date().toISOString(),
                    }
                    : item
            ),
        }));

        notify('error', 'SOS Triggered', `${driver?.name || 'Driver'} reported ${issueType}.`);

        // API call to broadcast emergency
        try {
            await request('/api/alerts', {
                method: 'POST',
                body: JSON.stringify(newAlert),
            });
            if (driverId) {
                await request('/api/drivers', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        id: driverId,
                        updates: {
                            lastActivityAt: new Date().toISOString(),
                            lastLocationUpdate: new Date().toISOString(),
                        },
                    }),
                });
            }
        } catch (error) {
            console.error('Emergency alert failed to persist', error);
        }
    },

    startDriverDay: async (driverId) => {
        const now = new Date().toISOString();
        const active = hasActiveTrip(get().trips, driverId);
        const updates: Partial<Driver> = {
            dutyStatus: 'on-duty',
            dayStartedAt: now,
            dayEndedAt: undefined,
            status: active ? 'on-trip' : 'available',
            onBreak: false,
            breakStartedAt: undefined,
            breakType: undefined,
            lastActivityAt: now,
            lastLocationUpdate: now,
            totalBreakMinutes: 0,
        };

        set((state) => ({
            drivers: state.drivers.map((driver) =>
                driver.id === driverId ? { ...driver, ...updates } : driver
            ),
        }));
        notify('success', 'Duty Started', 'Driver day has been started.');

        try {
            await request('/api/drivers', {
                method: 'PATCH',
                body: JSON.stringify({ id: driverId, updates }),
            });
        } catch (error) {
            console.error('Start day persistence failed', error);
        }
    },

    endDriverDay: async (driverId, endProof) => {
        const state = get();
        const driver = state.drivers.find((item) => item.id === driverId);
        if (!driver) return;

        const openTrips = state.trips.filter((trip) => trip.driverId === driverId && isOpenTrip(trip));
        const reviewReadyTrip = openTrips.find((trip) =>
            trip.status === 'in-progress' &&
            trip.drops.length > 0 &&
            trip.drops.every((drop) => drop.status === 'delivered' || drop.status === 'failed')
        );
        const hasBlockingOpenTrip = openTrips.some((trip) => trip.id !== reviewReadyTrip?.id);

        if (hasBlockingOpenTrip) {
            notify('warning', 'Trip Active', 'Finish the current trip before ending the day.');
            return;
        }

        if (reviewReadyTrip) {
            if (!hasValidTripProof(endProof)) {
                notify(
                    'warning',
                    'End Proof Required',
                    'Upload closing odometer/fuel photo and capture location before ending the day.'
                );
                return;
            }
        }

        const now = new Date().toISOString();
        const additionalBreak = calculateBreakMinutes(driver.breakStartedAt);
        const updates: Partial<Driver> = {
            dutyStatus: 'off-duty',
            dayEndedAt: now,
            status: 'off-duty',
            onBreak: false,
            breakStartedAt: undefined,
            breakType: undefined,
            totalBreakMinutes: (driver.totalBreakMinutes || 0) + additionalBreak,
            lastActivityAt: now,
            lastLocationUpdate: now,
        };

        try {
            if (reviewReadyTrip && endProof) {
                const tripUpdates: Partial<Trip> = {
                    startLocation: reviewReadyTrip.startLocation,
                    endProof,
                };

                await request('/api/trips', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: reviewReadyTrip.id, updates: tripUpdates }),
                });

                set((storeState) => ({
                    trips: storeState.trips.map((trip) =>
                        trip.id === reviewReadyTrip.id ? { ...trip, endProof } : trip
                    ),
                }));
            }

            await request('/api/drivers', {
                method: 'PATCH',
                body: JSON.stringify({ id: driverId, updates }),
            });

            set((storeState) => ({
                drivers: storeState.drivers.map((item) =>
                    item.id === driverId ? { ...item, ...updates } : item
                ),
            }));

            notify(
                'info',
                'Duty Ended',
                reviewReadyTrip
                    ? 'Driver day has been closed. Trip closing proof is ready for supervisor review.'
                    : 'Driver day has been closed.'
            );
        } catch (error) {
            console.error('End day persistence failed', error);
        }
    },

    startDriverBreak: async (driverId, informed = true) => {
        const state = get();
        const driver = state.drivers.find((item) => item.id === driverId);
        if (!driver) return;
        if (driver.onBreak) return;

        const now = new Date().toISOString();
        const updates: Partial<Driver> = {
            onBreak: true,
            breakStartedAt: now,
            breakType: informed ? 'informed' : 'uninformed',
            lastActivityAt: now,
            lastLocationUpdate: now,
        };

        set((storeState) => ({
            drivers: storeState.drivers.map((item) =>
                item.id === driverId ? { ...item, ...updates } : item
            ),
        }));

        notify(
            informed ? 'info' : 'warning',
            informed ? 'Break Started' : 'Uninformed Break Detected',
            informed
                ? 'Driver informed and started break.'
                : 'Vehicle inactive > 8 min without informed break.'
        );

        try {
            await request('/api/drivers', {
                method: 'PATCH',
                body: JSON.stringify({ id: driverId, updates }),
            });

            if (!informed) {
                const breakAlert: Alert = {
                    id: `a-${Math.floor(Math.random() * 10000)}`,
                    type: 'driver-break',
                    severity: 'medium',
                    message: `${driver.name} entered uninformed break (vehicle inactive > 8 min).`,
                    timestamp: now,
                    vehicleId: driver.currentVehicleId,
                    resolved: false,
                    metadata: { informed: false },
                };

                set((storeState) => ({
                    alerts: [breakAlert, ...storeState.alerts],
                }));

                await request('/api/alerts', {
                    method: 'POST',
                    body: JSON.stringify(breakAlert),
                });
            }
        } catch (error) {
            console.error('Break start persistence failed', error);
        }
    },

    endDriverBreak: async (driverId) => {
        const driver = get().drivers.find((item) => item.id === driverId);
        if (!driver || !driver.onBreak) return;

        const elapsedMinutes = calculateBreakMinutes(driver.breakStartedAt);
        const now = new Date().toISOString();
        const updates: Partial<Driver> = {
            onBreak: false,
            breakStartedAt: undefined,
            breakType: undefined,
            totalBreakMinutes: (driver.totalBreakMinutes || 0) + elapsedMinutes,
            lastActivityAt: now,
            lastLocationUpdate: now,
        };

        set((state) => ({
            drivers: state.drivers.map((item) =>
                item.id === driverId ? { ...item, ...updates } : item
            ),
        }));

        notify('success', 'Break Ended', `Break duration: ${elapsedMinutes} min.`);

        try {
            await request('/api/drivers', {
                method: 'PATCH',
                body: JSON.stringify({ id: driverId, updates }),
            });
        } catch (error) {
            console.error('Break end persistence failed', error);
        }
    },

    registerDriverActivity: async (driverId) => {
        const now = new Date().toISOString();
        const updates: Partial<Driver> = {
            lastActivityAt: now,
            lastLocationUpdate: now,
        };

        set((state) => ({
            drivers: state.drivers.map((item) =>
                item.id === driverId ? { ...item, ...updates } : item
            ),
        }));

        try {
            await request('/api/drivers', {
                method: 'PATCH',
                body: JSON.stringify({ id: driverId, updates }),
            });
        } catch (error) {
            console.error('Driver activity persistence failed', error);
        }
    },

    addFuelEntry: async (entry) => {
        if (isDriverOnBreak(get().drivers, entry.driverId)) {
            notify('warning', 'Break Active', 'End the current break before submitting fuel.');
            return;
        }
        const now = new Date().toISOString();
        set((state) => ({
            fuelEntries: [...state.fuelEntries, entry],
            drivers: state.drivers.map((driver) =>
                driver.id === entry.driverId
                    ? { ...driver, lastActivityAt: now, lastLocationUpdate: now }
                    : driver
            ),
        }));
        notify('info', 'Fuel Entry Logged', `₹${entry.cost.toLocaleString()} fuel entry submitted for review.`);

        try {
            await Promise.all([
                request('/api/fuel', {
                    method: 'POST',
                    body: JSON.stringify(entry),
                }),
                request('/api/drivers', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        id: entry.driverId,
                        updates: { lastActivityAt: now, lastLocationUpdate: now },
                    }),
                }),
            ]);
        } catch (error) {
            console.error('Fuel entry persistence failed', error);
        }
    },

    verifyFuelEntry: async (entryId, supervisorId) => {
        set((state) => ({
            fuelEntries: state.fuelEntries.map(e => e.id === entryId ? { ...e, status: 'verified', verifiedBy: supervisorId } : e)
        }));
        notify('success', 'Fuel Verified', `Fuel entry #${entryId} has been verified.`);

        try {
            await request('/api/fuel', {
                method: 'PATCH',
                body: JSON.stringify({
                    id: entryId,
                    updates: { status: 'verified', verifiedBy: supervisorId },
                }),
            });
        } catch (error) {
            console.error('Fuel verify persistence failed', error);
        }
    },

    rejectFuelEntry: async (entryId, supervisorId) => {
        set((state) => ({
            fuelEntries: state.fuelEntries.map(e => e.id === entryId ? { ...e, status: 'rejected', verifiedBy: supervisorId } : e)
        }));
        notify('warning', 'Fuel Rejected', `Fuel entry #${entryId} has been rejected.`);

        try {
            await request('/api/fuel', {
                method: 'PATCH',
                body: JSON.stringify({
                    id: entryId,
                    updates: { status: 'rejected', verifiedBy: supervisorId },
                }),
            });
        } catch (error) {
            console.error('Fuel reject persistence failed', error);
        }
    },

    approveFuelEntry: async (entryId, managerId) => {
        set((state) => ({
            fuelEntries: state.fuelEntries.map(e => e.id === entryId ? { ...e, status: 'approved', approvedBy: managerId } : e)
        }));
        notify('success', 'Fuel Approved', `Fuel entry #${entryId} has been approved by manager.`);

        try {
            await request('/api/fuel', {
                method: 'PATCH',
                body: JSON.stringify({
                    id: entryId,
                    updates: { status: 'approved', approvedBy: managerId },
                }),
            });
        } catch (error) {
            console.error('Fuel approve persistence failed', error);
        }
    },

    updateVehicleLocation: async (vehicleId, location) => {
        set((state) => ({
            vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, location } : v)
        }));

        try {
            await request('/api/vehicles', {
                method: 'PATCH',
                body: JSON.stringify({ id: vehicleId, updates: { location } }),
            });
        } catch (error) {
            console.error('Vehicle location persistence failed', error);
        }
    },

    resolveAlert: async (alertId) => {
        set((state) => ({
            alerts: state.alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a)
        }));
        notify('success', 'Alert Resolved', 'The alert has been marked as resolved.');

        try {
            await request('/api/alerts', {
                method: 'PATCH',
                body: JSON.stringify({ id: alertId, updates: { resolved: true } }),
            });
        } catch (error) {
            console.error('Alert resolve persistence failed', error);
        }
    }
}));
