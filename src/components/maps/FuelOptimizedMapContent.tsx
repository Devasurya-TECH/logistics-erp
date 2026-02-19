"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icon issues in Next.js + Leaflet
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const defaultIcon = new L.Icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const startIcon = new L.Icon({
    ...defaultIcon.options,
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
});

const endIcon = new L.Icon({
    ...defaultIcon.options,
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
});

interface FuelOptimizedMapContentProps {
    start: [number, number];
    end: [number, number];
    waypoints?: [number, number][];
}

// Component to auto-fit map bounds when positions change
function FitBounds({ positions }: { positions: [number, number][] }) {
    const map = useMap();

    useEffect(() => {
        if (positions.length >= 2) {
            const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        } else if (positions.length === 1) {
            map.setView(positions[0], 12);
        }
    }, [positions, map]);

    return null;
}

const FuelOptimizedMapContent = ({ start, end, waypoints = [] }: FuelOptimizedMapContentProps) => {
    // Basic route: Start -> Waypoints -> End
    const positions: [number, number][] = [start, ...waypoints, end];
    const center = start;

    return (
        <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%', borderRadius: '16px' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Auto-fit to positions */}
            <FitBounds positions={positions} />

            {/* Route Glow Effect */}
            <Polyline
                positions={positions}
                pathOptions={{
                    color: '#3b82f6',
                    weight: 8,
                    opacity: 0.3,
                    lineCap: 'round',
                }}
            />

            {/* Main Optimized Route */}
            <Polyline
                positions={positions}
                pathOptions={{
                    color: '#60a5fa', // Blue-400
                    weight: 4,
                    opacity: 1,
                    lineCap: 'round',
                    dashArray: '10, 12',
                    dashOffset: '0',
                    className: 'animate-dash-flow'
                }}
            />

            {/* Start Marker */}
            <Marker position={start} icon={startIcon}>
                <Popup>Start Point</Popup>
            </Marker>

            {/* End Marker */}
            <Marker position={end} icon={endIcon}>
                <Popup>Destination</Popup>
            </Marker>

            {/* Waypoints */}
            {waypoints.map((wp, idx) => (
                <Marker key={idx} position={wp} icon={defaultIcon}>
                    <Popup>Waypoint {idx + 1}</Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default FuelOptimizedMapContent;
