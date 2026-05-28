import React, { createContext, useContext } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

// ── SINGLE shared libraries array ─────────────────────────────────────────────
// Must be stable (module-level constant) so useJsApiLoader never sees a new
// reference between renders, which would cause it to reload the script.
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

interface GoogleMapsContextValue {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  loadError: undefined,
});

/**
 * Wrap your app (or at least the subtree that uses Google Maps) with this
 * provider.  It calls useJsApiLoader EXACTLY ONCE, then makes the result
 * available to every child component via useGoogleMaps().
 */
export const GoogleMapsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

/**
 * Consume the shared Google Maps load state inside any component.
 * Replaces the per-component useJsApiLoader() calls that caused conflicts.
 */
export const useGoogleMaps = (): GoogleMapsContextValue =>
  useContext(GoogleMapsContext);
