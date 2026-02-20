"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { useEffect, useState } from 'react';

// Custom icons for vehicle status
const createVehicleIcon = (status: 'moving' | 'idle' | 'offline') => {
    const color = status === 'moving' ? '#10b981' : status === 'idle' ? '#f59e0b' : '#94a3b8';
    const pulseClass = status === 'moving' ? 'vehicle-pulse' : '';

    return L.divIcon({
        html: `
            <div class="vehicle-marker ${pulseClass}" style="
                background: ${color};
                width: 32px;
                height: 32px;
                border-radius: 12px;
                border: 3px solid white;
                box-shadow: 0 2px 12px ${color}66;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                position: relative;
            ">
                🚛
                ${status === 'moving' ? `<span style="
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    width: 10px;
                    height: 10px;
                    background: #10b981;
                    border-radius: 50%;
                    border: 2px solid white;
                    animation: pulse 2s infinite;
                "></span>` : ''}
            </div>
        `,
        className: 'vehicle-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
    });
};

// Component to auto-fit bounds or fly to selected
function MapController({ positions, selectedId }: { positions: VehiclePosition[], selectedId: string | null }) {
    const map = useMap();

    useEffect(() => {
        if (selectedId) {
            const selected = positions.find(p => p.id === selectedId);
            if (selected) {
                map.flyTo([selected.lat, selected.lng], 14, {
                    animate: true,
                    duration: 1.5
                });
            }
        } else if (positions.length >= 2) {
            const bounds = L.latLngBounds(positions.map(p => L.latLng(p.lat, p.lng)));
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
        } else if (positions.length === 1) {
            map.setView([positions[0].lat, positions[0].lng], 12);
        }
    }, [positions.length, selectedId, map]);

    return null;
}

interface VehiclePosition {
    id: string;
    lat: number;
    lng: number;
    speed: number;
    status: 'moving' | 'idle' | 'offline';
    driverName: string;
    vehiclePlate: string;
    tripId: string | null;
}

interface LiveTrackingMapProps {
    positions: VehiclePosition[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}

export default function LiveTrackingMapContent({ positions, selectedId, onSelect }: LiveTrackingMapProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isFullscreen]);

    const center: [number, number] = positions.length > 0
        ? [positions[0].lat, positions[0].lng]
        : [10.8505, 76.2711];

    const allPositions: [number, number][] = positions.map(p => [p.lat, p.lng]);

    return (
        <div className={`relative transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[9999] bg-slate-900' : 'h-full w-full'}`}>
            <MapContainer
                center={center}
                zoom={10}
                style={{ height: '100%', width: '100%', borderRadius: isFullscreen ? '0px' : '16px' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <MapController positions={positions} selectedId={selectedId} />

                {positions.map(pos => (
                    <Marker
                        key={pos.id}
                        position={[pos.lat, pos.lng]}
                        icon={createVehicleIcon(pos.status)}
                        eventHandlers={{
                            click: () => onSelect(pos.id === selectedId ? null : pos.id),
                        }}
                    >
                        <Popup>
                            <div className="text-slate-900 p-1 font-sans min-w-[160px]">
                                <div className="flex items-center justify-between mb-2">
                                    <strong className="text-sm font-bold text-slate-800">{pos.vehiclePlate}</strong>
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${pos.status === 'moving' ? 'bg-emerald-100 text-emerald-700' :
                                        pos.status === 'idle' ? 'bg-amber-100 text-amber-700' :
                                            'bg-gray-100 text-gray-500'
                                        }`}>{pos.status}</span>
                                </div>
                                <div className="text-xs text-slate-500 space-y-1">
                                    <div>👤 {pos.driverName}</div>
                                    {pos.status === 'moving' && <div>🏎️ {Math.round(pos.speed)} km/h</div>}
                                    {pos.tripId && <div>📋 Trip #{pos.tripId}</div>}
                                    <div className="text-[10px] text-slate-400 pt-1 border-t border-gray-100 mt-1">
                                        📍 {pos.lat.toFixed(4)}°N, {pos.lng.toFixed(4)}°E
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Selected vehicle highlight ring */}
                {selectedId && (() => {
                    const sel = positions.find(p => p.id === selectedId);
                    if (!sel) return null;
                    return (
                        <CircleMarker
                            center={[sel.lat, sel.lng]}
                            radius={25}
                            pathOptions={{
                                color: '#3b82f6',
                                weight: 2,
                                opacity: 0.4,
                                fillColor: '#3b82f6',
                                fillOpacity: 0.1,
                            }}
                        />
                    );
                })()}
            </MapContainer>

            {/* Fullscreen Toggle Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsFullscreen(!isFullscreen);
                }}
                className="absolute top-4 right-4 z-[401] bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-white hover:bg-white transition-all active:scale-95"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
                {isFullscreen ? (
                    <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                )}
            </button>
        </div>
    );
}
