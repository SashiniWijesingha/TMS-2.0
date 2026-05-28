
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import { calculateRoute } from '../../services/requestService';
import { useGoogleMaps } from '../../context/GoogleMapsContext';

interface Request {
    id: number;
    passengerDetails?: {
        pickup_lat: number;
        pickup_lng: number;
        drop_lat: number;
        drop_lng: number;
        pickup_location: string;
        drop_location: string;
        route_geometry?: string;
        pickup_coordinates?: { lat: number, lng: number, address: string };
        drop_coordinates?: { lat: number, lng: number, address: string };
    };
    materialDetails?: {
        pickup_lat: number;
        pickup_lng: number;
        drop_lat: number;
        drop_lng: number;
        pickup_location: string;
        drop_location: string;
        route_geometry?: string;
        pickup_coordinates?: { lat: number, lng: number, address: string };
        drop_coordinates?: { lat: number, lng: number, address: string };
    };
}

interface GoogleClusterMapProps {
    requests: Request[];
}

const containerStyle = {
    width: '100%',
    height: '100%'
};

const SRI_LANKA_CENTER = {
    lat: 7.8731,
    lng: 80.7718
};

const GoogleClusterMap: React.FC<GoogleClusterMapProps> = ({ requests }) => {
    const { isLoaded } = useGoogleMaps();

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);
    const [routeStats, setRouteStats] = useState<{ distance: number, duration: number } | null>(null);

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Calculate Combined Route
    useEffect(() => {
        const calcCombinedRoute = async () => {
            if (!requests || requests.length === 0) {
                setRoutePath([]);
                setRouteStats(null);
                return;
            }

            // Strategy: Use the first request as the "Anchor" (Main Trip)
            // This works well for "Smart Clusters" where index 0 is the Primary request.
            // For Manual, it assumes the first added is the main one.
            const primary = requests[0];
            const pDetails = primary.passengerDetails || primary.materialDetails;
            if (!pDetails) return;

            const start = {
                lat: pDetails.pickup_lat || pDetails.pickup_coordinates?.lat || 0,
                lng: pDetails.pickup_lng || pDetails.pickup_coordinates?.lng || 0,
                address: pDetails.pickup_location || pDetails.pickup_coordinates?.address || ''
            };

            const end = {
                lat: pDetails.drop_lat || pDetails.drop_coordinates?.lat || 0,
                lng: pDetails.drop_lng || pDetails.drop_coordinates?.lng || 0,
                address: pDetails.drop_location || pDetails.drop_coordinates?.address || ''
            };

            const stops: any[] = [];

            // Add all other requests as intermediate stops
            // Note: simple concatenation logic: Pickup R2 -> Drop R2 -> Pickup R3...
            // Ideally we'd optimize this order, but backend takes fixed order.
            // This is "Good Enough" for visualizing En-Route sharing (P1 -> P2 -> D2 -> D1) if we interleave?
            // "RouteService" visits stops strictly in order.
            // If we want P1 -> P2 -> D2 -> D1, we need to pass P2, D2 as stops between P1 and D1.

            for (let i = 1; i < requests.length; i++) {
                const r = requests[i];
                const d = r.passengerDetails || r.materialDetails;
                if (!d) continue;

                stops.push({
                    lat: d.pickup_lat || d.pickup_coordinates?.lat || 0,
                    lng: d.pickup_lng || d.pickup_coordinates?.lng || 0,
                    address: d.pickup_location || d.pickup_coordinates?.address || ''
                });
                stops.push({
                    lat: d.drop_lat || d.drop_coordinates?.lat || 0,
                    lng: d.drop_lng || d.drop_coordinates?.lng || 0,
                    address: d.drop_location || d.drop_coordinates?.address || ''
                });
            }

            if (start.lat && end.lat) {
                try {
                    const data = await calculateRoute(start, end, stops);
                    if (data && data.geometry) {
                        const path = data.geometry.coordinates.map((c: number[]) => ({
                            lat: c[1],
                            lng: c[0]
                        }));
                        setRoutePath(path);
                        setRouteStats({ distance: data.distanceKm, duration: data.durationMin });
                    }
                } catch (e) {
                    console.error("Failed to calc cluster route", e);
                }
            }
        };

        calcCombinedRoute();
    }, [requests]);

    const { markers, bounds } = useMemo(() => {
        if (!isLoaded || !window.google) return { markers: [], bounds: null };

        const _markers: any[] = [];
        const _bounds = new google.maps.LatLngBounds();
        let hasPoints = false;

        requests.forEach((r, idx) => {
            const d = r.passengerDetails || r.materialDetails;
            if (!d) return;

            // Normalize Coordinates
            const pickLat = d.pickup_lat || d.pickup_coordinates?.lat;
            const pickLng = d.pickup_lng || d.pickup_coordinates?.lng;
            const dropLat = d.drop_lat || d.drop_coordinates?.lat;
            const dropLng = d.drop_lng || d.drop_coordinates?.lng;
            const pickLoc = d.pickup_location || d.pickup_coordinates?.address || 'Pickup';
            const dropLoc = d.drop_location || d.drop_coordinates?.address || 'Drop';

            // Pickup Marker
            if (pickLat && pickLng) {
                const pos = { lat: pickLat, lng: pickLng };
                _markers.push({
                    position: pos,
                    title: `(#${r.id}) Pickup: ${pickLoc}`,
                    // Primary Green, Others Yellow
                    icon: idx === 0 ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
                    key: `p-${r.id}`,
                    label: idx === 0 ? 'P' : `${idx + 1}`
                });
                _bounds.extend(pos);
                hasPoints = true;
            }

            // Drop Marker
            if (dropLat && dropLng) {
                const pos = { lat: dropLat, lng: dropLng };
                _markers.push({
                    position: pos,
                    title: `(#${r.id}) Drop: ${dropLoc}`,
                    // Primary Red, Others Orange/Pink
                    icon: idx === 0 ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
                    key: `d-${r.id}`,
                    label: idx === 0 ? 'D' : `${idx + 1}`
                });
                _bounds.extend(pos);
                hasPoints = true;
            }
        });

        return { markers: _markers, bounds: hasPoints ? _bounds : null };
    }, [requests, isLoaded]); // Re-calc when requests change or script loads

    useEffect(() => {
        if (map && bounds && !bounds.isEmpty()) {
            map.fitBounds(bounds);
        }
    }, [map, bounds]);

    if (!isLoaded) return <div className="w-full h-full bg-slate-100 animate-pulse" />;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={SRI_LANKA_CENTER}
            zoom={8}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
                streetViewControl: false,
                mapTypeControl: false
            }}
        >
            {/* Combined Route */}
            {routePath.length > 0 && (
                <PolylineF
                    path={routePath}
                    options={{
                        strokeColor: '#3b82f6', // Bright Blue
                        strokeOpacity: 0.8,
                        strokeWeight: 6
                    }}
                />
            )}

            {markers.map(m => (
                <MarkerF
                    key={m.key}
                    position={m.position}
                    title={m.title}
                    icon={m.icon}
                    label={{ text: m.label, color: 'white', fontSize: '12px' }}
                />
            ))}

            {/* Stats Overlay */}
            {routeStats && (
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg border border-slate-200 text-xs text-slate-700">
                    <div className="font-bold text-indigo-600 mb-1">Combined Route</div>
                    <div>Dist: {routeStats.distance} km</div>
                    <div>Est: {Math.round(routeStats.duration)} mins</div>
                </div>
            )}
        </GoogleMap>
    );
};

export default GoogleClusterMap;
