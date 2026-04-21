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
    fuelType?: 'diesel' | 'petrol' | 'ev' | 'cng';
}

export interface Driver extends User {
    licenseNumber: string;
    status: 'available' | 'on-trip' | 'off-duty';
    currentVehicleId?: string;
    isLive?: boolean;
    lastLocationUpdate?: string;
    dutyStatus?: 'on-duty' | 'off-duty';
    dayStartedAt?: string;
    dayEndedAt?: string;
    onBreak?: boolean;
    breakStartedAt?: string;
    breakType?: 'informed' | 'uninformed';
    totalBreakMinutes?: number;
    lastActivityAt?: string;
    currentLocation?: {
        lat: number;
        lng: number;
        address?: string;
        updatedAt?: string;
    };
    dayStartProof?: TripCheckpointProof;
    dayEndProof?: TripCheckpointProof;
    lastDeliveryProof?: {
        tripId: string;
        dropId: string;
        capturedAt: string;
        lat: number;
        lng: number;
        address: string;
        image?: string;
        imagePath?: string;
    };
}

export type TripStatus = 'planned' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';

export interface TripCheckpointProof {
    odometer: number;
    fuelReading: number;
    image?: string;
    imagePath?: string;
    capturedAt: string;
    lat: number;
    lng: number;
    location: string;
    verifiedAt?: string;
    verifiedBy?: string;
}

export type TripStartProof = TripCheckpointProof;
export type TripEndProof = TripCheckpointProof;

export interface DropPoint {
    id: string; // Internal Stop ID
    orderId?: string; // Client Order ID
    address: string;
    lat: number;
    lng: number;
    customerName: string;
    customerPhone?: string;
    status: 'pending' | 'delivered' | 'failed' | 'skipped';
    priority?: 'high' | 'medium' | 'low';
    deadline?: string;
    estimatedArrival?: string;
    actualArrival?: string;
    distanceFromPrev?: number; // km
    proofImage?: string;
    proofImagePath?: string;
    proofCapturedAt?: string;
    proofLat?: number;
    proofLng?: number;
    proofLocation?: string;
    proofVerifiedAt?: string;
    proofVerifiedBy?: string;
    reviewedAt?: string;
    reviewedBy?: string;
    failureReason?: string;
    notes?: string;
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
    amount: number; // litres
    cost: number;
    currency: string;
    odometer: number;
    location: string;
    pumpName?: string;
    fuelType?: 'diesel' | 'petrol' | 'ev' | 'cng';
    timestamp: string;
    receiptImage?: string;
    receiptImagePath?: string;
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
    type: 'geofence' | 'maintenance' | 'fuel-theft' | 'delay' | 'sos' | 'driver-break';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    vehicleId?: string;
    tripId?: string;
    resolved: boolean;
    metadata?: {
        issueType?: string;
        etaMinutes?: number;
        informed?: boolean;
    };
}
