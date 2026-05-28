
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

interface LocationSearchProps {
    onLocationSelect: (result: any) => void;
}

// Ensure you have VITE_LOCATIONIQ_API_KEY in your frontend .env file
const API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY || '';

const LocationSearchIQ: React.FC<LocationSearchProps> = ({ onLocationSelect }) => {
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (!searchText || searchText.length < 3) {
                setSearchResults([]);
                return;
            }

            let results: any[] = [];

            // 1. Try LocationIQ if Key exists
            if (API_KEY) {
                try {
                    const url = `https://api.locationiq.com/v1/autocomplete?key=${API_KEY}&q=${encodeURIComponent(searchText)}&countrycodes=lk&limit=5`;
                    const res = await axios.get(url);
                    if (res.data) {
                        results = res.data.map((f: any) => ({
                            display_name: f.display_name,
                            lat: f.lat,
                            lon: f.lon,
                            place_id: f.place_id,
                            source: 'LocationIQ'
                        }));
                    }
                } catch (e) {
                    console.warn("LocationIQ failed, falling back to Photon", e);
                }
            }

            // 2. Fallback to Photon (OpenStreetMap) if no results yet
            if (results.length === 0) {
                try {
                    const lk_bbox = '79.5,5.8,82.0,10.0';
                    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchText)}&bbox=${lk_bbox}&limit=5`;
                    const res = await axios.get(url);
                    if (res.data && res.data.features) {
                        results = res.data.features.map((f: any) => ({
                            display_name: `${f.properties.name || ''} ${f.properties.street || ''}, ${f.properties.city || f.properties.district || ''}`,
                            lat: f.geometry.coordinates[1],
                            lon: f.geometry.coordinates[0],
                            place_id: f.properties.osm_id,
                            source: 'Photon'
                        }));
                    }
                } catch (e) {
                    console.error("Photon search failed", e);
                }
            }

            setSearchResults(results);
        }, 1000); // 1s debounce

        return () => clearTimeout(delayDebounceFn);
    }, [searchText]);

    const handleSelect = (res: any) => {
        onLocationSelect(res);
        setSearchResults([]);
        setSearchText('');
    };

    return (
        <div className="relative">
            <input
                type="text"
                placeholder="Search location..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            {
                searchResults.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                        {searchResults.map((res: any) => (
                            <li key={res.place_id} onClick={() => handleSelect(res)} className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-xs">
                                {res.display_name}
                            </li>
                        ))}
                    </ul>
                )
            }
        </div >
    );
};

export default LocationSearchIQ;
