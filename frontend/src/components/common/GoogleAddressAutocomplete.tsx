
import React, { useState, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Search } from 'lucide-react';
import { useGoogleMaps } from '../../context/GoogleMapsContext';


interface GoogleAddressAutocompleteProps {
    value?: string;
    onChange: (val: string) => void;
    onSelect: (result: { lat: number, lng: number, address: string }) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
}

const GoogleAddressAutocomplete: React.FC<GoogleAddressAutocompleteProps> = ({
    value = '',
    onChange,
    onSelect,
    placeholder = "Search location...",
    className = "",
    required = false
}) => {
    const { isLoaded } = useGoogleMaps();

    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const [inputValue, setInputValue] = useState(value);

    // Sync internal state with prop
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
        setAutocomplete(autocompleteInstance);
    };

    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
                const address = place.formatted_address || place.name || '';
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();

                setInputValue(address);
                onChange(address);
                onSelect({ lat, lng, address });
            } else {
                console.warn("No geometry available for place:", place);
            }
        }
    };

    if (!isLoaded) {
        return (
            <div className={`relative ${className}`}>
                <input
                    type="text"
                    disabled
                    placeholder="Loading Maps..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
                />
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                <Autocomplete
                    onLoad={onLoad}
                    onPlaceChanged={onPlaceChanged}
                    restrictions={{ country: 'lk' }} // Restrict to Sri Lanka
                >
                    <input
                        type="text"
                        required={required}
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            onChange(e.target.value);
                        }}
                        placeholder={placeholder}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-white transition-all outline-none text-slate-700 placeholder-slate-400 shadow-sm"
                    />
                </Autocomplete>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
        </div>
    );
};

export default GoogleAddressAutocomplete;
