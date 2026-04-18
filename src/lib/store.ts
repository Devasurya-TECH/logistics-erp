import { create } from 'zustand';
import { Trip, Vehicle, Driver, FuelEntry, Alert } from './types';
import { useNotifications } from './notifications';

interface AppState {
    trips: Trip[];
    vehicles: Vehicle[];
    drivers: Driver[];
    fuelEntries: FuelEntry[];
    alerts: Alert[];
    isLoading: boolean;

    // Actions
    fetchInitialData: () => Promise<void>;
    addTrip: (trip: Trip) => Promise<void>;
    updateTripStatus: (tripId: string, status: Trip['status']) => Promise<void>;
    updateDropStatus: (
        tripId: string,
        dropId: string,
        status: 'delivered' | 'failed',
        details?: { proofImage?: string; failureReason?: string; notes?: string }
    ) => Promise<void>;

    // Other actions remain local for now or can be hooked up similarly
    assignDriver: (tripId: string, driverId: string, vehicleId: string) => Promise<void>;
    acceptTrip: (tripId: string) => Promise<void>;
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
    endDriverDay: (driverId: string) => Promise<void>;
    startDriverBreak: (driverId: string, informed?: boolean) => Promise<void>;
    endDriverBreak: (driverId: string) => Promise<void>;
    registerDriverActivity: (driverId: string) => Promise<void>;
    addFuelEntry: (entry: FuelEntry) => Promise<void>;
    verifyFuelEntry: (entryId: string, supervisorId: string) => Promise<void>;
    rejectFuelEntry: (entryId: string, supervisorId: string) => Promise<void>;
    approveFuelEntry: (entryId: string, managerId: string) => Promise<void>;
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
        ...init,
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${url}`);
    }
};

const hasActiveTrip = (trips: Trip[], driverId: string) =>
    trips.some(
        (trip) =>
            trip.driverId === driverId &&
            (trip.status === 'assigned' || trip.status === 'in-progress')
    );

const calculateBreakMinutes = (startedAt?: string) => {
    if (!startedAt) return 0;
    const diffMs = Date.now() - new Date(startedAt).getTime();
    return Math.max(0, Math.round(diffMs / 60000));
};

export const useStore = create<AppState>((set, get) => ({
    trips: [],
    vehicles: [],
    drivers: [],
    fuelEntries: [],
    alerts: [],
    isLoading: true,

    fetchInitialData: async () => {
        try {
            // Fetch trips
            const tripsRes = await fetch('/api/trips');
            const trips = await tripsRes.json();

            // Fetch master data
            const masterRes = await fetch('/api/master-data');
            const masterData = await masterRes.json();

            set({
                trips,
                drivers: (masterData.drivers || []).map((driver: Driver) => ({
                    ...driver,
                    isLive: true,
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
            notify('error', 'Connection Error', 'Failed to load fleet data. Retrying...');
        }
    },

    addTrip: async (trip) => {
        // Optimistic update
        set((state) => ({ trips: [...state.trips, trip] }));
        notify('success', 'Trip Created', `Trip #${trip.id.toUpperCase()} has been created successfully.`);
        // API call
        await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trip)
        });
    },

    updateTripStatus: async (tripId, status) => {
        const trip = get().trips.find((item) => item.id === tripId);
        if (!trip) return;

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

        await fetch('/api/trips', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tripId, updates: tripUpdates })
        });

        if (trip.driverId && (status === 'completed' || status === 'cancelled')) {
            const driverUpdates: Partial<Driver> = {
                status: 'available',
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

        const drop = currentTrip.drops.find(d => d.id === dropId);
        const newDrops = currentTrip.drops.map(d =>
            d.id === dropId
                ? {
                    ...d,
                    status,
                    actualArrival: new Date().toISOString(),
                    proofImage: details?.proofImage || d.proofImage,
                    failureReason: details?.failureReason || d.failureReason,
                    notes: details?.notes || d.notes,
                }
                : d
        );

        // Check if all drops are done → auto-complete trip
        const allDone = newDrops.every(d => d.status === 'delivered' || d.status === 'failed');
        const tripUpdates: Partial<Trip> = { drops: newDrops };
        if (allDone) {
            tripUpdates.status = 'completed';
            tripUpdates.endTime = new Date().toISOString();
        }

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
            notify('info', 'Trip Complete', `All deliveries for Trip #${tripId.toUpperCase()} are done!`);
        }

        await fetch('/api/trips', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tripId, updates: tripUpdates })
        });

        if (allDone && currentTrip.driverId) {
            const driverUpdates: Partial<Driver> = {
                status: 'available',
                currentVehicleId: undefined,
                onBreak: false,
                breakStartedAt: undefined,
                breakType: undefined,
                lastActivityAt: new Date().toISOString(),
            };

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
                console.error('Driver completion persistence failed', error);
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

        // Optimistic update
        set((state) => ({
            trips: state.trips.map(t => t.id === tripId ? { ...t, ...updates } : t),
            vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, status: 'active' } : v),
            drivers: state.drivers.map(d => d.id === driverId ? { ...d, ...driverUpdates } : d)
        }));

        notify('success', 'Driver Assigned', `${driver?.name || 'Driver'} assigned to Trip #${tripId.toUpperCase()}`);

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
        } catch (error) {
            console.error('Assignment persistence failed', error);
        }
    },

    acceptTrip: async (tripId) => {
        const trip = get().trips.find((item) => item.id === tripId);
        if (!trip) return;
        const updates = {
            status: 'in-progress' as const,
            startTime: new Date().toISOString()
        };

        // Optimistic update
        set((state) => ({
            trips: state.trips.map(t => t.id === tripId ? { ...t, ...updates } : t)
        }));

        notify('success', 'Trip Started', `Trip #${tripId.toUpperCase()} is now in progress.`);

        await fetch('/api/trips', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tripId, updates })
        });

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

    endDriverDay: async (driverId) => {
        const state = get();
        const driver = state.drivers.find((item) => item.id === driverId);
        if (!driver) return;

        if (hasActiveTrip(state.trips, driverId)) {
            notify('warning', 'Trip Active', 'Complete the active trip before ending the day.');
            return;
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

        set((state) => ({
            drivers: state.drivers.map((item) =>
                item.id === driverId ? { ...item, ...updates } : item
            ),
        }));
        notify('info', 'Duty Ended', 'Driver day has been closed.');

        try {
            await request('/api/drivers', {
                method: 'PATCH',
                body: JSON.stringify({ id: driverId, updates }),
            });
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
