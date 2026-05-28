
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

interface LocationSearchProps {
    onLocationSelect: (result: any) => void;
}

const LocationSearch: React.FC<LocationSearchProps> = ({ onLocationSelect }) => {
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (!searchText || searchText.length < 3) {
                setSearchResults([]);
                return;
            }

            try {
                // Using Photon (Komoot) API for autocomplete
                // bias to Sri Lanka Approx Center + Bounding Box (bbox)
                // bbox format: min_lon,min_lat,max_lon,max_lat
                const lk_bbox = '79.5,5.8,82.0,10.0';
                const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchText)}&bbox=${lk_bbox}&lat=7.87&lon=80.77&limit=5`;
                const res = await axios.get(url);

                if (res.data && res.data.features) {
                    setSearchResults(res.data.features.map((f: any) => ({
                        display_name: `${f.properties.name}, ${f.properties.city || f.properties.state || f.properties.country || ''}`,
                        lat: f.geometry.coordinates[1],
                        lon: f.geometry.coordinates[0],
                        place_id: f.properties.osm_id
                    })));
                }
            } catch (e) {
                console.error("Search error", e);
            }
        }, 1000);

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
            {searchResults.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                    {searchResults.map((res: any) => (
                        <li key={res.place_id} onClick={() => handleSelect(res)} className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-xs">
                            {res.display_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LocationSearch;
