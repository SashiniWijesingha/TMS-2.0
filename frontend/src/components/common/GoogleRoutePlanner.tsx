import React, { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import {
  GoogleMap,
  MarkerF,
  PolylineF,
} from "@react-google-maps/api";
import { MapPin, Navigation, Plus, RotateCcw, X } from "lucide-react";
import { calculateRoute } from "../../services/requestService";
import { useGoogleMaps } from "../../context/GoogleMapsContext";

// Ensure this matches the type used in parent
interface Coordinate {
  lat: number;
  lng: number;
  address: string;
}

interface GoogleRoutePlannerProps {
  onRouteUpdate: (data: {
    pickup: Coordinate | null;
    drop: Coordinate | null;
    stops: Coordinate[];
    distanceKm?: number;
    durationMin?: number;
  }) => void;
  pickup?: Coordinate | null;
  drop?: Coordinate | null;
  stops?: Coordinate[];
  hideControls?: boolean;
  children?: ReactNode;
  className?: string; // wrapper class
  height?: string;
  selectionMode?: "pickup" | "drop" | "stop" | null;
  onSelectionModeChange?: (mode: "pickup" | "drop" | "stop" | null) => void;
}

const SRI_LANKA_CENTER = {
  lat: 7.8731,
  lng: 80.7718,
};

const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

const GoogleRoutePlanner: React.FC<GoogleRoutePlannerProps> = ({
  onRouteUpdate,
  pickup: propPickup,
  drop: propDrop,
  stops: propStops,
  hideControls,
  children,
  className = "",
  height = "400px",
  selectionMode,
  onSelectionModeChange,
}) => {
  const { isLoaded, loadError } = useGoogleMaps();

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);

  // Mode: 'pickup', 'drop', 'stop'
  // Internal state for legacy usage, or controlled state for unified interface
  const [internalMode, setInternalMode] = useState<
    "pickup" | "drop" | "stop" | null
  >(null);
  const mode = selectionMode !== undefined ? selectionMode : internalMode;

  const handleModeChange = useCallback(
    (newMode: "pickup" | "drop" | "stop" | null) => {
      if (onSelectionModeChange) {
        onSelectionModeChange(newMode);
      } else {
        setInternalMode(newMode);
      }
    },
    [onSelectionModeChange],
  );

  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
  } | null>(null);

  // Local state synced with props    `
  const [pickup, setPickup] = useState<Coordinate | null>(propPickup || null);
  const [drop, setDrop] = useState<Coordinate | null>(propDrop || null);
  const [stops, setStops] = useState<Coordinate[]>(propStops || []);

  // Use refs to track current values so prop-sync effects can compare without
  // listing internal state as a dependency (which would create infinite loops).
  const pickupRef = React.useRef(pickup);
  pickupRef.current = pickup;
  const dropRef = React.useRef(drop);
  dropRef.current = drop;
  const stopsRef = React.useRef(stops);
  stopsRef.current = stops;

  // Sync Props to State — only update if the address/content actually changed
  // to prevent the feedback loop: map-click → onRouteUpdate → parent setState
  // → new prop object (same address) → prop-sync → setPickup → re-render loop
  useEffect(() => {
    if (propPickup !== undefined && propPickup?.address !== pickupRef.current?.address) {
      setPickup(propPickup);
    }
  }, [propPickup]);

  useEffect(() => {
    if (propDrop !== undefined && propDrop?.address !== dropRef.current?.address) {
      setDrop(propDrop);
    }
  }, [propDrop]);

  useEffect(() => {
    if (propStops !== undefined) {
      const prevAddrs = stopsRef.current.map(s => s.address).join("|");
      const nextAddrs = propStops.map(s => s.address).join("|");
      if (nextAddrs !== prevAddrs) setStops(propStops);
    }
  }, [propStops]);

  // Calculate Route
  useEffect(() => {
    const fetchRoute = async () => {
      if (isLoaded && pickup && drop) {
        try {
          const data = await calculateRoute(pickup, drop, stops);
          if (data && data.geometry) {
            const path = data.geometry.coordinates.map((c: number[]) => ({
              lat: c[1],
              lng: c[0],
            }));
            setRoutePath(path);
            setRouteInfo({
              distance: data.distanceKm,
              duration: data.durationMin,
            });

            onRouteUpdate({
              pickup,
              drop,
              stops,
              distanceKm: data.distanceKm,
              durationMin: data.durationMin,
            });
          }
        } catch (e) {
          console.error("Route calculation failed", e);
        }
      } else {
        setRoutePath([]);
        setRouteInfo(null);
        if (pickup || drop) {
          onRouteUpdate({ pickup, drop, stops });
        }
      }
    };

    const timer = setTimeout(fetchRoute, 500);
    return () => clearTimeout(timer);
  }, [isLoaded, pickup, drop, stops]);

  // Auto-center and zoom map
  useEffect(() => {
    if (!map || !window.google) return;

    let hasPoints = false;
    const bounds = new window.google.maps.LatLngBounds();

    if (pickup) {
      bounds.extend(new window.google.maps.LatLng(pickup.lat, pickup.lng));
      hasPoints = true;
    }

    if (drop) {
      bounds.extend(new window.google.maps.LatLng(drop.lat, drop.lng));
      hasPoints = true;
    }

    if (stops && stops.length > 0) {
      stops.forEach((s) => {
        if (s) {
          bounds.extend(new window.google.maps.LatLng(s.lat, s.lng));
          hasPoints = true;
        }
      });
    }

    if (routePath && routePath.length > 0) {
      routePath.forEach((p) => {
        if (p) bounds.extend(new window.google.maps.LatLng(p.lat, p.lng));
      });
      hasPoints = true;
    }

    if (hasPoints) {
      map.fitBounds(bounds);

      // Limit zoom if only one point is selected (e.g. just pickup)
      if (
        !drop &&
        stops.length === 0 &&
        (!routePath || routePath.length === 0)
      ) {
        // Wait for map to settle before setting zoom
        window.google.maps.event.addListenerOnce(map, "bounds_changed", () => {
          if (map.getZoom() && map.getZoom()! > 15) {
            map.setZoom(15);
          }
        });
      } else {
        // Add some padding to bounds
        window.google.maps.event.addListenerOnce(map, "bounds_changed", () => {
          if (map.getZoom() && map.getZoom()! > 18) {
            map.setZoom(18); // Prevent getting *too* close on small routes
          }
        });
      }
    }
  }, [map, pickup, drop, stops, routePath]);
  // Note: stops as dependency might trigger loop if array ref changes.
  // Ideally use deep compare or ref for deps. But props usually stable if from straight state.

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!mode || !e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    // Reverse Geocode
    const geocoder = new google.maps.Geocoder();
    let address = "Selected Location";

    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results[0]) {
        address = response.results[0].formatted_address;
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    }

    const newCoord = { lat, lng, address };

    if (mode === "pickup") {
      setPickup(newCoord);
      handleModeChange(null);
      // Parent update happens in useEffect
    } else if (mode === "drop") {
      setDrop(newCoord);
      handleModeChange(null);
    } else if (mode === "stop") {
      const newStops = [...stops, newCoord];
      setStops(newStops);
      handleModeChange(null);
    }
  };

  const handleLiveLocation = () => {
    if (navigator.geolocation && isLoaded) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        const geocoder = new google.maps.Geocoder();
        let address = "My Location";
        try {
          const response = await geocoder.geocode({
            location: { lat: latitude, lng: longitude },
          });
          if (response.results[0])
            address = response.results[0].formatted_address;
        } catch (e) {}

        setPickup({ lat: latitude, lng: longitude, address });
      });
    }
  };

  const containerStyle = useMemo(() => ({ width: "100%", height }), [height]);

  if (loadError) {
    return (
      <div
        className={`h-[400px] w-full bg-red-50 border border-red-200 rounded-xl flex flex-col items-center justify-center text-red-500 p-6 text-center space-y-2 ${className}`}
      >
        <div className="bg-red-100 p-3 rounded-full">
          <X size={24} />
        </div>
        <h3 className="font-bold text-lg text-red-700">Map Error</h3>
        <p className="text-sm text-red-600 max-w-xs">
          Failed to load Google Maps API. Please check your internet connection
          or API key configuration.
        </p>
        <p className="text-xs font-mono bg-white px-2 py-1 rounded border border-red-100 text-slate-500 mt-2">
          {loadError.message}
        </p>
      </div>
    );
  }

  return isLoaded ? (
    <div
      className={`relative rounded-xl overflow-hidden border border-slate-300 shadow-inner ${className}`}
      style={{ height }}
    >
      {/* Controls Bar (Legacy/Internal) */}
      {!hideControls && (
        <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-50 p-4 border-b border-slate-200">
          <div className="flex-1 space-y-2">
            <div className="space-y-2 text-sm">
              {/* Pickup Status */}
              <div
                className={`flex items-center justify-between p-2 rounded border ${mode === "pickup" ? "border-green-500 ring-1 ring-green-200" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="truncate">
                    {pickup ? pickup.address : "Pickup not set"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleLiveLocation()}
                    title="Use My Location"
                    className="p-1 hover:bg-slate-100 rounded text-blue-600"
                  >
                    <Navigation size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange("pickup")}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500"
                  >
                    <MapPin size={14} />
                  </button>
                </div>
              </div>

              {/* Stops */}
              {stops.map((stop, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded border border-slate-200 bg-white ml-4 border-l-2 border-l-yellow-400"
                >
                  <span className="truncate text-slate-600">
                    {stop.address}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStops(stops.filter((_, i) => i !== idx))}
                    className="p-1 hover:bg-red-50 text-red-500 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {/* Drop Status */}
              <div
                className={`flex items-center justify-between p-2 rounded border ${mode === "drop" ? "border-red-500 ring-1 ring-red-200" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="truncate">
                    {drop ? drop.address : "Drop not set"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleModeChange("drop")}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500"
                >
                  <MapPin size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-[140px]">
            <button
              type="button"
              onClick={() => handleModeChange("stop")}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${mode === "stop" ? "bg-yellow-50 border-yellow-400 text-yellow-700" : "bg-white border-slate-300 hover:bg-slate-50"}`}
            >
              <Plus size={16} /> Add Stop
            </button>

            {routeInfo && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
                  Estimated Trip
                </p>
                <div className="text-lg font-bold text-blue-900">
                  {routeInfo.distance.toFixed(1)} km
                </div>
                <div className="text-sm text-blue-700">
                  {Math.round(routeInfo.duration)} mins
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setPickup(null);
                setDrop(null);
                setStops([]);
                setRoutePath([]);
              }}
              className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-red-500 mt-auto"
            >
              <RotateCcw size={12} /> Reset Map
            </button>
          </div>
        </div>
      )}

      {/* Overlay Children (Unified Interface) */}
      {children && (
        <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none z-[10] p-4">
          {children}
        </div>
      )}

      {/* Map Click Indicator */}
      {mode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[20] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-blue-200 animate-bounce cursor-pointer pointer-events-none">
          <p className="text-sm font-bold text-blue-800 flex items-center gap-2">
            <MapPin size={16} />
            Click map to set {mode.toUpperCase()}
          </p>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={SRI_LANKA_CENTER}
        zoom={8}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={MAP_OPTIONS}
      >
        {/* Render Route Polyline */}
        {routePath.length > 0 && (
          <PolylineF
            path={routePath}
            options={{
              strokeColor: "#2563eb",
              strokeWeight: 5,
            }}
          />
        )}

        {/* Markers */}
        {pickup && (
          <MarkerF position={{ lat: pickup.lat, lng: pickup.lng }} label="P" />
        )}
        {drop && (
          <MarkerF position={{ lat: drop.lat, lng: drop.lng }} label="D" />
        )}
        {stops.map((s, idx) => (
          <MarkerF
            key={idx}
            position={{ lat: s.lat, lng: s.lng }}
            label={`S${idx + 1}`}
          />
        ))}
      </GoogleMap>
    </div>
  ) : (
    <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">
      Loading Google Maps...
    </div>
  );
};

export default GoogleRoutePlanner;
