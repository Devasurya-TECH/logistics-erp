"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issues in Next.js + Leaflet
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

interface FuelOptimizedMapContentProps {
    start: [number, number];
    end: [number, number];
    waypoints?: [number, number][];
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
                    className: 'animate-dash-flow' // We will assume global CSS has this or just leave static for now
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
                <Marker key={idx} position={wp} icon={icon}>
                    <Popup>Waypoint {idx + 1}</Popup>
                </Marker>
            ))}
            {/* Alternative Route (Gray) - Simulated simple straight line logic for visual comparison */}
            <Polyline
                positions={[start, [start[0], end[1]], end]}
                pathOptions={{
                    color: '#94a3b8', // Slate-400
                    weight: 4,
                    opacity: 0.5,
                    lineCap: 'round'
                }}
            />
        </MapContainer>
    );
};

export default FuelOptimizedMapContent;
