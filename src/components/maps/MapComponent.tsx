"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Vehicle } from '@/lib/types';
import L from 'leaflet';

// Leaflet icon fix with CDN
const icon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface MapProps {
    vehicles: Vehicle[];
}

const VehicleMapContent = ({ vehicles }: MapProps) => {
    // Center on US or first vehicle
    // Use first vehicle location if available, else default
    const center: [number, number] = vehicles.length > 0
        ? [vehicles[0].location.lat, vehicles[0].location.lng]
        : [10.8505, 76.2711]; // Kerala, India

    return (
        <MapContainer center={center} zoom={8} style={{ height: '100%', width: '100%', borderRadius: '16px' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {vehicles.map((vehicle) => (
                <Marker
                    key={vehicle.id}
                    position={[vehicle.location.lat, vehicle.location.lng]}
                    icon={icon}
                >
                    <Popup className="glass-popup bg-white/90 backdrop-blur rounded shadow-xl">
                        <div className="text-slate-900 p-2 font-sans">
                            <strong className="text-lg block mb-1 text-slate-800">{vehicle.plateNumber}</strong>
                            <div className="text-xs text-slate-500 uppercase tracking-wide font-bold">{vehicle.model}</div>
                            <div className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${vehicle.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' :
                                vehicle.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                    'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                {vehicle.status}
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default VehicleMapContent;
