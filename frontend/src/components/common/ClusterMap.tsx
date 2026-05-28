
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// --- Leaflet Icons Fix ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const PickupIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const DropIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];

interface Request {
    id: number;
    passengerDetails?: {
        pickup_lat: number;
        pickup_lng: number;
        drop_lat: number;
        drop_lng: number;
        pickup_location: string;
        drop_location: string;
    };
    materialDetails?: {
        pickup_lat: number;
        pickup_lng: number;
        drop_lat: number;
        drop_lng: number;
        pickup_location: string;
        drop_location: string;
    };
}

interface ClusterMapProps {
    requests: Request[];
}

function MapUpdater({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
}

const ClusterMap: React.FC<ClusterMapProps> = ({ requests }) => {
    const [routes, setRoutes] = useState<[number, number][][]>([]);

    const points: { lat: number, lng: number, type: 'pickup' | 'drop', reqId: number, address: string }[] = [];

    requests.forEach(r => {
        const details = r.passengerDetails || r.materialDetails;
        if (details && details.pickup_lat && details.pickup_lng) {
            points.push({
                lat: details.pickup_lat,
                lng: details.pickup_lng,
                type: 'pickup',
                reqId: r.id,
                address: details.pickup_location
            });
        }
        if (details && details.drop_lat && details.drop_lng) {
            points.push({
                lat: details.drop_lat,
                lng: details.drop_lng,
                type: 'drop',
                reqId: r.id,
                address: details.drop_location
            });
        }
    });

    // Calculate Bounds
    const getBounds = (): L.LatLngBoundsExpression | null => {
        if (points.length === 0) return null;
        return L.latLngBounds(points.map(p => [p.lat, p.lng]));
    };

    // Fetch Road Paths (OSRM)
    useEffect(() => {
        const fetchRoutes = async () => {
            const newRoutes: [number, number][][] = [];

            for (const r of requests) {
                const d = r.passengerDetails || r.materialDetails;
                if (d && d.pickup_lat && d.drop_lat) {
                    try {
                        const url = `https://router.project-osrm.org/route/v1/driving/${d.pickup_lng},${d.pickup_lat};${d.drop_lng},${d.drop_lat}?overview=full&geometries=geojson`;
                        const res = await axios.get(url);
                        if (res.data.routes && res.data.routes.length > 0) {
                            // Swap [lng,lat] -> [lat,lng] for Leaflet
                            const path = res.data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
                            newRoutes.push(path);
                        } else {
                            // Fallback
                            newRoutes.push([[d.pickup_lat, d.pickup_lng], [d.drop_lat, d.drop_lng]]);
                        }
                    } catch (e) {
                        console.error("OSRM Error", e);
                        newRoutes.push([[d.pickup_lat, d.pickup_lng], [d.drop_lat, d.drop_lng]]);
                    }
                }
            }
            setRoutes(newRoutes);
        };
        fetchRoutes();
    }, [requests]);

    return (
        <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-300 shadow-inner relative z-0">
            <MapContainer
                center={SRI_LANKA_CENTER}
                zoom={8}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                <MapUpdater bounds={getBounds()} />

                {points.map((p, idx) => (
                    <Marker
                        key={`${p.reqId}-${p.type}-${idx}`}
                        position={[p.lat, p.lng]}
                        icon={p.type === 'pickup' ? PickupIcon : DropIcon}
                    >
                        <Popup>
                            <strong>{p.type.toUpperCase()}</strong> (Req #{p.reqId})<br />
                            {p.address}
                        </Popup>
                    </Marker>
                ))}

                {/* Render Road Paths */}
                {routes.map((path, index) => (
                    <Polyline
                        key={index}
                        positions={path}
                        color="#3b82f6"
                        weight={4}
                        opacity={0.6}
                    />
                ))}

            </MapContainer>
        </div>
    );
};

export default ClusterMap;
