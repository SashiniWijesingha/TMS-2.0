import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, MapPin } from 'lucide-react';
import { COMMON_LOCATIONS } from '../../data/commonLocations';

interface AddressAutocompleteProps {
    value: string;
    onChange: (val: string) => void;
    onSelect: (result: { lat: number, lng: number, address: string }) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
}

// Check for API Key
const API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY || '';

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
    value,
    onChange,
    onSelect,
    placeholder = "Search location...",
    className = "",
    required = false
}) => {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close suggestions if clicked outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (!value || value.length < 3) {
                setSuggestions([]);
                return;
            }

            try {
                // 0. Local Common Locations
                const lowerVal = value.toLowerCase();
                const localMatches = COMMON_LOCATIONS.filter(loc =>
                    loc.display_name.toLowerCase().includes(lowerVal)
                );

                const promises = [];

                // 1. LocationIQ
                if (API_KEY) {
                    const url = `https://api.locationiq.com/v1/autocomplete?key=${API_KEY}&q=${encodeURIComponent(value)}&countrycodes=lk&limit=5`;
                    promises.push(
                        axios.get(url).then(res => res.data.map((f: any) => ({
                            display_name: f.display_name,
                            lat: parseFloat(f.lat),
                            lng: parseFloat(f.lon),
                            id: f.place_id,
                            source: 'LocationIQ'
                        }))).catch(() => [])
                    );
                }

                // 2. Nominatim (OpenStreetMap) - High detail, strict rate limit (we rely on debounce)
                const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=lk&limit=5&addressdetails=1`;
                promises.push(
                    axios.get(nominatimUrl).then(res => res.data.map((f: any) => ({
                        display_name: f.display_name,
                        lat: parseFloat(f.lat),
                        lng: parseFloat(f.lon),
                        id: f.place_id,
                        source: 'OpenStreetMap'
                    }))).catch(() => [])
                );

                // 3. Photon (OpenStreetMap based, good for types of places)
                // Expanded BBox for safety
                const lk_bbox = '79.0,5.8,82.5,10.0';
                const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&bbox=${lk_bbox}&limit=5`;
                promises.push(
                    axios.get(photonUrl).then(res => {
                        if (res.data && res.data.features) {
                            return res.data.features.map((f: any) => ({
                                display_name: `${f.properties.name || ''} ${f.properties.street || ''}, ${f.properties.city || f.properties.district || ''}`.trim() || f.properties.formatted || 'Unknown Location',
                                lat: f.geometry.coordinates[1],
                                lng: f.geometry.coordinates[0],
                                id: f.properties.osm_id,
                                source: 'Photon'
                            }));
                        }
                        return [];
                    }).catch(() => [])
                );

                // Execute all
                const resultsSettled = await Promise.allSettled(promises);
                let combinedResults: any[] = [...localMatches]; // Start with local matches

                resultsSettled.forEach(res => {
                    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                        combinedResults = [...combinedResults, ...res.value];
                    }
                });

                // Deduplicate based on very close coordinates (approx 100m)
                const uniqueResults: any[] = [];
                const seenCoords = new Set();

                for (const item of combinedResults) {
                    const key = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
                    if (!seenCoords.has(key)) {
                        seenCoords.add(key);
                        uniqueResults.push(item);
                    }
                }

                // If no results, or even if there are, add a "help" item at the bottom?
                // Actually, let's just show more results first.
                setSuggestions(uniqueResults.slice(0, 15)); // Show top 15 matches
                setIsOpen(uniqueResults.length > 0);

            } catch (e) {
                console.error("Autocomplete error", e);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [value]);

    const handleItemClick = (item: any) => {
        // Update input text to the full address
        onChange(item.display_name);
        // Trigger selection
        onSelect({
            lat: item.lat,
            lng: item.lng,
            address: item.display_name
        });
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    required={required}
                    value={value}
                    onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-white transition-all outline-none text-slate-700 placeholder-slate-400 shadow-sm"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>

            {isOpen && suggestions.length > 0 && (
                <ul className="absolute z-[2000] w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
                    {suggestions.map((item, idx) => (
                        <li
                            key={`${item.id}-${idx}`}
                            onClick={() => handleItemClick(item)}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0 flex items-start gap-3 transition-colors"
                        >
                            <MapPin className="text-slate-400 mt-0.5 flex-shrink-0" size={16} />
                            <div className="flex-1">
                                <span className="break-words leading-snug">{item.display_name}</span>
                            </div>
                            {item.source === 'Company Location' && (
                                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex-shrink-0">
                                    Office
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AddressAutocomplete;
