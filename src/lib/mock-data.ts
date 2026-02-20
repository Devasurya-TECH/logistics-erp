import { User, Driver, Vehicle, Trip, DropPoint, FuelEntry, Expense, Alert } from './types';

// Users
export const users: User[] = [
    { id: 'u1', name: 'Arjun Menon', email: 'manager@logistics.com', role: 'manager' },
    { id: 'u2', name: 'Lakshmi Nair', email: 'supervisor@logistics.com', role: 'supervisor' },
    { id: 'u3', name: 'Rahul Krishnan', email: 'driver@logistics.com', role: 'driver' },
    { id: 'u4', name: 'Vishnu Das', email: 'driver2@logistics.com', role: 'driver' },
    { id: 'u5', name: 'Mohammed Fasil', email: 'driver3@logistics.com', role: 'driver' },
    { id: 'u6', name: 'Anoop Kumar', email: 'driver4@logistics.com', role: 'driver' },
    { id: 'u7', name: 'Sreekanth Pillai', email: 'driver5@logistics.com', role: 'driver' },
    { id: 'u8', name: 'Deepak Raj', email: 'driver6@logistics.com', role: 'driver' },
    { id: 'u9', name: 'Nithin Babu', email: 'driver7@logistics.com', role: 'driver' },
    { id: 'u10', name: 'Sajith Mohan', email: 'driver8@logistics.com', role: 'driver' },
];

// Vehicles
export const vehicles: Vehicle[] = [
    { id: 'v1', plateNumber: 'KL-07-CB-1234', model: 'Ashok Leyland Dost', status: 'active', fuelLevel: 75, mileage: 120500, location: { lat: 9.9312, lng: 76.2673 }, lastServiceDate: '2025-12-01' },
    { id: 'v2', plateNumber: 'KL-01-AZ-5678', model: 'Tata Ace Gold', status: 'active', fuelLevel: 45, mileage: 98000, location: { lat: 8.5241, lng: 76.9366 }, lastServiceDate: '2026-01-15' },
    { id: 'v3', plateNumber: 'KL-11-BE-9012', model: 'Mahindra Bolero Pickup', status: 'maintenance', fuelLevel: 20, mileage: 45000, location: { lat: 11.2588, lng: 75.7804 }, lastServiceDate: '2026-02-10' },
    { id: 'v4', plateNumber: 'KL-08-DD-3456', model: 'Eicher Pro 2049', status: 'active', fuelLevel: 90, mileage: 12000, location: { lat: 10.5276, lng: 76.2144 }, lastServiceDate: '2026-01-20' },
    { id: 'v5', plateNumber: 'KL-13-XX-7890', model: 'BharatBenz 1217C', status: 'active', fuelLevel: 60, mileage: 150000, location: { lat: 11.8745, lng: 75.3704 }, lastServiceDate: '2025-11-05' },
];

