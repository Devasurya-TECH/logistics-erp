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
    updateDropStatus: (tripId: string, dropId: string, status: 'delivered' | 'failed') => Promise<void>;

    // Other actions remain local for now or can be hooked up similarly
    assignDriver: (tripId: string, driverId: string, vehicleId: string) => Promise<void>;
    acceptTrip: (tripId: string) => Promise<void>;
    toggleLiveStatus: (driverId: string, isLive: boolean) => Promise<void>;
    triggerEmergency: (driverId: string, tripId?: string) => Promise<void>;
    addFuelEntry: (entry: FuelEntry) => void;
    verifyFuelEntry: (entryId: string, supervisorId: string) => void;
    rejectFuelEntry: (entryId: string, supervisorId: string) => void;
    approveFuelEntry: (entryId: string, managerId: string) => void;
    updateVehicleLocation: (vehicleId: string, location: { lat: number; lng: number }) => void;
    resolveAlert: (alertId: string) => void;
}

// Helper to safely send notifications (doesn't break if notification store isn't ready)
const notify = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    try {
        useNotifications.getState().addNotification(type, title, message);
    } catch { /* silent if store not ready */ }
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
                drivers: masterData.drivers,
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
        // Optimistic update
        set((state) => ({
            trips: state.trips.map(t => t.id === tripId ? { ...t, status } : t)
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
            body: JSON.stringify({ id: tripId, updates: { status } })
        });
    },

    updateDropStatus: async (tripId, dropId, status) => {
        const currentTrip = get().trips.find(t => t.id === tripId);
        if (!currentTrip) return;

        const drop = currentTrip.drops.find(d => d.id === dropId);
        const newDrops = currentTrip.drops.map(d =>
            d.id === dropId ? { ...d, status, actualArrival: new Date().toISOString() } : d
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
    },

    assignDriver: async (tripId, driverId, vehicleId) => {
        const driver = get().drivers.find(d => d.id === driverId);
        const updates = { driverId, vehicleId, status: 'assigned' as const };

        // Optimistic update
        set((state) => ({
            trips: state.trips.map(t => t.id === tripId ? { ...t, ...updates } : t),
            vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, status: 'active' } : v),
            drivers: state.drivers.map(d => d.id === driverId ? { ...d, status: 'on-trip', currentVehicleId: vehicleId } : d)
        }));

        notify('success', 'Driver Assigned', `${driver?.name || 'Driver'} assigned to Trip #${tripId.toUpperCase()}`);

        await fetch('/api/trips', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tripId, updates })
        });
    },

    acceptTrip: async (tripId) => {
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
    },

    toggleLiveStatus: async (driverId, isLive) => {
        set((state) => ({
            drivers: state.drivers.map(d => d.id === driverId ? { ...d, isLive } : d)
        }));

        notify(isLive ? 'success' : 'info',
            isLive ? 'Location Live' : 'Location Hidden',
            isLive ? 'Supervisors can now track your route.' : 'Live tracking has been disabled.'
        );

        // API call would go here to sync live status
    },

    triggerEmergency: async (driverId, tripId) => {
        const driver = get().drivers.find(d => d.id === driverId);
        const newAlert: Alert = {
            id: `a-${Math.floor(Math.random() * 10000)}`,
            type: 'fuel-theft', // Reusing type or extending
            severity: 'critical',
            message: `EMERGENCY SOS: Driver ${driver?.name || 'Unknown'} triggered a panic alert!`,
            timestamp: new Date().toISOString(),
            vehicleId: driver?.currentVehicleId || '',
            tripId,
            resolved: false
        };

        set((state) => ({
            alerts: [newAlert, ...state.alerts]
        }));

        notify('error', 'SOS TRIGGERED', 'Emergency services and supervisors have been notified.');

        // API call to broadcast emergency
        await fetch('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAlert)
        });
    },

    addFuelEntry: (entry) => {
        set((state) => ({ fuelEntries: [...state.fuelEntries, entry] }));
        notify('info', 'Fuel Entry Logged', `₹${entry.cost.toLocaleString()} fuel entry submitted for review.`);
    },

    verifyFuelEntry: (entryId, supervisorId) => {
        set((state) => ({
            fuelEntries: state.fuelEntries.map(e => e.id === entryId ? { ...e, status: 'verified', verifiedBy: supervisorId } : e)
        }));
        notify('success', 'Fuel Verified', `Fuel entry #${entryId} has been verified.`);
    },

    rejectFuelEntry: (entryId, supervisorId) => {
        set((state) => ({
            fuelEntries: state.fuelEntries.map(e => e.id === entryId ? { ...e, status: 'rejected', verifiedBy: supervisorId } : e)
        }));
        notify('warning', 'Fuel Rejected', `Fuel entry #${entryId} has been rejected.`);
    },

    approveFuelEntry: (entryId, managerId) => {
        set((state) => ({
            fuelEntries: state.fuelEntries.map(e => e.id === entryId ? { ...e, status: 'approved', approvedBy: managerId } : e)
        }));
        notify('success', 'Fuel Approved', `Fuel entry #${entryId} has been approved by manager.`);
    },

    updateVehicleLocation: (vehicleId, location) => set((state) => ({
        vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, location } : v)
    })),

    resolveAlert: (alertId) => {
        set((state) => ({
            alerts: state.alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a)
        }));
        notify('success', 'Alert Resolved', 'The alert has been marked as resolved.');
    }
}));
