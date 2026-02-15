export type UserRole = 'manager' | 'supervisor' | 'driver';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

export interface Vehicle {
    id: string;
    plateNumber: string;
    model: string;
    status: 'active' | 'maintenance' | 'out-of-service';
    fuelLevel: number; // percentage
    mileage: number;
    location: { lat: number; lng: number };
    lastServiceDate: string;
}

export interface Driver extends User {
    licenseNumber: string;
    status: 'available' | 'on-trip' | 'off-duty';
    currentVehicleId?: string;
}

export type TripStatus = 'planned' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';

export interface DropPoint {
    id: string; // Internal Stop ID
    orderId?: string; // Client Order ID
    address: string;
    lat: number;
    lng: number;
    customerName: string;
    status: 'pending' | 'delivered' | 'failed' | 'skipped';
    priority?: 'high' | 'medium' | 'low';
    deadline?: string;
    estimatedArrival?: string;
    actualArrival?: string;
    distanceFromPrev?: number; // km
}

export interface Trip {
    id: string;
    vehicleId?: string;
    driverId?: string;
    supervisorId?: string;
    status: TripStatus;
    startLocation: { lat: number; lng: number; address: string };
    drops: DropPoint[];
    startTime?: string;
    endTime?: string;
    estimatedDistance: number; // km
    actualDistance?: number;
}

export type FuelStatus = 'pending' | 'verified' | 'approved' | 'rejected';

export interface FuelEntry {
    id: string;
    tripId: string;
    driverId: string;
    vehicleId: string;
    amount: number; // liters/gallons
    cost: number;
    currency: string;
    odometer: number;
    location: string;
    timestamp: string;
    receiptImage?: string;
    status: FuelStatus;
    verifiedBy?: string; // Supervisor
    approvedBy?: string; // Manager
}

export interface Expense {
    id: string;
    tripId: string;
    driverId: string;
    category: 'toll' | 'maintenance' | 'food' | 'other';
    amount: number;
    currency: string;
    description: string;
    receiptImage?: string;
    status: 'pending' | 'approved' | 'rejected';
    timestamp: string;
}

export interface Alert {
    id: string;
    type: 'geofence' | 'maintenance' | 'fuel-theft' | 'delay';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    vehicleId?: string;
    tripId?: string;
    resolved: boolean;
}
