
import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Plus, X, RotateCcw } from 'lucide-react';
import axios from 'axios';
import LocationSearch from './LocationSearchIQ';

// --- Icons Setup ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];

// Check for API Key
const API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY || '';

interface Coordinate {
    lat: number;
    lng: number;
    address: string;
}

interface RoutePlannerProps {
    onRouteUpdate: (data: {
        pickup: Coordinate | null;
        drop: Coordinate | null;
        stops: Coordinate[];
        distanceKm?: number;
        durationMin?: number;
    }) => void;
    // Controlled props
    pickup?: Coordinate | null;
    drop?: Coordinate | null;
    stops?: Coordinate[];
    hideControls?: boolean;
    children?: ReactNode;
    className?: string;
    height?: string;
    selectionMode?: 'pickup' | 'drop' | 'stop' | null;
    onSelectionModeChange?: (mode: 'pickup' | 'drop' | 'stop' | null) => void;
}

// --- Map Helper Components ---

function MapClickEvents({ mode, onLocationSelect }: { mode: string | null, onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            if (mode) {
                onLocationSelect(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
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

// --- Main Component ---

const RoutePlanner: React.FC<RoutePlannerProps> = ({
    onRouteUpdate,
    pickup: propPickup,
    drop: propDrop,
    stops: propStops,
    hideControls,
    children,
    className = '',
    height = '400px',
    selectionMode,
    onSelectionModeChange,
}) => {
    // Mode: 'pickup', 'drop', 'stop', or null (viewing)
    const [internalMode, setInternalMode] = useState<'pickup' | 'drop' | 'stop' | null>(null);
    const mode = selectionMode !== undefined ? selectionMode : internalMode;

    const handleModeChange = useCallback((newMode: 'pickup' | 'drop' | 'stop' | null) => {
        if (onSelectionModeChange) {
            onSelectionModeChange(newMode);
            return;
        }

        setInternalMode(newMode);
    }, [onSelectionModeChange]);

    // Internal state (initialized from props, but synced via useEffect)
    const [pickup, setPickup] = useState<Coordinate | null>(propPickup || null);
    const [drop, setDrop] = useState<Coordinate | null>(propDrop || null);
    const [stops, setStops] = useState<Coordinate[]>(propStops || []);

    const [routePath, setRoutePath] = useState<[number, number][]>([]);
    const [routeInfo, setRouteInfo] = useState<{ distance: number, duration: number } | null>(null);

    // Sync state if props change (One-way data flow from parent -> child)
    useEffect(() => {
        if (propPickup !== undefined && JSON.stringify(propPickup) !== JSON.stringify(pickup)) {
            setPickup(propPickup);
        }
    }, [propPickup]);

    useEffect(() => {
        if (propDrop !== undefined && JSON.stringify(propDrop) !== JSON.stringify(drop)) {
            setDrop(propDrop);
        }
    }, [propDrop]);

    useEffect(() => {
        if (propStops !== undefined && JSON.stringify(propStops) !== JSON.stringify(stops)) {
            setStops(propStops);
        }
    }, [propStops]);

    // 1. Calculate Route when points change
    useEffect(() => {
        const calculateRoute = async () => {
            // We need at least Pickup + Drop to draw a route. 
            // OSRM/ORS requires coordinates in [lng, lat] format for API, but Leaflet uses [lat, lng].
            if (pickup && drop) {
                const points = [
                    [pickup.lng, pickup.lat],
                    ...stops.map(s => [s.lng, s.lat]),
                    [drop.lng, drop.lat]
                ];

                try {
                    // Using OSRM public demo for frontend visualization (no key needed)
                    // Format: {lng},{lat};{lng},{lat}...
                    const coordsString = points.map(p => p.join(',')).join(';');
                    const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;

                    const response = await axios.get(url);
                    if (response.data.routes && response.data.routes.length > 0) {
                        const route = response.data.routes[0];

                        // Swap [lng, lat] to [lat, lng] for Leaflet
                        const leafletPath = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);

                        setRoutePath(leafletPath);
                        setRouteInfo({
                            distance: route.distance / 1000, // m to km
                            duration: route.duration / 60    // s to min
                        });

                        // Notify parent form
                        onRouteUpdate({
                            pickup,
                            drop,
                            stops,
                            distanceKm: parseFloat((route.distance / 1000).toFixed(2)),
                            durationMin: parseFloat((route.duration / 60).toFixed(2))
                        });
                    }
                } catch (err) {
                    console.error("Routing error:", err);
                }
            } else {
                // Even if incomplete, sync the points
                onRouteUpdate({ pickup, drop, stops });
                setRoutePath([]);
                setRouteInfo(null);
            }
        };

        calculateRoute();
    }, [pickup, drop, stops]);

    // 2. Handle Map Clicks
    const handleMapClick = async (lat: number, lng: number) => {
        // Reverse Geocode
        let address = "Unknown Location";
        try {
            let found = false;
            // 1. LocationIQ
            if (API_KEY) {
                try {
                    const url = `https://api.locationiq.com/v1/reverse?key=${API_KEY}&lat=${lat}&lon=${lng}&format=json`;
                    const res = await axios.get(url);
                    if (res.data && res.data.display_name) {
                        address = res.data.display_name;
                        found = true;
                    }
                } catch (e) { }
            }

            // 2. Photon
            if (!found) {
                try {
                    const url = `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`;
                    const res = await axios.get(url);
                    if (res.data && res.data.features && res.data.features.length > 0) {
                        const f = res.data.features[0];
                        address = `${f.properties.name || ''} ${f.properties.street || ''}, ${f.properties.city || f.properties.district || ''}`;
                        found = true;
                    }
                } catch (e) { }
            }

            // 3. Nominatim
            if (!found) {
                const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                address = res.data.display_name.split(',').slice(0, 3).join(',');
            }
        } catch (e) { console.error(e); }

        const newCoord = { lat, lng, address };

        if (mode === 'pickup') {
            setPickup(newCoord);
            handleModeChange(null);
        } else if (mode === 'drop') {
            setDrop(newCoord);
            handleModeChange(null);
        } else if (mode === 'stop') {
            setStops([...stops, newCoord]);
            handleModeChange(null);
        }
    };

    // 3. Handle Live Location
    const handleLiveLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                // Auto-set as pickup
                let address = "My Current Location";
                try {
                    // Simplified reverse geocode for live location (using same robust logic)
                    // 1. Try Photon first for speed here
                    try {
                        const url = `https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`;
                        const res = await axios.get(url);
                        if (res.data && res.data.features && res.data.features.length > 0) {
                            const f = res.data.features[0];
                            address = `${f.properties.name || ''} ${f.properties.street || ''}, ${f.properties.city || ''}`;
                        } else {
                            throw new Error("No photon result");
                        }
                    } catch (e) {
                        // Fallback to Nominatim
                        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        address = res.data.display_name;
                    }
                } catch (e) { }

                setPickup({ lat: latitude, lng: longitude, address });
            });
        }
    };

    // 4. Handle Search Result Selection
    const confirmSearchResult = (result: any) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const newCoord = { lat, lng, address: result.display_name };

        // Decide where to put it based on what's missing, or default to pickup
        if (!pickup) setPickup(newCoord);
        else if (!drop) setDrop(newCoord);
        else setStops([...stops, newCoord]); // If both set, add as stop
    };

    // Calculate bounds to zoom
    const getBounds = (): L.LatLngBoundsExpression | null => {
        const points: [number, number][] = [];
        if (pickup) points.push([pickup.lat, pickup.lng]);
        if (drop) points.push([drop.lat, drop.lng]);
        stops.forEach(s => points.push([s.lat, s.lng]));

        if (points.length > 0) return L.latLngBounds(points);
        return null; // Default center
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Controls Bar */}
            {!hideControls && (
                <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex-1 space-y-2">
                        <LocationSearch onLocationSelect={confirmSearchResult} />

                        {/* Active Points Display */}
                        <div className="space-y-2 text-sm">
                            <div className={`flex items-center justify-between p-2 rounded border ${mode === 'pickup' ? 'border-green-500 ring-1 ring-green-200' : 'border-slate-200 bg-white'}`}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                    <span className="truncate">{pickup ? pickup.address : "Pickup not set"}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button type="button" onClick={() => handleLiveLocation()} title="Use My Location" className="p-1 hover:bg-slate-100 rounded text-blue-600"><Navigation size={14} /></button>
                                    <button type="button" onClick={() => handleModeChange('pickup')} className="p-1 hover:bg-slate-100 rounded text-slate-500"><MapPin size={14} /></button>
                                </div>
                            </div>

                            {stops.map((stop, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded border border-slate-200 bg-white ml-4 border-l-2 border-l-yellow-400">
                                    <span className="truncate text-slate-600">{stop.address}</span>
                                    <button type="button" onClick={() => setStops(stops.filter((_, i) => i !== idx))} className="p-1 hover:bg-red-50 text-red-500 rounded"><X size={14} /></button>
                                </div>
                            ))}

                            <div className={`flex items-center justify-between p-2 rounded border ${mode === 'drop' ? 'border-red-500 ring-1 ring-red-200' : 'border-slate-200 bg-white'}`}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                    <span className="truncate">{drop ? drop.address : "Drop not set"}</span>
                                </div>
                                <button type="button" onClick={() => handleModeChange('drop')} className="p-1 hover:bg-slate-100 rounded text-slate-500"><MapPin size={14} /></button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[140px]">
                        <button
                            type="button"
                            onClick={() => handleModeChange('stop')}
                            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${mode === 'stop' ? 'bg-yellow-50 border-yellow-400 text-yellow-700' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
                        >
                            <Plus size={16} /> Add Stop
                        </button>

                        {routeInfo && (
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
                                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Estimated Trip</p>
                                <div className="text-lg font-bold text-blue-900">{routeInfo.distance.toFixed(1)} km</div>
                                <div className="text-sm text-blue-700">{Math.round(routeInfo.duration)} mins</div>
                            </div>
                        )}

                        <button type="button" onClick={() => { setPickup(null); setDrop(null); setStops([]); setRoutePath([]); }} className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-red-500 mt-auto">
                            <RotateCcw size={12} /> Reset Map
                        </button>
                    </div>
                </div>
            )}

            {/* The Map */}
            <div className="w-full rounded-xl overflow-hidden border border-slate-300 shadow-inner relative z-0" style={{ height }}>
                {children && (
                    <div className="absolute inset-0 pointer-events-none z-[900] p-4">
                        {children}
                    </div>
                )}

                {mode && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-blue-200 animate-bounce">
                        <p className="text-sm font-bold text-blue-800 flex items-center gap-2">
                            <MapPin size={16} />
                            Click map to set {mode.toUpperCase()}
                        </p>
                    </div>
                )}

                <MapContainer
                    center={SRI_LANKA_CENTER}
                    zoom={8}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />

                    <MapClickEvents mode={mode} onLocationSelect={handleMapClick} />
                    <MapUpdater bounds={getBounds()} />

                    {/* Render Markers */}
                    {pickup && <Marker position={[pickup.lat, pickup.lng]} title="Pickup"><Popup>Pickup: {pickup.address}</Popup></Marker>}
                    {drop && <Marker position={[drop.lat, drop.lng]} title="Drop"><Popup>Drop: {drop.address}</Popup></Marker>}
                    {stops.map((s, i) => (
                        <Marker key={i} position={[s.lat, s.lng]} title={`Stop ${i + 1}`} opacity={0.8}><Popup>Stop: {s.address}</Popup></Marker>
                    ))}

                    {/* Render Route Polyline */}
                    {routePath.length > 0 && (
                        <Polyline positions={routePath} color="#2563eb" weight={5} opacity={0.7} dashArray="10, 10" />
                    )}

                </MapContainer>
            </div>
        </div>
    );
};

export default RoutePlanner;
