import { create } from "zustand";
import type { Alert, Driver, FuelEntry, Trip, Vehicle } from "./types";
import { useNotifications } from "./notifications";

interface AppState {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  fuelEntries: FuelEntry[];
  alerts: Alert[];
  isLoading: boolean;

  fetchInitialData: () => Promise<void>;
  addTrip: (trip: Trip) => Promise<void>;
  updateTripStatus: (tripId: string, status: Trip["status"]) => Promise<void>;
  updateDropStatus: (tripId: string, dropId: string, status: "delivered" | "failed") => Promise<void>;
  assignDriver: (tripId: string, driverId: string, vehicleId: string) => Promise<void>;
  acceptTrip: (tripId: string) => Promise<void>;
  toggleLiveStatus: (driverId: string, isLive: boolean) => Promise<void>;
  triggerEmergency: (driverId: string, tripId?: string) => Promise<void>;
  addFuelEntry: (entry: FuelEntry) => Promise<void>;
  verifyFuelEntry: (entryId: string, supervisorId: string) => Promise<void>;
  rejectFuelEntry: (entryId: string, reviewerId: string) => Promise<void>;
  approveFuelEntry: (entryId: string, managerId: string) => Promise<void>;
  updateVehicleLocation: (vehicleId: string, location: { lat: number; lng: number }) => Promise<void>;
  updateVehicleStatus: (vehicleId: string, status: Vehicle["status"]) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
}

