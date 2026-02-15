"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Trip } from '@/lib/types';
import L from 'leaflet';

const icon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const startIcon = new L.Icon({
    ...icon.options,
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
});

const endIcon = new L.Icon({
    ...icon.options,
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
});

interface RouteMapProps {
    trip: Trip;
}

const RouteMapContent = ({ trip }: RouteMapProps) => {
    // Construct path: Start -> Drop 1 -> Drop 2 ...
    const positions: [number, number][] = [
        [trip.startLocation.lat, trip.startLocation.lng],
        ...trip.drops.map(d => [d.lat, d.lng] as [number, number])
    ];

    const center = positions[0];

    return (
        <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%', borderRadius: '16px' }}>
            <TileLayer
                attribution='&copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {/* Start Marker */}
            <Marker position={positions[0]} icon={startIcon}>
                <Popup>Start: {trip.startLocation.address}</Popup>
            </Marker>

            {/* Drop Markers */}
            {trip.drops.map((drop, idx) => (
                <Marker key={drop.id} position={[drop.lat, drop.lng]} icon={idx === trip.drops.length - 1 ? endIcon : icon}>
                    <Popup>
                        <strong>{idx + 1}. {drop.customerName}</strong><br />
                        {drop.address}
                    </Popup>
                </Marker>
            ))}

            {/* Route Polyline (Blue for Eco-Friendly) */}
            <Polyline
                positions={positions}
                pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8, lineCap: 'round' }}
            />

            {/* Simulated Traffic/Eco Overlay could go here */}
        </MapContainer>
    );
};

export default RouteMapContent;
