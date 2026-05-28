import { useEffect, useMemo, useState } from 'react';
import { useJsApiLoader, type Libraries } from '@react-google-maps/api';

const DEFAULT_LIBRARIES: Libraries = ['places', 'geometry'];

declare global {
    interface Window {
        gm_authFailure?: () => void;
    }
}

export const useGoogleMapsApi = (libraries: Libraries = DEFAULT_LIBRARIES) => {
    const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    useEffect(() => {
        const previousHandler = window.gm_authFailure;

        window.gm_authFailure = () => {
            setAuthErrorMessage(
                'Google Maps rejected this app origin. On mobile, this usually means the current phone URL or standalone PWA origin is not included in the API key referrer restrictions.',
            );

            previousHandler?.();
        };

        return () => {
            if (previousHandler) {
                window.gm_authFailure = previousHandler;
                return;
            }

            delete window.gm_authFailure;
        };
    }, []);

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries,
    });

    const effectiveError = useMemo(() => {
        if (!apiKey) {
            return new Error('Missing VITE_GOOGLE_MAPS_API_KEY.');
        }

        if (authErrorMessage) {
            return new Error(authErrorMessage);
        }

        return loadError ?? null;
    }, [apiKey, authErrorMessage, loadError]);

    return {
        isLoaded: Boolean(apiKey) && isLoaded && !effectiveError,
        loadError: effectiveError,
    };
};

export { DEFAULT_LIBRARIES };