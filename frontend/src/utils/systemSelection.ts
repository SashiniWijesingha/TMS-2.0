export type SystemSelection = 'PASSENGER' | 'MATERIAL';

const STORAGE_KEY = 'tms_system_selection';

export const getStoredSystemSelection = (): SystemSelection | null => {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'PASSENGER' || value === 'MATERIAL') {
        return value;
    }
    return null;
};

export const setStoredSystemSelection = (selection: SystemSelection) => {
    localStorage.setItem(STORAGE_KEY, selection);
};

export const getNewRequestPath = () => '/passenger-selection';
