import { create } from 'zustand';
import { Trip, Vehicle, Driver, FuelEntry, Alert } from './types';
// No persistent import here if we are fetching fresh every time, but local state management is still useful.
// We will switch to fetching from API on mount.

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
    assignDriver: (tripId: string, driverId: string, vehicleId: string) => void;
    addFuelEntry: (entry: FuelEntry) => void;
    verifyFuelEntry: (entryId: string, supervisorId: string) => void;
    approveFuelEntry: (entryId: string, managerId: string) => void;
    updateVehicleLocation: (vehicleId: string, location: { lat: number; lng: number }) => void;
    resolveAlert: (alertId: string) => void;
}

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
                // We're lazy loading users for now, relying on them for drivers
                isLoading: false
            });
        } catch (error) {
            console.error("Failed to load data", error);
        }
    },

    addTrip: async (trip) => {
        // Optimistic update
        set((state) => ({ trips: [...state.trips, trip] }));
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

        await fetch('/api/trips', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tripId, updates: { status } })
        });
    },

    updateDropStatus: async (tripId, dropId, status) => {
        const currentTrip = get().trips.find(t => t.id === tripId);
        if (!currentTrip) return;

        const newDrops = currentTrip.drops.map(d =>
            d.id === dropId ? { ...d, status, actualArrival: new Date().toISOString() } : d
        );

        // Optimistic update
        set((state) => ({
            trips: state.trips.map(t => t.id === tripId ? { ...t, drops: newDrops } : t)
        }));

        await fetch('/api/trips', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tripId, updates: { drops: newDrops } })
        });
    },

    // --- Actions NOT yet hooked to API (still local/mock for now) ---
    assignDriver: (tripId, driverId, vehicleId) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, driverId, vehicleId, status: 'assigned' } : t),
        vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, status: 'active' } : v),
        drivers: state.drivers.map(d => d.id === driverId ? { ...d, status: 'on-trip', currentVehicleId: vehicleId } : d)
    })),

    addFuelEntry: (entry) => set((state) => ({ fuelEntries: [...state.fuelEntries, entry] })),

    verifyFuelEntry: (entryId, supervisorId) => set((state) => ({
        fuelEntries: state.fuelEntries.map(e => e.id === entryId ? { ...e, status: 'verified', verifiedBy: supervisorId } : e)
    })),

    approveFuelEntry: (entryId, managerId) => set((state) => ({
        fuelEntries: state.fuelEntries.map(e => e.id === entryId ? { ...e, status: 'approved', approvedBy: managerId } : e)
    })),

    updateVehicleLocation: (vehicleId, location) => set((state) => ({
        vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, location } : v)
    })),

    resolveAlert: (alertId) => set((state) => ({
        alerts: state.alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a)
    }))
}));