// Extended Trips — 10 trips with various statuses
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
            { id: 'd2', address: 'Infopark Phase 2, Kakkanad', lat: 10.0094, lng: 76.3765, customerName: 'Tech Valet Services', status: 'delivered', estimatedArrival: '2026-02-15T14:00:00Z', actualArrival: '2026-02-15T13:30:00Z' }
        ],
        estimatedDistance: 45,
        actualDistance: 43,
        startTime: '2026-02-15T06:00:00Z',
        endTime: '2026-02-15T15:00:00Z'
    },
    {
        id: 't2',
        vehicleId: 'v2',
        driverId: 'u4',
        supervisorId: 'u2',
        status: 'in-progress',
        startLocation: { lat: 8.5241, lng: 76.9366, address: 'Technopark Campus, Trivandrum' },
        drops: [
            { id: 'd3', address: 'Kovalam Beach Resort Supplies', lat: 8.3988, lng: 76.9820, customerName: 'Leela Raviz', status: 'delivered', estimatedArrival: '2026-02-19T09:00:00Z', actualArrival: '2026-02-19T08:50:00Z' },
            { id: 'd4', address: 'Vizhinjam Port Area', lat: 8.3810, lng: 76.9600, customerName: 'Port Authority', status: 'pending', estimatedArrival: '2026-02-19T11:00:00Z' },
            { id: 'd5', address: 'Kazhakkoottam IT Hub', lat: 8.5560, lng: 76.8800, customerName: 'UST Global', status: 'pending', estimatedArrival: '2026-02-19T14:00:00Z' }
        ],
        estimatedDistance: 55,
        startTime: '2026-02-19T07:00:00Z'
    },
    {
        id: 't3',
        vehicleId: 'v4',
        driverId: 'u5',
        supervisorId: 'u2',
        status: 'completed',
        startLocation: { lat: 10.5276, lng: 76.2144, address: 'Thrissur Round North' },
        drops: [
            { id: 'd6', address: 'Guruvayur Temple Devaswom', lat: 10.5952, lng: 76.0369, customerName: 'Temple Stores', status: 'delivered', estimatedArrival: '2026-02-14T11:00:00Z', actualArrival: '2026-02-14T10:55:00Z' }
        ],
        estimatedDistance: 28,
        startTime: '2026-02-14T08:00:00Z',
        endTime: '2026-02-14T12:00:00Z',
        actualDistance: 30
    },
    {
        id: 't4',
        vehicleId: 'v1',
        driverId: 'u6',
        supervisorId: 'u2',
        status: 'in-progress',
        startLocation: { lat: 9.9312, lng: 76.2673, address: 'Kochi Warehouse Hub' },
        drops: [
            { id: 'd7', address: 'Marine Drive Commercial Complex', lat: 9.9716, lng: 76.2792, customerName: 'Kerala Traders', status: 'delivered', estimatedArrival: '2026-02-19T09:30:00Z', actualArrival: '2026-02-19T09:20:00Z' },
            { id: 'd8', address: 'Fort Kochi Bazaar Rd', lat: 9.9638, lng: 76.2420, customerName: 'Heritage Crafts', status: 'pending', estimatedArrival: '2026-02-19T11:30:00Z' },
            { id: 'd9', address: 'MG Road Ernakulam', lat: 9.9677, lng: 76.2867, customerName: 'Metro Pharma', status: 'pending', estimatedArrival: '2026-02-19T13:00:00Z' },
            { id: 'd10', address: 'Kaloor Stadium Road', lat: 9.9957, lng: 76.3002, customerName: 'Sports Arena', status: 'pending', estimatedArrival: '2026-02-19T15:00:00Z' }
        ],
        estimatedDistance: 32,
        startTime: '2026-02-19T08:00:00Z'
    },
    {
        id: 't5',
        vehicleId: 'v5',
        driverId: 'u7',
        supervisorId: 'u2',
        status: 'assigned',
        startLocation: { lat: 11.2588, lng: 75.7804, address: 'Kozhikode Central Warehouse' },
        drops: [
            { id: 'd11', address: 'SM Street Market', lat: 11.2480, lng: 75.7713, customerName: 'Calicut Spices', status: 'pending', estimatedArrival: '2026-02-20T10:00:00Z' },
            { id: 'd12', address: 'Hilite Mall Logistics', lat: 11.2336, lng: 75.8264, customerName: 'Reliance Retail', status: 'pending', estimatedArrival: '2026-02-20T12:00:00Z' }
        ],
        estimatedDistance: 18
    },
    {
        id: 't6',
        vehicleId: 'v4',
        driverId: 'u8',
        supervisorId: 'u2',
        status: 'completed',
        startLocation: { lat: 9.5916, lng: 76.5222, address: 'Kottayam Bus Stand' },
        drops: [
            { id: 'd13', address: 'Kumarakom Lake Resort', lat: 9.6029, lng: 76.4239, customerName: 'Lake Resort Group', status: 'delivered', estimatedArrival: '2026-02-13T09:00:00Z', actualArrival: '2026-02-13T08:45:00Z' },
            { id: 'd14', address: 'Changanassery Market', lat: 9.4433, lng: 76.5389, customerName: 'Fresh Veggies Ltd', status: 'delivered', estimatedArrival: '2026-02-13T11:00:00Z', actualArrival: '2026-02-13T11:10:00Z' }
        ],
        estimatedDistance: 40,
        actualDistance: 42,
        startTime: '2026-02-13T07:00:00Z',
        endTime: '2026-02-13T12:30:00Z'
    },
    {
        id: 't7',
        vehicleId: 'v2',
        driverId: 'u9',
        supervisorId: 'u2',
        status: 'completed',
        startLocation: { lat: 10.7867, lng: 76.6548, address: 'Palakkad Gateway' },
        drops: [
            { id: 'd15', address: 'Malampuzha Garden Area', lat: 10.8328, lng: 76.6838, customerName: 'Tourism Board', status: 'delivered', estimatedArrival: '2026-02-12T08:00:00Z', actualArrival: '2026-02-12T07:50:00Z' },
            { id: 'd16', address: 'Ottappalam Town', lat: 10.7702, lng: 76.3831, customerName: 'Agri Supplies', status: 'delivered', estimatedArrival: '2026-02-12T10:00:00Z', actualArrival: '2026-02-12T10:20:00Z' },
            { id: 'd17', address: 'Shoranur Junction', lat: 10.7618, lng: 76.2805, customerName: 'Railway Canteen', status: 'delivered', estimatedArrival: '2026-02-12T12:00:00Z', actualArrival: '2026-02-12T11:45:00Z' }
        ],
        estimatedDistance: 65,
        actualDistance: 63,
        startTime: '2026-02-12T06:30:00Z',
        endTime: '2026-02-12T13:00:00Z'
    },
    {
        id: 't8',
        vehicleId: 'v1',
        driverId: 'u10',
        supervisorId: 'u2',
        status: 'planned',
        startLocation: { lat: 9.9312, lng: 76.2673, address: 'Cochin Port Trust' },
        drops: [
            { id: 'd18', address: 'Aluva Industrial Area', lat: 10.1100, lng: 76.3500, customerName: 'Industrial Chemicals Co', status: 'pending', estimatedArrival: '2026-02-21T09:00:00Z' },
            { id: 'd19', address: 'Angamaly Market', lat: 10.1964, lng: 76.3869, customerName: 'Angamaly Fresh', status: 'pending', estimatedArrival: '2026-02-21T11:00:00Z' }
        ],
        estimatedDistance: 38
    },
    {
        id: 't9',
        vehicleId: 'v5',
        driverId: 'u3',
        supervisorId: 'u2',
        status: 'completed',
        startLocation: { lat: 11.8745, lng: 75.3704, address: 'Kannur City Centre' },
        drops: [
            { id: 'd20', address: 'Thalassery Pier', lat: 11.7480, lng: 75.4890, customerName: 'Fish Exports Kerala', status: 'delivered', estimatedArrival: '2026-02-11T08:00:00Z', actualArrival: '2026-02-11T07:55:00Z' },
            { id: 'd21', address: 'Payyanur Bus Station', lat: 12.0946, lng: 75.2050, customerName: 'North Kerala Traders', status: 'delivered', estimatedArrival: '2026-02-11T11:00:00Z', actualArrival: '2026-02-11T11:15:00Z' }
        ],
        estimatedDistance: 70,
        actualDistance: 72,
        startTime: '2026-02-11T06:00:00Z',
        endTime: '2026-02-11T13:00:00Z'
    },
    {
        id: 't10',
        vehicleId: 'v4',
        driverId: 'u5',
        supervisorId: 'u2',
        status: 'cancelled',
        startLocation: { lat: 9.4981, lng: 76.3388, address: 'Alappuzha Boat Jetty' },
        drops: [
            { id: 'd22', address: 'Houseboat Terminal', lat: 9.4897, lng: 76.3286, customerName: 'Backwater Tourism', status: 'skipped' }
        ],
        estimatedDistance: 5
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
    },
    {
        id: 'f3',
        tripId: 't2',
        driverId: 'u4',
        vehicleId: 'v2',
        amount: 35,
        cost: 3400,
        currency: 'INR',
        odometer: 98200,
        location: 'HP Petrol, Kazhakoottam',
        timestamp: '2026-02-19T07:30:00Z',
        status: 'pending'
    },
    {
        id: 'f4',
        tripId: 't4',
        driverId: 'u6',
        vehicleId: 'v1',
        amount: 50,
        cost: 4800,
        currency: 'INR',
        odometer: 120700,
        location: 'Indian Oil, Edappally',
        timestamp: '2026-02-19T08:00:00Z',
        status: 'pending'
    },
    {
        id: 'f5',
        tripId: 't6',
        driverId: 'u8',
        vehicleId: 'v4',
        amount: 40,
        cost: 3900,
        currency: 'INR',
        odometer: 12200,
        location: 'BPCL, Kottayam',
        timestamp: '2026-02-13T07:15:00Z',
        status: 'verified',
        verifiedBy: 'u2'
    },
    {
        id: 'f6',
        tripId: 't7',
        driverId: 'u9',
        vehicleId: 'v2',
        amount: 55,
        cost: 5350,
        currency: 'INR',
        odometer: 98400,
        location: 'Indian Oil, Palakkad',
        timestamp: '2026-02-12T06:45:00Z',
        status: 'approved',
        verifiedBy: 'u2',
        approvedBy: 'u1'
    }
];

// Alerts
export const alerts: Alert[] = [
    {
        id: 'a1',
        type: 'geofence',
        severity: 'high',
        message: 'Vehicle KL-07-CB-1234 diverted from MG Road route.',
        timestamp: '2026-02-19T08:45:00Z',
        vehicleId: 'v1',
        tripId: 't4',
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
    },
    {
        id: 'a3',
        type: 'delay',
        severity: 'medium',
        message: 'Trip T2 delivery to Port Authority delayed by 30 min.',
        timestamp: '2026-02-19T11:30:00Z',
        tripId: 't2',
        resolved: false
    },
    {
        id: 'a4',
        type: 'fuel-theft',
        severity: 'critical',
        message: 'Suspicious fuel drop detected on KL-01-AZ-5678.',
        timestamp: '2026-02-19T10:15:00Z',
        vehicleId: 'v2',
        resolved: false
    },
    {
        id: 'a5',
        type: 'geofence',
        severity: 'low',
        message: 'Vehicle KL-08-DD-3456 entered Thrissur municipal zone.',
        timestamp: '2026-02-19T07:00:00Z',
        vehicleId: 'v4',
        resolved: true
    }
];