const notify = (
  type: "success" | "error" | "warning" | "info",
  title: string,
  message: string,
) => {
  try {
    useNotifications.getState().addNotification(type, title, message);
  } catch {
    // no-op
  }
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
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
      const [trips, masterData] = await Promise.all([
        requestJson<Trip[]>("/api/trips"),
        requestJson<{
          drivers: Driver[];
          vehicles: Vehicle[];
          fuelEntries: FuelEntry[];
          alerts: Alert[];
        }>("/api/master-data"),
      ]);

      set({
        trips,
        drivers: masterData.drivers ?? [],
        vehicles: masterData.vehicles ?? [],
        fuelEntries: masterData.fuelEntries ?? [],
        alerts: masterData.alerts ?? [],
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error("Failed to load initial data", error);
      notify("error", "Connection Error", "Could not load logistics data.");
    }
  },

  addTrip: async (trip) => {
    const previous = get().trips;
    set((state) => ({ trips: [...state.trips, trip] }));
    notify("success", "Trip Created", `Trip #${trip.id.toUpperCase()} has been added.`);

    try {
      await requestJson<Trip>("/api/trips", {
        method: "POST",
        body: JSON.stringify(trip),
      });
    } catch (error) {
      console.error("Trip creation failed", error);
      set({ trips: previous });
      notify("error", "Trip Failed", "Trip creation failed. Please retry.");
    }
  },

  updateTripStatus: async (tripId, status) => {
    const previous = get().trips;
    set((state) => ({
      trips: state.trips.map((trip) => (trip.id === tripId ? { ...trip, status } : trip)),
    }));

    try {
      await requestJson<Trip>("/api/trips", {
        method: "PATCH",
        body: JSON.stringify({ id: tripId, updates: { status } }),
      });
      notify("info", "Trip Updated", `Trip #${tripId.toUpperCase()} marked ${status}.`);
    } catch (error) {
      console.error("Trip status update failed", error);
      set({ trips: previous });
      notify("error", "Update Failed", "Could not update trip status.");
    }
  },

  updateDropStatus: async (tripId, dropId, status) => {
    const originalTrips = get().trips;
    const trip = originalTrips.find((item) => item.id === tripId);
    if (!trip) return;

    const updatedDrops = trip.drops.map((drop) =>
      drop.id === dropId ? { ...drop, status, actualArrival: new Date().toISOString() } : drop,
    );

    const allDone = updatedDrops.every(
      (drop) => drop.status === "delivered" || drop.status === "failed",
    );

    const updates: Partial<Trip> = {
      drops: updatedDrops,
      ...(allDone
        ? {
            status: "completed",
            endTime: new Date().toISOString(),
          }
        : {}),
    };

    set((state) => ({
      trips: state.trips.map((item) =>
        item.id === tripId ? { ...item, ...updates } : item,
      ),
    }));

    try {
      await requestJson<Trip>("/api/trips", {
        method: "PATCH",
        body: JSON.stringify({ id: tripId, updates }),
      });
      notify(
        status === "delivered" ? "success" : "warning",
        "Delivery Updated",
        status === "delivered" ? "Drop marked delivered." : "Drop marked failed.",
      );
    } catch (error) {
      console.error("Drop status update failed", error);
      set({ trips: originalTrips });
      notify("error", "Delivery Update Failed", "Could not persist delivery update.");
    }
  },

  assignDriver: async (tripId, driverId, vehicleId) => {
    const snapshot = {
      trips: get().trips,
      drivers: get().drivers,
      vehicles: get().vehicles,
    };

    const updates = { driverId, vehicleId, status: "assigned" as const };

    set((state) => ({
      trips: state.trips.map((trip) => (trip.id === tripId ? { ...trip, ...updates } : trip)),
      drivers: state.drivers.map((driver) =>
        driver.id === driverId
          ? {
              ...driver,
              status: "on-trip",
              currentVehicleId: vehicleId,
            }
          : driver,
      ),
      vehicles: state.vehicles.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, status: "active" } : vehicle,
      ),
    }));

    try {
      await Promise.all([
        requestJson<Trip>("/api/trips", {
          method: "PATCH",
          body: JSON.stringify({ id: tripId, updates }),
        }),
        requestJson<Driver>("/api/drivers", {
          method: "PATCH",
          body: JSON.stringify({
            id: driverId,
            updates: { status: "on-trip", currentVehicleId: vehicleId },
          }),
        }),
        requestJson<Vehicle>("/api/vehicles", {
          method: "PATCH",
          body: JSON.stringify({ id: vehicleId, updates: { status: "active" } }),
        }),
      ]);
      notify("success", "Assignment Complete", "Driver and vehicle assigned successfully.");
    } catch (error) {
      console.error("Driver assignment failed", error);
      set(snapshot);
      notify("error", "Assignment Failed", "Could not assign driver to trip.");
    }
  },

  acceptTrip: async (tripId) => {
    const previous = get().trips;
    const updates = {
      status: "in-progress" as const,
      startTime: new Date().toISOString(),
    };

    set((state) => ({
      trips: state.trips.map((trip) => (trip.id === tripId ? { ...trip, ...updates } : trip)),
    }));

    try {
      await requestJson<Trip>("/api/trips", {
        method: "PATCH",
        body: JSON.stringify({ id: tripId, updates }),
      });
      notify("success", "Trip Started", `Trip #${tripId.toUpperCase()} is now active.`);
    } catch (error) {
      console.error("Trip accept failed", error);
      set({ trips: previous });
      notify("error", "Start Failed", "Unable to start the trip.");
    }
  },

  toggleLiveStatus: async (driverId, isLive) => {
    const previous = get().drivers;
    set((state) => ({
      drivers: state.drivers.map((driver) =>
        driver.id === driverId
          ? { ...driver, isLive, lastLocationUpdate: new Date().toISOString() }
          : driver,
      ),
    }));

    try {
      await requestJson<Driver>("/api/drivers", {
        method: "PATCH",
        body: JSON.stringify({
          id: driverId,
          updates: { isLive, lastLocationUpdate: new Date().toISOString() },
        }),
      });
      notify(
        isLive ? "success" : "info",
        isLive ? "Live Enabled" : "Live Disabled",
        isLive ? "Supervisors can view your movement." : "Location sharing turned off.",
      );
    } catch (error) {
      console.error("Live status update failed", error);
      set({ drivers: previous });
      notify("error", "Update Failed", "Could not change live tracking status.");
    }
  },

  triggerEmergency: async (driverId, tripId) => {
    const driver = get().drivers.find((item) => item.id === driverId);
    const newAlert: Alert = {
      id: `a-${Date.now()}`,
      type: "fuel-theft",
      severity: "critical",
      message: `EMERGENCY SOS from ${driver?.name ?? "Unknown Driver"}`,
      timestamp: new Date().toISOString(),
      vehicleId: driver?.currentVehicleId,
      tripId,
      resolved: false,
    };

    set((state) => ({ alerts: [newAlert, ...state.alerts] }));

    try {
      await requestJson<Alert>("/api/alerts", {
        method: "POST",
        body: JSON.stringify(newAlert),
      });
      notify("error", "SOS Triggered", "Emergency alert broadcast to supervisor panel.");
    } catch (error) {
      console.error("SOS alert failed", error);
      set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== newAlert.id) }));
      notify("error", "SOS Failed", "Emergency alert could not be delivered.");
    }
  },

  addFuelEntry: async (entry) => {
    const previous = get().fuelEntries;
    set((state) => ({ fuelEntries: [...state.fuelEntries, entry] }));

    try {
      await requestJson<FuelEntry>("/api/fuel", {
        method: "POST",
        body: JSON.stringify(entry),
      });
      notify("info", "Fuel Logged", `Fuel entry #${entry.id.toUpperCase()} submitted.`);
    } catch (error) {
      console.error("Fuel entry create failed", error);
      set({ fuelEntries: previous });
      notify("error", "Fuel Log Failed", "Could not submit fuel entry.");
    }
  },

  verifyFuelEntry: async (entryId, supervisorId) => {
    const previous = get().fuelEntries;
    set((state) => ({
      fuelEntries: state.fuelEntries.map((entry) =>
        entry.id === entryId
          ? { ...entry, status: "verified", verifiedBy: supervisorId }
          : entry,
      ),
    }));

    try {
      await requestJson<FuelEntry>("/api/fuel", {
        method: "PATCH",
        body: JSON.stringify({
          id: entryId,
          updates: { status: "verified", verifiedBy: supervisorId },
        }),
      });
      notify("success", "Fuel Verified", `Entry #${entryId.toUpperCase()} verified.`);
    } catch (error) {
      console.error("Fuel verify failed", error);
      set({ fuelEntries: previous });
      notify("error", "Verification Failed", "Could not verify fuel entry.");
    }
  },

  rejectFuelEntry: async (entryId, reviewerId) => {
    const previous = get().fuelEntries;
    set((state) => ({
      fuelEntries: state.fuelEntries.map((entry) =>
        entry.id === entryId
          ? { ...entry, status: "rejected", verifiedBy: reviewerId }
          : entry,
      ),
    }));

    try {
      await requestJson<FuelEntry>("/api/fuel", {
        method: "PATCH",
        body: JSON.stringify({
          id: entryId,
          updates: { status: "rejected", verifiedBy: reviewerId },
        }),
      });
      notify("warning", "Fuel Rejected", `Entry #${entryId.toUpperCase()} rejected.`);
    } catch (error) {
      console.error("Fuel reject failed", error);
      set({ fuelEntries: previous });
      notify("error", "Rejection Failed", "Could not reject fuel entry.");
    }
  },

  approveFuelEntry: async (entryId, managerId) => {
    const previous = get().fuelEntries;
    set((state) => ({
      fuelEntries: state.fuelEntries.map((entry) =>
        entry.id === entryId
          ? { ...entry, status: "approved", approvedBy: managerId }
          : entry,
      ),
    }));

    try {
      await requestJson<FuelEntry>("/api/fuel", {
        method: "PATCH",
        body: JSON.stringify({
          id: entryId,
          updates: { status: "approved", approvedBy: managerId },
        }),
      });
      notify("success", "Fuel Approved", `Entry #${entryId.toUpperCase()} approved.`);
    } catch (error) {
      console.error("Fuel approve failed", error);
      set({ fuelEntries: previous });
      notify("error", "Approval Failed", "Could not approve fuel entry.");
    }
  },

  updateVehicleLocation: async (vehicleId, location) => {
    const previous = get().vehicles;
    set((state) => ({
      vehicles: state.vehicles.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, location } : vehicle,
      ),
    }));

    try {
      await requestJson<Vehicle>("/api/vehicles", {
        method: "PATCH",
        body: JSON.stringify({ id: vehicleId, updates: { location } }),
      });
    } catch (error) {
      console.error("Vehicle location update failed", error);
      set({ vehicles: previous });
      notify("error", "Tracking Error", "Could not update vehicle location.");
    }
  },

  updateVehicleStatus: async (vehicleId, status) => {
    const previous = get().vehicles;
    set((state) => ({
      vehicles: state.vehicles.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, status } : vehicle,
      ),
    }));

    try {
      await requestJson<Vehicle>("/api/vehicles", {
        method: "PATCH",
        body: JSON.stringify({ id: vehicleId, updates: { status } }),
      });
      notify("info", "Vehicle Updated", `Vehicle status changed to ${status}.`);
    } catch (error) {
      console.error("Vehicle status update failed", error);
      set({ vehicles: previous });
      notify("error", "Status Update Failed", "Could not change vehicle status.");
    }
  },

  resolveAlert: async (alertId) => {
    const previous = get().alerts;
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === alertId ? { ...alert, resolved: true } : alert,
      ),
    }));

    try {
      await requestJson<Alert>("/api/alerts", {
        method: "PATCH",
        body: JSON.stringify({ id: alertId, updates: { resolved: true } }),
      });
      notify("success", "Alert Resolved", "Alert marked as resolved.");
    } catch (error) {
      console.error("Alert resolve failed", error);
      set({ alerts: previous });
      notify("error", "Resolve Failed", "Could not resolve alert.");
    }
  },
}));
