import { User, Driver, Vehicle, Trip, DropPoint, FuelEntry, Expense, Alert } from './types';

// Users
export const users: User[] = [
    { id: 'u1', name: 'Arjun Menon', email: 'manager@logistics.com', role: 'manager' },
    { id: 'u2', name: 'Lakshmi Nair', email: 'supervisor@logistics.com', role: 'supervisor' },
    { id: 'u3', name: 'Rahul Krishnan', email: 'driver@logistics.com', role: 'driver' },
    { id: 'u4', name: 'Vishnu Das', email: 'driver2@logistics.com', role: 'driver' },
    { id: 'u5', name: 'Mohammed Fasil', email: 'driver3@logistics.com', role: 'driver' }
];

// Vehicles
export const vehicles: Vehicle[] = [
    { id: 'v1', plateNumber: 'KL-07-CB-1234', model: 'Ashok Leyland Dost', status: 'active', fuelLevel: 75, mileage: 120500, location: { lat: 9.9312, lng: 76.2673 }, lastServiceDate: '2025-12-01' }, // Kochi
    { id: 'v2', plateNumber: 'KL-01-AZ-5678', model: 'Tata Ace Gold', status: 'active', fuelLevel: 45, mileage: 98000, location: { lat: 8.5241, lng: 76.9366 }, lastServiceDate: '2026-01-15' }, // Trivandrum
    { id: 'v3', plateNumber: 'KL-11-BE-9012', model: 'Mahindra Bolero Pickup', status: 'maintenance', fuelLevel: 20, mileage: 45000, location: { lat: 11.2588, lng: 75.7804 }, lastServiceDate: '2026-02-10' }, // Kozhikode
    { id: 'v4', plateNumber: 'KL-08-DD-3456', model: 'Eicher Pro 2049', status: 'active', fuelLevel: 90, mileage: 12000, location: { lat: 10.5276, lng: 76.2144 }, lastServiceDate: '2026-01-20' }, // Thrissur
    { id: 'v5', plateNumber: 'KL-13-XX-7890', model: 'BharatBenz 1217C', status: 'out-of-service', fuelLevel: 0, mileage: 150000, location: { lat: 11.8745, lng: 75.3704 }, lastServiceDate: '2025-11-05' } // Kannur
];

// Trips
export const trips: Trip[] = [
    {
        id: 't1',
        vehicleId: 'v1',
        driverId: 'u3',
        supervisorId: 'u2',
        status: 'completed',
        startLocation: { lat: 9.9312, lng: 76.2673, address: 'Cochin Port Trust, Willingdon Island' },
        drops: [
            { id: 'd1', address: 'Lulu Mall Logistics Dock, Edappally', lat: 10.0276, lng: 76.3082, customerName: 'Lulu Hypermarket', status: 'delivered', estimatedArrival: '2026-02-15T10:00:00Z', actualArrival: '2026-02-15T09:45:00Z' },
            { id: 'd2', address: 'Infopark Phase 2, Kakkanad', lat: 10.0094, lng: 76.3765, customerName: 'Tech Valet Services', status: 'pending', estimatedArrival: '2026-02-16T14:00:00Z' }
        ],
        estimatedDistance: 45,
        startTime: '2026-02-15T06:00:00Z'
    },
    {
        id: 't2',
        vehicleId: 'v2',
        driverId: 'u4',
        supervisorId: 'u2',
        status: 'assigned',
        startLocation: { lat: 8.5241, lng: 76.9366, address: 'Technopark Campus, Trivandrum' },
        drops: [
            { id: 'd3', address: 'Kovalam Beach Resort Supplies', lat: 8.3988, lng: 76.9820, customerName: 'Leela Raviz', status: 'pending', estimatedArrival: '2026-02-17T09:00:00Z' }
        ],
        estimatedDistance: 22
    },
    {
        id: 't3',
        vehicleId: 'v4',
        driverId: 'u5',
        supervisorId: 'u2',
        status: 'completed',
        startLocation: { lat: 10.5276, lng: 76.2144, address: 'Thrissur Round North' },
        drops: [
            { id: 'd4', address: 'Guruvayur Temple Devaswom', lat: 10.5952, lng: 76.0369, customerName: 'Temple Stores', status: 'delivered', estimatedArrival: '2026-02-14T11:00:00Z', actualArrival: '2026-02-14T10:55:00Z' }
        ],
        estimatedDistance: 28,
        startTime: '2026-02-14T08:00:00Z',
        endTime: '2026-02-14T12:00:00Z',
        actualDistance: 30
    }
];

// Fuel Entries
export const fuelEntries: FuelEntry[] = [
    {
        id: 'f1',
        tripId: 't3',
        driverId: 'u5',
        vehicleId: 'v4',
        amount: 45,
        cost: 4300,
        currency: 'INR',
        odometer: 12050,
        location: 'Indian Oil, Kunnamkulam',
        timestamp: '2026-02-14T09:30:00Z',
        status: 'approved',
        verifiedBy: 'u2',
        approvedBy: 'u1'
    },
    {
        id: 'f2',
        tripId: 't1',
        driverId: 'u3',
        vehicleId: 'v1',
        amount: 60,
        cost: 5800,
        currency: 'INR',
        odometer: 120600,
        location: 'Bharat Petroleum, Vyttila',
        timestamp: '2026-02-15T08:15:00Z',
        status: 'pending'
    }
];

// Alerts
export const alerts: Alert[] = [
    {
        id: 'a1',
        type: 'geofence',
        severity: 'high',
        message: 'Vehicle KL-07-CB-1234 diverted from MG Road route.',
        timestamp: '2026-02-15T08:45:00Z',
        vehicleId: 'v1',
        tripId: 't1',
        resolved: false
    },
    {
        id: 'a2',
        type: 'maintenance',
        severity: 'medium',
        message: 'KL-11-BE-9012 requires brake inspection.',
        timestamp: '2026-02-14T10:00:00Z',
        vehicleId: 'v3',
        resolved: false
    }
];
