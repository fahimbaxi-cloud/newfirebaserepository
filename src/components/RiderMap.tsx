'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'

// Fix for default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon.src,
    shadowUrl: iconShadow.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export function RiderMap({ riders }: { riders: any[] }) {
    return (
        <MapContainer center={[20, 77] as any} zoom={5} style={{ height: '400px', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {(riders || []).filter(r => r.sharing).map(rider => (
                <Marker key={rider.riderUid} position={[rider.latitude, rider.longitude]}>
                    <Popup>Rider: {rider.riderUid}</Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}
