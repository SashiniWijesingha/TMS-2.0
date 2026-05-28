
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Briefcase, Check, CheckCircle, Plus, Trash2, MapPin, Navigation, AlertTriangle, XCircle, TrendingUp, Rocket, Lock, Loader2, ArrowRight, Fingerprint } from 'lucide-react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import GoogleRoutePlanner from '../../components/common/GoogleRoutePlanner';
import GoogleAddressAutocomplete from '../../components/common/GoogleAddressAutocomplete';
import Combobox from '../../components/common/Combobox';
import TimeInput from '../../components/common/TimeInput';
import { getDivisions } from '../../services/userService';
import { getVehicleTypes } from '../../services/vehicleService';
import type { RequestFormProps } from '../../types';
import { ProjectStatus, LOW_BUDGET_THRESHOLD } from '../../types';
import {
    type SubmissionRule,
    formatTime12h,
    getRuleForDate,
    parseDateInput,
    timeToMinutes,
} from '../../utils/submissionWindow';

interface Coordinate {
    lat: number;
    lng: number;
    address: string;
}

const VEHICLE_SPECIFICATIONS: Record<string, string[]> = {
    'Car': ['Sedan', 'Hatchback', 'SUV', 'Crossover', 'Wagon'],
    'Van': ['High Roof', 'Flat Roof', 'Mini Van', '12 Seater', '15 Seater'],
    'Bus': ['AC - 29 Seater', 'Non-AC - 29 Seater', 'AC - 40 Seater', 'Non-AC - 40 Seater', 'Luxury'],
    'Double Cab': ['4WD', '2WD', 'Standard', 'Luxury'],
    'Cab': ['4WD', '2WD'],
    'default': ['Standard', 'AC', 'Non-AC']
};

const GL_OPTIONS = [
    { code: '5250000110', name: 'Travelling and Transport' },
    { code: '5390000450', name: 'Admin Transport Charges' },
];

const PassengerForm = ({ initialData, isEditMode, subType, serviceCategory, onSubmit }: RequestFormProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
    const [submissionRules, setSubmissionRules] = useState<SubmissionRule[]>([]);

    // New State for Coordinates
    const [pickupCoords, setPickupCoords] = useState<Coordinate | null>(null);
    const [dropCoords, setDropCoords] = useState<Coordinate | null>(null);
    const [stopsCoords, setStopsCoords] = useState<(Coordinate | null)[]>([]);

    // State for Unified Interface

    const [selectionMode, setSelectionMode] = useState<'pickup' | 'drop' | 'stop' | null>(null);

    // WBS / project lookup state
    const [wbsFetching, setWbsFetching] = useState(false);
    const [wbsError, setWbsError] = useState('');
    const [projectDbStatus, setProjectDbStatus] = useState('');

    // WBS / Project Name autocomplete state
    const [wbsSuggestions, setWbsSuggestions] = useState<{ wbs_element: string; name: string; available_budget: string; status: string }[]>([]);
    const [projectNameSuggestions, setProjectNameSuggestions] = useState<{ wbs_element: string; name: string; available_budget: string; status: string }[]>([]);
    const [showWbsDropdown, setShowWbsDropdown] = useState(false);
    const [showProjectNameDropdown, setShowProjectNameDropdown] = useState(false);
    const [selectedProjectIdentity, setSelectedProjectIdentity] = useState<{ job_number: string; project_name: string } | null>(null);
    const [projectTamperError, setProjectTamperError] = useState('');

    // Cost centre lookup state
    const [costCentreFetching, setCostCentreFetching] = useState(false);
    const [costCentreNameError, setCostCentreNameError] = useState('');
    const [costCentreIdError, setCostCentreIdError] = useState('');
    const [costCentreNameSuggestions, setCostCentreNameSuggestions] = useState<{ cost_id: string; name: string }[]>([]);
    const [costCentreIdSuggestions, setCostCentreIdSuggestions] = useState<{ cost_id: string; name: string }[]>([]);
    const [showNameDropdown, setShowNameDropdown] = useState(false);
    const [showIdDropdown, setShowIdDropdown] = useState(false);

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        const address = results[0].formatted_address;
                        setPickupCoords({ lat: latitude, lng: longitude, address });
                        setFormData((prev: any) => ({ ...prev, pickup_location: address }));
                    }
                });
            });
        }
    };

    const normalizeProjectField = (value: string) => value.trim().toLowerCase();

    const lockFetchedProject = (jobNumber: string, projectName: string) => {
        setSelectedProjectIdentity({
            job_number: jobNumber,
            project_name: projectName,
        });
        setProjectTamperError('');
    };

    const clearFetchedProjectLock = (message: string) => {
        setSelectedProjectIdentity(null);
        setProjectTamperError(message);
        setProjectDbStatus('');
        setFormData((prev: any) => ({
            ...prev,
            project_budget: '',
            budget_confirmed: false,
        }));
    };


    useEffect(() => {
        const fetchData = async () => {
            try {
                const [divisionsData, typesData] = await Promise.all([
                    getDivisions(),
                    getVehicleTypes()
                ]);
                setDivisions(divisionsData);

                // Filter and map to ensure only Car, Van, and Double Cab are shown
                const requiredTypes = ['Car', 'Van', 'Double Cab'];
                const normalizedTypes = typesData.map((t: any) => ({
                    ...t,
                    name: t.name === 'Cab' ? 'Double Cab' : t.name // Handle Cab -> Double Cab alias
                }));

                const finalTypes = requiredTypes.map(name => {
                    const existing = normalizedTypes.find((t: any) => t.name.toLowerCase() === name.toLowerCase());
                    return existing || { id: name.toLowerCase().replace(/\s/g, '_'), name, attributes: [] };
                });

                setVehicleTypes(finalTypes);
            } catch (err) {
                console.error('Failed to load data', err);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchSubmissionRules = async () => {
            try {
                const response = await api.get('/submission-rules');
                setSubmissionRules(Array.isArray(response.data) ? response.data : []);
            } catch (err) {
                console.warn('Failed to load submission rules. Falling back to default window.', err);
            }
        };

        fetchSubmissionRules();
    }, []);

    useEffect(() => {
        if (isEditMode) return;

        const normalizeMobile = (raw: string): string => {
            let digits = (raw || '').replace(/\D/g, '');
            if (!digits) return '';
            if (digits.startsWith('94')) {
                digits = `0${digits.slice(2)}`;
            }
            return digits.slice(0, 10);
        };

        const prefillCurrentUserContact = async () => {
            try {
                const response = await api.get('/users/me/contact');
                const fetchedName = (response.data?.name || '').trim();
                const fetchedMobile = normalizeMobile(String(response.data?.mobile || ''));
                const fetchedEpfNo = (response.data?.epf_no || '').trim();

                setFormData((prev: any) => ({
                    ...prev,
                    contact_person_name: prev.contact_person_name || fetchedName,
                    contact_no: prev.contact_no || fetchedMobile,
                    epf_no: prev.epf_no || fetchedEpfNo,
                }));
            } catch (err) {
                console.warn('Unable to prefill current user contact details:', err);
            }
        };

        prefillCurrentUserContact();
    }, [isEditMode]);

    const [formData, setFormData] = useState(initialData || {
        date: '',
        time: '',
        no_of_days: 1,
        main_division: '',
        sub_division: '',
        job_number: '',
        project_name: '',
        cost_centre: '',
        cost_centre_id: '',
        gl_code: '',
        gl_name: '',
        service_category: serviceCategory || '',
        project_budget: '',
        budget_confirmed: false,
        project_status: ProjectStatus.ACTIVE as string,
        project_start_date: '',
        no_of_passengers: 1,
        contact_person_name: '',
        epf_no: '',
        contact_no: '',
        vehicle_type: '',
        specification: '',
        pickup_location: '',
        drop_location: '',
        return_trip: false,
        return_date: '',
        return_time: '',
        share_vehicle: false,
        sharing_remarks: '',
        reason: '',
        has_stops: false,
        stops: [],
        special_justification: '',
        passenger_list: []
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (name === 'contact_no') {
            const numericValue = value.replace(/\D/g, '').slice(0, 10);
            setFormData((prev: any) => ({
                ...prev,
                [name]: numericValue
            }));
            return;
        }

        if ((name === 'job_number' || name === 'project_name') && selectedProjectIdentity) {
            const nextJobNumber = name === 'job_number' ? value : formData.job_number;
            const nextProjectName = name === 'project_name' ? value : formData.project_name;
            const stillMatchesLockedProject =
                normalizeProjectField(nextJobNumber) === normalizeProjectField(selectedProjectIdentity.job_number) &&
                normalizeProjectField(nextProjectName) === normalizeProjectField(selectedProjectIdentity.project_name);

            if (!stillMatchesLockedProject) {
                clearFetchedProjectLock('Project details were changed after lookup. Please reselect the project suggestion.');
            }
        }

        if (name === 'vehicle_type') {
            // Clear all dynamic attribute fields from previous vehicle type
            const prevType = vehicleTypes.find((t: any) => t.name === formData.vehicle_type);
            const attrsToClear: Record<string, string> = {};
            if (prevType?.attributes) {
                prevType.attributes.forEach((attr: any) => { attrsToClear[attr.key] = ''; });
            }
            setFormData((prev: any) => ({ ...prev, ...attrsToClear, [name]: value, specification: '' }));
            return;
        }

        setFormData((prev: any) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const [minDate, setMinDate] = useState('');

    useEffect(() => {
        if (subType === 'ADHOC' || subType === 'SPECIAL') {
            setMinDate('');
            return;
        }

        const now = new Date();
        const todayRule = getRuleForDate(submissionRules, now);
        const currentMinutes = (now.getHours() * 60) + now.getMinutes();
        const cutoffMinutes = timeToMinutes(todayRule.end_time);

        // If today's window is closed or today's end-time has passed, move earliest date to tomorrow.
        const isPastCutoff = !todayRule.is_active || currentMinutes >= cutoffMinutes;

        const minD = new Date();
        if (isPastCutoff) {
            minD.setDate(minD.getDate() + 1);
        }

        const year = minD.getFullYear();
        const month = String(minD.getMonth() + 1).padStart(2, '0');
        const day = String(minD.getDate()).padStart(2, '0');
        const minStr = `${year}-${month}-${day}`;
        setMinDate(minStr);
    }, [subType, submissionRules]);

    useEffect(() => {
        if (minDate && formData.date && formData.date < minDate) {
            setFormData((prev: any) => ({ ...prev, date: minDate }));
        }
    }, [minDate, formData.date]);


    useEffect(() => {
        const count = parseInt(String(formData.no_of_passengers)) || 1;
        // if count > 1, we need extra passenger info.
        // We can treat index 0 as the main requestor or just add count-1 extra fields.
        const currentList = [...(formData.passenger_list || [])];
        const extraNeeded = count - 1;

        if (extraNeeded > 0) {
            if (currentList.length < extraNeeded) {
                // Add new empty passengers
                for (let i = currentList.length; i < extraNeeded; i++) {
                    currentList.push({ name: '', epf_no: '' });
                }
            } else if (currentList.length > extraNeeded) {
                // Remove extra ones if count decreased
                currentList.length = extraNeeded;
            }
            setFormData((prev: any) => ({ ...prev, passenger_list: currentList }));
        } else {
            setFormData((prev: any) => ({ ...prev, passenger_list: [] }));
        }
    }, [formData.no_of_passengers]);

    const handlePassengerListChange = (index: number, field: string, value: string) => {
        const newList = [...(formData.passenger_list || [])];
        newList[index] = { ...newList[index], [field]: value };
        setFormData((prev: any) => ({ ...prev, passenger_list: newList }));
    };

    const handleRouteUpdate = useCallback((data: {
        pickup: Coordinate | null;
        drop: Coordinate | null;
        stops: Coordinate[];
        distanceKm?: number;
    }) => {
        setFormData((prev: any) => {
            const currentStopsCount = prev.stops?.length || 0;
            const newStopsCount = data.stops?.length || 0;

            // Only update stops list if we gained a stop (Map Click) 
            // OR if counts match (just updating addresses for existing valid stops)
            // If new < current, it implies we have pending empty stops, so don't overwrite.
            let newStops = prev.stops;
            if (newStopsCount >= currentStopsCount) {
                newStops = data.stops.map(s => s.address);
            }

            return {
                ...prev,
                pickup_location: data.pickup?.address || prev.pickup_location,
                drop_location: data.drop?.address || prev.drop_location,
                stops: newStops,
                has_stops: newStops.length > 0,
                distance: data.distanceKm ? data.distanceKm.toString() : prev.distance
            };
        });

        // Only update coords if we aren't losing any (preserving null placeholders)
        if (data.stops?.length >= stopsCoords.length) {
            setStopsCoords(data.stops);
        }

        if (data.pickup) setPickupCoords(data.pickup);
        if (data.drop) setDropCoords(data.drop);
    }, [stopsCoords.length]);

    const handleAddStop = () => {
        setFormData((prev: any) => ({
            ...prev,
            stops: [...(prev.stops || []), ''], // Add empty string for new stop
            has_stops: true
        }));
        setStopsCoords(prev => [...prev, null]);
    };

    const handleRemoveStop = (index: number) => {
        setFormData((prev: any) => {
            const newStops = [...(prev.stops || [])];
            newStops.splice(index, 1);
            return {
                ...prev,
                stops: newStops,
                has_stops: newStops.length > 0
            };
        });
        setStopsCoords(prev => {
            const newCoords = [...prev];
            newCoords.splice(index, 1);
            return newCoords;
        });
    };

    const handleStopChange = (index: number, value: string) => {
        setFormData((prev: any) => {
            const newStops = [...(prev.stops || [])];
            newStops[index] = value;
            return { ...prev, stops: newStops };
        });
    };

    const handleStopSelect = (index: number, coords: { lat: number, lng: number, address: string }) => {
        setFormData((prev: any) => {
            const newStops = [...(prev.stops || [])];
            newStops[index] = coords.address;
            return { ...prev, stops: newStops };
        });
        setStopsCoords(prev => {
            const newCoords = [...prev];
            newCoords[index] = { lat: coords.lat, lng: coords.lng, address: coords.address };
            return newCoords;
        });
    };

    const handleAttributeChange = (key: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleWBSBlur = async () => {
        const wbs = (formData.job_number || '').trim();
        if (!wbs || isNonJobCategory) return;
        setWbsFetching(true);
        setWbsError('');
        try {
            const response = await api.get(`/projects/lookup?wbs=${encodeURIComponent(wbs)}`);
            const { available_budget, status, name } = response.data;
            // Strip any comma thousands-separators before parsing (e.g. "17,141.98" → 17141.98)
            const budget = parseFloat(String(available_budget).replace(/,/g, '')) || 0;
            const isReleased = status === 'RELE';
            setProjectDbStatus(status || '');
            setFormData((prev: any) => ({
                ...prev,
                project_name: name || prev.project_name,
                project_budget: budget.toString(),
                // Both conditions must be met: released project AND positive budget
                budget_confirmed: budget > 0 && isReleased,
                project_status: ProjectStatus.ACTIVE
            }));
            lockFetchedProject(wbs, name || '');
        } catch (err: any) {
            if (err.response?.status === 404) {
                setWbsError('No project found for this WBS element.');
            } else {
                setWbsError('Failed to fetch project details.');
            }
            clearFetchedProjectLock('');
            setFormData((prev: any) => ({
                ...prev,
                project_status: ProjectStatus.ACTIVE
            }));
        } finally {
            setWbsFetching(false);
        }
    };

    /**
     * Search projects by WBS with autocomplete and timeout handling (15s graceful)
     */
    const handleWBSChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        handleChange(e);
        setWbsError('');

        if (wbsSearchDebounceRef.current) clearTimeout(wbsSearchDebounceRef.current);
        
        // If value is less than 3 characters, clear suggestions
        if (value.trim().length < 3) {
            setWbsSuggestions([]);
            setShowWbsDropdown(false);
            return;
        }

        wbsSearchDebounceRef.current = setTimeout(async () => {
            try {
                // Cancel previous request if still pending
                if (wbsSearchAbortRef.current) {
                    wbsSearchAbortRef.current.abort();
                }
                wbsSearchAbortRef.current = new AbortController();

                // Set a 15-second timeout
                const timeoutId = setTimeout(() => {
                    wbsSearchAbortRef.current?.abort();
                }, 15000);

                const res = await api.get(`/projects/search?q=${encodeURIComponent(value.trim())}`, {
                    signal: wbsSearchAbortRef.current.signal
                });
                
                clearTimeout(timeoutId);
                setWbsSuggestions(res.data || []);
                setShowWbsDropdown((res.data || []).length > 0);
            } catch (error: any) {
                // Graceful handling: timeout or abort errors don't show error message
                if (error?.name === 'AbortError' || error?.code === 'ECONNABORTED') {
                    console.warn('WBS search request timed out or was cancelled');
                } else {
                    console.error('WBS search failed:', error);
                }
                setWbsSuggestions([]);
                setShowWbsDropdown(false);
            }
        }, 300); // 300ms debounce
    };

    /**
     * Search projects by Project Name with autocomplete and timeout handling (15s graceful)
     */
    const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        handleChange(e);
        setWbsError('');

        if (projectNameSearchDebounceRef.current) clearTimeout(projectNameSearchDebounceRef.current);

        // If value is less than 3 characters, clear suggestions
        if (value.trim().length < 3) {
            setProjectNameSuggestions([]);
            setShowProjectNameDropdown(false);
            return;
        }

        projectNameSearchDebounceRef.current = setTimeout(async () => {
            try {
                // Cancel previous request if still pending
                if (projectNameSearchAbortRef.current) {
                    projectNameSearchAbortRef.current.abort();
                }
                projectNameSearchAbortRef.current = new AbortController();

                // Set a 15-second timeout
                const timeoutId = setTimeout(() => {
                    projectNameSearchAbortRef.current?.abort();
                }, 15000);

                const res = await api.get(`/projects/search?q=${encodeURIComponent(value.trim())}`, {
                    signal: projectNameSearchAbortRef.current.signal
                });
                
                clearTimeout(timeoutId);
                setProjectNameSuggestions(res.data || []);
                setShowProjectNameDropdown((res.data || []).length > 0);
            } catch (error: any) {
                // Graceful handling: timeout or abort errors don't show error message
                if (error?.name === 'AbortError' || error?.code === 'ECONNABORTED') {
                    console.warn('Project name search request timed out or was cancelled');
                } else {
                    console.error('Project name search failed:', error);
                }
                setProjectNameSuggestions([]);
                setShowProjectNameDropdown(false);
            }
        }, 300); // 300ms debounce
    };

    /**
     * Select a project from WBS suggestions and auto-fetch details
     */
    const selectProjectFromWbsSuggestion = async (item: { wbs_element: string; name: string; available_budget: string; status: string }) => {
        setFormData((prev: any) => ({
            ...prev,
            job_number: item.wbs_element,
            project_name: item.name
        }));
        setWbsSuggestions([]);
        setShowWbsDropdown(false);
        setWbsError('');

        // Auto-fetch project details
        try {
            const budget = parseFloat(item.available_budget) || 0;
            const isReleased = item.status === 'RELE';
            setProjectDbStatus(item.status || '');
            setFormData((prev: any) => ({
                ...prev,
                job_number: item.wbs_element,
                project_name: item.name,
                project_budget: budget.toString(),
                budget_confirmed: budget > 0 && isReleased,
                project_status: ProjectStatus.ACTIVE
            }));
            lockFetchedProject(item.wbs_element, item.name);
        } catch (error) {
            console.error('Error selecting WBS suggestion:', error);
        }
    };

    /**
     * Select a project from Project Name suggestions and auto-fetch details
     */
    const selectProjectFromNameSuggestion = async (item: { wbs_element: string; name: string; available_budget: string; status: string }) => {
        setFormData((prev: any) => ({
            ...prev,
            job_number: item.wbs_element,
            project_name: item.name
        }));
        setProjectNameSuggestions([]);
        setShowProjectNameDropdown(false);
        setWbsError('');

        // Auto-fetch project details
        try {
            const budget = parseFloat(item.available_budget) || 0;
            const isReleased = item.status === 'RELE';
            setProjectDbStatus(item.status || '');
            setFormData((prev: any) => ({
                ...prev,
                job_number: item.wbs_element,
                project_name: item.name,
                project_budget: budget.toString(),
                budget_confirmed: budget > 0 && isReleased,
                project_status: ProjectStatus.ACTIVE
            }));
            lockFetchedProject(item.wbs_element, item.name);
        } catch (error) {
            console.error('Error selecting project name suggestion:', error);
        }
    };

    // Debounce ref for cost centre search
    const ccNameDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const ccIdDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce refs for WBS and Project Name search
    const wbsSearchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const projectNameSearchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Timeout controllers for graceful failure
    const wbsSearchAbortRef = React.useRef<AbortController | null>(null);
    const projectNameSearchAbortRef = React.useRef<AbortController | null>(null);

    // Refs for click-outside detection
    const wbsInputRef = React.useRef<HTMLDivElement>(null);
    const projectNameInputRef = React.useRef<HTMLDivElement>(null);

    // Click-outside handler to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            
            // Close WBS dropdown if click is outside
            if (wbsInputRef.current && !wbsInputRef.current.contains(target)) {
                setShowWbsDropdown(false);
            }
            
            // Close Project Name dropdown if click is outside
            if (projectNameInputRef.current && !projectNameInputRef.current.contains(target)) {
                setShowProjectNameDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleCostCentreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        handleChange(e);
        setCostCentreNameError('');
        if (ccNameDebounceRef.current) clearTimeout(ccNameDebounceRef.current);
        if (!value.trim()) { setCostCentreNameSuggestions([]); setShowNameDropdown(false); return; }
        ccNameDebounceRef.current = setTimeout(async () => {
            try {
                const res = await api.get(`/cost-centres/search?q=${encodeURIComponent(value.trim())}&field=name`);
                setCostCentreNameSuggestions(res.data || []);
                setShowNameDropdown((res.data || []).length > 0);
            } catch { setCostCentreNameSuggestions([]); }
        }, 300);
    };

    const handleCostCentreIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        handleChange(e);
        setCostCentreIdError('');
        if (ccIdDebounceRef.current) clearTimeout(ccIdDebounceRef.current);
        if (!value.trim()) { setCostCentreIdSuggestions([]); setShowIdDropdown(false); return; }
        ccIdDebounceRef.current = setTimeout(async () => {
            try {
                const res = await api.get(`/cost-centres/search?q=${encodeURIComponent(value.trim())}&field=id`);
                setCostCentreIdSuggestions(res.data || []);
                setShowIdDropdown((res.data || []).length > 0);
            } catch { setCostCentreIdSuggestions([]); }
        }, 300);
    };

    const selectCostCentreSuggestion = (item: { cost_id: string; name: string }) => {
        setFormData((prev: any) => ({ ...prev, cost_centre: item.name, cost_centre_id: item.cost_id }));
        setCostCentreNameSuggestions([]);
        setCostCentreIdSuggestions([]);
        setShowNameDropdown(false);
        setShowIdDropdown(false);
        setCostCentreNameError('');
        setCostCentreIdError('');
    };

    const handleCostCentreBlur = async () => {
        // Small delay so a click on a suggestion registers before blur clears it
        setTimeout(async () => {
            setShowNameDropdown(false);
            const name = (formData.cost_centre || '').trim();
            if (!name) return;
            setCostCentreFetching(true);
            try {
                const response = await api.get(`/cost-centres/lookup?name=${encodeURIComponent(name)}`);
                const { cost_id } = response.data;
                setFormData((prev: any) => ({ ...prev, cost_centre_id: cost_id }));
                setCostCentreNameError('');
            } catch (err: any) {
                if (err.response?.status === 404) setCostCentreNameError('No matching cost centre found.');
            } finally {
                setCostCentreFetching(false);
            }
        }, 150);
    };

    const handleCostCentreIdBlur = async () => {
        setTimeout(async () => {
            setShowIdDropdown(false);
            const costId = (formData.cost_centre_id || '').trim();
            if (!costId) return;
            setCostCentreFetching(true);
            try {
                const response = await api.get(`/cost-centres/lookup?cost_id=${encodeURIComponent(costId)}`);
                const { name } = response.data;
                setFormData((prev: any) => ({ ...prev, cost_centre: name }));
                setCostCentreIdError('');
            } catch (err: any) {
                if (err.response?.status === 404) setCostCentreIdError('No matching cost centre ID found.');
            } finally {
                setCostCentreFetching(false);
            }
        }, 150);
    };

    const [sharedSuggestions, setSharedSuggestions] = useState<any[]>([]);

    useEffect(() => {
        const fetchSharedVehicles = async () => {
            if (pickupCoords && dropCoords && formData.date && formData.time && !isEditMode) {
                try {
                    const res = await api.get('/requests/shared-vehicles', {
                        params: {
                            date: formData.date,
                            time: formData.time,
                            pickup_lat: pickupCoords.lat,
                            pickup_lng: pickupCoords.lng,
                            drop_lat: dropCoords.lat,
                            drop_lng: dropCoords.lng,
                            passengers: formData.no_of_passengers
                        }
                    });
                    setSharedSuggestions(res.data);
                } catch (err) {
                    console.error("Failed to fetch shared vehicles", err);
                }
            }
        };

        const timer = setTimeout(fetchSharedVehicles, 800);
        return () => clearTimeout(timer);
    }, [pickupCoords, dropCoords, formData.date, formData.time, formData.no_of_passengers, isEditMode]);

    const handleSelectSharedVehicle = (match: any) => {
        setFormData((prev: any) => ({
            ...prev,
            trip_id: match.tripId, // Store specific trip ID
            share_vehicle: true,
            sharing_remarks: `[Shared Request] Preferred overlap with Trip #${match.tripId} (Vehicle: ${match.vehicleNumber}). ${prev.sharing_remarks || ''}`.trim()
        }));
    };

    const renderSharedSuggestions = () => {
        if (!sharedSuggestions || sharedSuggestions.length === 0) return null;

        return (
            <div className="bg-[#FF5F1F]/5 border border-[#FF5F1F]/10 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <Users size={16} className="text-[#FF5F1F]" />
                        Available Shared Rides
                    </h4>
                    <span className="text-[10px] font-black bg-orange-100 text-[#FF5F1F] px-2 py-0.5 rounded-full uppercase tracking-widest border border-orange-200 shadow-sm">
                        Eco Optimized
                    </span>
                </div>

                <div className="space-y-3">
                    {sharedSuggestions.map((match: any, idx: number) => (
                        <div
                            key={idx}
                            onClick={() => handleSelectSharedVehicle(match)}
                            className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-[#FF5F1F] transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-orange-50/0 group-hover:bg-orange-50/30 transition-colors" />
                            <div className="relative flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-slate-900 text-sm">{match.vehicleNumber}</span>
                                        <div className="h-4 w-[1px] bg-slate-200" />
                                        <span className="text-xs font-semibold text-slate-500">{match.vehicleType}</span>
                                        <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-md font-black flex items-center gap-1 uppercase tracking-tight">
                                            <Users size={10} /> {match.availableSeats} SEATS
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        MATCH SCORE: <span className="text-[#FF5F1F] font-black">{match.routeMatchScore}%</span> • TRIP ID: {match.tripId}
                                    </p>
                                </div>
                                <div className="h-9 w-9 rounded-xl bg-orange-50 text-[#FF5F1F] flex items-center justify-center group-hover:bg-[#FF5F1F] group-hover:text-white transition-all shadow-sm">
                                    <CheckCircle size={18} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-start gap-2.5 p-3.5 bg-orange-50/50 rounded-xl border border-orange-100">
                    <CheckCircle size={14} className="text-[#FF5F1F] mt-0.5 shrink-0" />
                    <p className="text-[10px] font-bold text-orange-900/70 leading-relaxed uppercase tracking-tight">
                        Matching a ride optimizes organizational fleet efficiency. Final allocation is subject to coordinator verification.
                    </p>
                </div>
            </div>
        );
    };

    const selectedVehicleType = vehicleTypes.find(t => t.name === formData.vehicle_type);

    const isNonJobCategory = ['PROSPECTIVE', 'SALES_PROMOTIONS', 'GENERAL_PURPOSE', 'TENDER_SUMMATION'].includes(serviceCategory || '');
    const isCostCentreRequired = isNonJobCategory;

    // ─── Project Status / Budget Derived State ────────────────────────────────────
    const budget = parseFloat(formData.project_budget) || 0;
    const projectStatus = formData.project_status as ProjectStatus;
    const isProjectBlocked =
        projectStatus === ProjectStatus.CLOSED ||
        projectStatus === ProjectStatus.COMPLETED;
    const isBudgetInsufficient = !isNonJobCategory && budget <= 0;
    const isTakeOff = projectStatus === ProjectStatus.TAKE_OFF;
    const isTakeOffStartDatePending =
        isTakeOff &&
        formData.project_start_date &&
        new Date(formData.project_start_date) > new Date(new Date().toDateString());
    const isLowBudget = !isNonJobCategory && budget > 0 && budget < LOW_BUDGET_THRESHOLD;

    // Project is blocked if the DB returned a status other than "RELE" (Released)
    const isProjectNotReleased = !isNonJobCategory && !!projectDbStatus && projectDbStatus !== 'RELE';

    const selectedDate = parseDateInput(formData.date) || new Date();
    const selectedDateRule = getRuleForDate(submissionRules, selectedDate);
    const selectedDayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const windowStartLabel = formatTime12h(selectedDateRule.start_time);
    const windowEndLabel = formatTime12h(selectedDateRule.end_time);

    const isInvalidTime =
        selectedDateRule.is_active &&
        formData.time > selectedDateRule.end_time &&
        subType !== 'ADHOC' &&
        subType !== 'SPECIAL';

    const isCostCentreMissing = isCostCentreRequired && (!formData.cost_centre || !formData.cost_centre_id);

    const isSubmitBlocked =
        isProjectBlocked ||
        isBudgetInsufficient ||
        isProjectNotReleased ||
        Boolean(isTakeOffStartDatePending) ||
        isInvalidTime ||
        isCostCentreMissing;
    // ─────────────────────────────────────────────────────────────

    const PROJECT_STATUS_CONFIG: Record<string, {
        label: string;
        icon: React.ElementType;
        color: string;
        bg: string;
        border: string;
        ring: string;
        description: string;
        allowsRequests: boolean;
    }> = {
        [ProjectStatus.ACTIVE]: {
            label: 'Active',
            icon: TrendingUp,
            color: 'text-emerald-700',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            ring: 'ring-emerald-500',
            description: 'Project is ongoing with available budget. Transport requests are allowed.',
            allowsRequests: true,
        },
        [ProjectStatus.TAKE_OFF]: {
            label: 'Take-off',
            icon: Rocket,
            color: 'text-amber-700',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            ring: 'ring-amber-500',
            description: 'Approved but not yet operational. Requests allowed only if budget is available and the project start date is reached.',
            allowsRequests: true, // conditionally
        },
        [ProjectStatus.COMPLETED]: {
            label: 'Completed',
            icon: CheckCircle,
            color: 'text-blue-700',
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            ring: 'ring-blue-500',
            description: 'Project work is finished. No new transport requests are permitted.',
            allowsRequests: false,
        },
        [ProjectStatus.CLOSED]: {
            label: 'Closed',
            icon: Lock,
            color: 'text-red-700',
            bg: 'bg-red-50',
            border: 'border-red-200',
            ring: 'ring-red-500',
            description: 'Project is officially closed. All requests are blocked.',
            allowsRequests: false,
        },
    };

    const statusConfig = PROJECT_STATUS_CONFIG[projectStatus] || PROJECT_STATUS_CONFIG[ProjectStatus.ACTIVE];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const projectLookupWasTampered = selectedProjectIdentity
            ? normalizeProjectField(formData.job_number) !== normalizeProjectField(selectedProjectIdentity.job_number) ||
              normalizeProjectField(formData.project_name) !== normalizeProjectField(selectedProjectIdentity.project_name)
            : false;

        if (projectLookupWasTampered || projectTamperError) {
            alert('Project details were changed after lookup. Please reselect the project from the suggestions before submitting.');
            setLoading(false);
            return;
        }

        if (isProjectBlocked) {
            alert(`Cannot submit: project is ${projectStatus.toLowerCase()} and no longer accepts requests.`);
            setLoading(false);
            return;
        }
        if (isBudgetInsufficient && !isNonJobCategory) {
            alert('Transport request cannot be submitted because the project budget is insufficient.');
            setLoading(false);
            return;
        }
        if (isProjectNotReleased) {
            alert(`Transport request cannot be submitted: this project has not been released (status: ${projectDbStatus}). Only projects with status RELE are eligible.`);
            setLoading(false);
            return;
        }
        if (isTakeOffStartDatePending) {
            alert(`Transport request cannot be submitted. The project start date (${formData.project_start_date}) has not been reached yet.`);
            setLoading(false);
            return;
        }

        if (isEditMode && onSubmit) {
            await onSubmit(formData);
            setLoading(false);
            return;
        }

        try {
            const derivedJobNo = (formData.job_number || '').trim() || (isNonJobCategory ? (formData.cost_centre_id || '').trim() : '');
            const derivedProjectName = (formData.project_name || '').trim() || (isNonJobCategory ? (formData.cost_centre || '').trim() : '');

            const payload = {
                requestType: 'PASSENGER',
                subType: subType,
                jobNo: derivedJobNo,
                projectName: derivedProjectName,
                projectBudget: isNonJobCategory ? null : formData.project_budget,
                budgetConfirmed: isNonJobCategory ? true : formData.budget_confirmed,
                projectStatus: isNonJobCategory ? ProjectStatus.ACTIVE : formData.project_status,
                projectStartDate: isNonJobCategory ? null : (formData.project_start_date || null),
                isSpecial: subType === 'SPECIAL',
                specialJustification: formData.special_justification || null,
                passengerDetails: {
                    ...formData,
                    pickup_coordinates: pickupCoords,
                    drop_coordinates: dropCoords,
                    stops_coordinates: stopsCoords
                },
                tripId: formData.trip_id
            };
            const response = await api.post('/requests', payload);
            navigate(`/requests/${response.data.requestId}`);
        } catch (error: any) {
            console.error('Error submitting request:', error);
            const apiMessage = error?.response?.data?.message;
            alert(apiMessage || 'Failed to submit request.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-24">

            {/* Header Section: Project Overview */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Briefcase size={15} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Project Essentials</h3>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Division, budget & trip purpose</p>
                        </div>
                    </div>
                    {formData.budget_confirmed && (
                        <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                            <CheckCircle size={11} /> Budget Confirmed
                        </span>
                    )}
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Combobox
                        label="Main Division"
                        name="main_division"
                        value={formData.main_division}
                        options={divisions.map(d => d.name)}
                        onChange={handleChange}
                        required
                        icon={Briefcase}
                    />

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sub Division <span className="ml-1 text-[10px] font-medium text-slate-400 normal-case">(Optional)</span></label>
                        <select
                            name="sub_division"
                            value={formData.sub_division}
                            onChange={handleChange}
                            className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium ${(!formData.main_division || (divisions.find(d => d.name === formData.main_division)?.subDivisions || []).length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!formData.main_division || (divisions.find(d => d.name === formData.main_division)?.subDivisions || []).length === 0}
                        >
                            <option value="">
                                {!formData.main_division
                                    ? 'Select Main Division First'
                                    : (divisions.find(d => d.name === formData.main_division)?.subDivisions || []).length === 0
                                        ? 'No Sub Divisions'
                                        : 'Select Sub Division'}
                            </option>
                            {(divisions.find(d => d.name === formData.main_division)?.subDivisions || []).map((sd: any) => (
                                <option key={sd.id} value={sd.name}>{sd.name}</option>
                            ))}
                        </select>
                    </div>

                    {!isNonJobCategory && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">WBS (Job No) <span className="text-red-500">*</span></label>
                            <div ref={wbsInputRef} className="relative">
                                <input
                                    type="text"
                                    name="job_number"
                                    required
                                    autoComplete="off"
                                    value={formData.job_number}
                                    onChange={handleWBSChange}
                                    onBlur={handleWBSBlur}
                                    onFocus={() => wbsSuggestions.length > 0 && setShowWbsDropdown(true)}
                                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono font-medium ${wbsError ? 'border-red-300' : 'border-slate-200'}`}
                                    placeholder="e.g. F-EN-17-EL-0001-2"
                                />
                                {wbsFetching && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                    </span>
                                )}
                                {/* WBS Autocomplete Dropdown */}
                                {showWbsDropdown && wbsSuggestions.length > 0 && (
                                    <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                                        {wbsSuggestions.map((item) => (
                                            <li
                                                key={item.wbs_element}
                                                onMouseDown={() => selectProjectFromWbsSuggestion(item)}
                                                className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-xs font-mono font-bold text-slate-800 block truncate">{item.wbs_element}</span>
                                                    <span className="text-[10px] text-slate-500 block truncate">{item.name}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            {wbsError && (
                                <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5">
                                    <XCircle size={11} />{wbsError}
                                </p>
                            )}
                        </div>
                    )}

                    {!isNonJobCategory && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Project Name <span className="text-red-500">*</span></label>
                            <div ref={projectNameInputRef} className="relative">
                                <input
                                    type="text"
                                    name="project_name"
                                    required={!isNonJobCategory}
                                    autoComplete="off"
                                    value={formData.project_name}
                                    onChange={handleProjectNameChange}
                                    onFocus={() => projectNameSuggestions.length > 0 && setShowProjectNameDropdown(true)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                                    placeholder="Enter project name..."
                                />
                                {/* Project Name Autocomplete Dropdown */}
                                {showProjectNameDropdown && projectNameSuggestions.length > 0 && (
                                    <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                                        {projectNameSuggestions.map((item) => (
                                            <li
                                                key={item.wbs_element}
                                                onMouseDown={() => selectProjectFromNameSuggestion(item)}
                                                className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-medium text-slate-800 block truncate">{item.name}</span>
                                                    <span className="text-xs font-mono text-slate-400 block truncate">{item.wbs_element}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}

                    {projectTamperError && (
                        <div className="md:col-span-2 lg:col-span-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                            {projectTamperError}
                        </div>
                    )}

                    {isCostCentreRequired && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* Cost Centre Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cost Centre <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="cost_centre"
                                        required
                                        autoComplete="off"
                                        value={formData.cost_centre || ''}
                                        onChange={handleCostCentreNameChange}
                                        onBlur={handleCostCentreBlur}
                                        onFocus={() => costCentreNameSuggestions.length > 0 && setShowNameDropdown(true)}
                                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium ${costCentreNameError ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                            }`}
                                        placeholder="e.g. MEP Administration"
                                    />
                                    {costCentreFetching && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                        </span>
                                    )}
                                    {/* Autocomplete dropdown */}
                                    {showNameDropdown && costCentreNameSuggestions.length > 0 && (
                                        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                                            {costCentreNameSuggestions.map((item) => (
                                                <li
                                                    key={item.cost_id}
                                                    onMouseDown={() => selectCostCentreSuggestion(item)}
                                                    className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                                                >
                                                    <span className="text-sm font-medium text-slate-800">{item.name}</span>
                                                    <span className="text-xs font-mono text-slate-400 ml-3 shrink-0">{item.cost_id}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {costCentreNameError && (
                                    <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5">
                                        <XCircle size={11} />{costCentreNameError}
                                    </p>
                                )}
                            </div>

                            {/* Cost Centre ID */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cost Centre ID <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="cost_centre_id"
                                        required
                                        autoComplete="off"
                                        value={formData.cost_centre_id || ''}
                                        onChange={handleCostCentreIdChange}
                                        onBlur={handleCostCentreIdBlur}
                                        onFocus={() => costCentreIdSuggestions.length > 0 && setShowIdDropdown(true)}
                                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono font-medium ${costCentreIdError ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                            }`}
                                        placeholder="e.g. 4010051000"
                                    />
                                    {costCentreFetching && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                        </span>
                                    )}
                                    {/* Autocomplete dropdown */}
                                    {showIdDropdown && costCentreIdSuggestions.length > 0 && (
                                        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                                            {costCentreIdSuggestions.map((item) => (
                                                <li
                                                    key={item.cost_id}
                                                    onMouseDown={() => selectCostCentreSuggestion(item)}
                                                    className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                                                >
                                                    <span className="text-xs font-mono font-semibold text-slate-800">{item.cost_id}</span>
                                                    <span className="text-sm text-slate-500 ml-3 truncate">{item.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {costCentreIdError && (
                                    <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5">
                                        <XCircle size={11} />{costCentreIdError}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* GL Code */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            GL Code <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="gl_code"
                            required
                            value={formData.gl_code || ''}
                            onChange={(e) => {
                                const selected = GL_OPTIONS.find(o => o.code === e.target.value);
                                setFormData((prev: any) => ({
                                    ...prev,
                                    gl_code: e.target.value,
                                    gl_name: selected ? selected.name : ''
                                }));
                            }}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono font-medium"
                        >
                            <option value="">Select GL Code</option>
                            {GL_OPTIONS.map(o => (
                                <option key={o.code} value={o.code}>{o.code} – {o.name}</option>
                            ))}
                        </select>
                    </div>



                    <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Purpose of the Trip <span className="text-red-500">*</span></label>
                        <textarea
                            name="reason"
                            required
                            value={formData.reason}
                            onChange={handleChange}
                            rows={2}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium resize-none"
                            placeholder="Please describe the purpose of this trip..."
                        />
                    </div>

                    {subType === 'SPECIAL' && (
                        <div className="space-y-1.5 md:col-span-2 lg:col-span-4 mt-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200/50">
                            <label className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-2">
                                Justification for Special Request
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-200 text-amber-900 leading-none">REQUIRED</span>
                            </label>
                            <p className="text-[10px] text-amber-700 font-medium mb-2">Provide a detailed reason why this request requires special CEO approval, completely bypassing standard routing workflows.</p>
                            <textarea
                                name="special_justification"
                                required={subType === 'SPECIAL'}
                                value={formData.special_justification || ''}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm text-amber-950 placeholder:text-amber-500/50 focus:outline-none resize-none"
                                placeholder="e.g. Executive travel required for urgent stakeholder meeting..."
                            />
                        </div>
                    )}
                </div>

                {/* Budget & Project Status Block */}
                {!isNonJobCategory && (
                    <div className="px-6 pb-6 border-t border-slate-100 pt-6 space-y-5">

                        {/* Project Status (auto-fetched from DB) */}
                        {projectDbStatus && (
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Project Status</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide border ${projectDbStatus === 'RELE'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                    {projectDbStatus}
                                </span>
                                {projectDbStatus !== 'RELE' && (
                                    <span className="text-[11px] font-medium text-red-600">
                                        — project must be released (RELE) to submit requests
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Available Budget (read-only, auto-fetched) */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Available Budget</label>
                            <div className={`flex items-center gap-3 px-4 py-2.5 border rounded-lg ${(isBudgetInsufficient || isProjectNotReleased)
                                    ? 'bg-red-50 border-red-300'
                                    : isLowBudget
                                        ? 'bg-amber-50 border-amber-300'
                                        : formData.project_budget
                                            ? 'bg-emerald-50 border-emerald-200'
                                            : 'bg-slate-50 border-slate-200'
                                }`}>
                                <span className="text-slate-400 font-bold text-sm select-none">LKR</span>
                                <span className={`font-bold text-sm ${(isBudgetInsufficient || isProjectNotReleased) ? 'text-red-700'
                                        : isLowBudget ? 'text-amber-700'
                                            : formData.project_budget ? 'text-emerald-700'
                                                : 'text-slate-400'
                                    }`}>
                                    {formData.project_budget
                                        ? parseFloat(formData.project_budget).toLocaleString('en-LK', { minimumFractionDigits: 2 })
                                        : 'Enter WBS above to fetch budget'}
                                </span>
                                {formData.project_budget && !isBudgetInsufficient && !isProjectNotReleased && (
                                    <CheckCircle size={14} className="ml-auto text-emerald-600 shrink-0" />
                                )}
                            </div>

                            {/* Budget / Project Status Feedback */}
                            <AnimatePresence mode="wait">
                                {(isProjectNotReleased || isBudgetInsufficient) && (
                                    <motion.div
                                        key="block-error"
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-start gap-2 text-[11px] font-semibold text-red-600"
                                    >
                                        <XCircle size={12} className="mt-0.5 shrink-0" />
                                        <span>
                                            {isProjectNotReleased && isBudgetInsufficient
                                                ? `Transport request cannot be submitted: this project is not released (status: ${projectDbStatus}) and the budget is insufficient.`
                                                : isProjectNotReleased
                                                    ? `Transport request cannot be submitted: this project has not been released (status: ${projectDbStatus}). Only projects with status RELE are eligible.`
                                                    : 'Insufficient budget — transport request cannot be submitted.'}
                                        </span>
                                    </motion.div>
                                )}
                                {isLowBudget && !isBudgetInsufficient && !isProjectNotReleased && (
                                    <motion.div
                                        key="budget-warn"
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center gap-2 text-[11px] font-semibold text-amber-600"
                                    >
                                        <AlertTriangle size={12} />
                                        Remaining project budget is low.
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>

            {subType === 'ADHOC' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-amber-100 p-2 rounded-lg text-amber-600 mt-0.5">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Ad-Hoc Request (Urgent)</h4>
                        <p className="text-sm font-medium text-amber-700/80 mt-1 leading-relaxed">
                            This request will follow the standard approval sequence: Coordinator &rarr; HOD &rarr; Transport Officer. The expected processing time is 30 minutes from submission.
                        </p>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            {(formData.budget_confirmed || isNonJobCategory) && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                    {/* LEFT COLUMN: Request Specifications (Span 5) */}
                    <div className="xl:col-span-5 space-y-6">

                        {/* Section: Trip Schedule */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <Clock size={15} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Trip Schedule</h3>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Date, Time & Duration</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        name="date"
                                        required
                                        min={minDate}
                                        value={formData.date}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Time <span className="text-red-500">*</span></label>
                                    <TimeInput
                                        value={formData.time}
                                        onChange={(value) => setFormData((prev: any) => ({ ...prev, time: value }))}
                                        error={isInvalidTime}
                                        label="time"
                                        ariaLabel="Select trip time"
                                        inputClassName="text-sm"
                                    />
                                </div>
                            </div>

                            {isInvalidTime && (
                                <div className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                    <Clock size={14} />
                                    <span>{`Trip time must be before ${windowEndLabel}.`}</span>
                                </div>
                            )}

                            {subType !== 'ADHOC' && subType !== 'SPECIAL' && (
                                <div className="bg-blue-50 text-blue-700 text-xs font-medium p-3 rounded-lg flex items-start gap-2">
                                    <Clock size={14} className="mt-0.5 shrink-0" />
                                    <span className="leading-relaxed">
                                        {selectedDateRule.is_active
                                            ? `Note: Vehicle requests for ${selectedDayName} are configured for ${windowStartLabel} - ${windowEndLabel}. Requests made after ${windowEndLabel} will be processed in the next available business window.`
                                            : `Note: Vehicle requests are set as closed for ${selectedDayName} in System Settings. Requests submitted now will be processed in the next available business window.`}
                                    </span>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration <span className="text-red-500">*</span></label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        name="no_of_days"
                                        required
                                        value={formData.no_of_days}
                                        onChange={handleChange}
                                        className="w-24 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-center"
                                    />
                                    <span className="text-sm font-medium text-slate-600">Day(s) Required</span>
                                </div>
                            </div>
                        </div>

                        {/* Section: Vehicle Details */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                                    <Navigation size={15} className="text-cyan-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Vehicle Preference</h3>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Type & Specifications</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Vehicle Type Dropdown */}
                                <Combobox
                                    label="Vehicle Type"
                                    name="vehicle_type"
                                    value={formData.vehicle_type}
                                    options={vehicleTypes.map(t => t.name)}
                                    onChange={handleChange}
                                    required
                                    labelClassName="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block"
                                    placeholder="Select or Type Vehicle..."
                                />

                                {/* Specification Dropdown (Fallback if no dynamic attributes) */}
                                {(!selectedVehicleType?.attributes || selectedVehicleType.attributes.length === 0) && (
                                    <Combobox
                                        label="Specification (Optional)"
                                        name="specification"
                                        value={formData.specification}
                                        options={VEHICLE_SPECIFICATIONS[formData.vehicle_type] || VEHICLE_SPECIFICATIONS['default']}
                                        onChange={handleChange}
                                        disabled={!formData.vehicle_type}
                                        labelClassName="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block"
                                        placeholder="Select or Type Spec..."
                                    />
                                )}
                            </div>

                            {/* Dynamic Specs */}
                            {selectedVehicleType?.attributes && selectedVehicleType.attributes.length > 0 && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2">
                                    {selectedVehicleType.attributes.map((attr: any) => (
                                        <div key={attr.id} className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{attr.label}</label>
                                            {attr.type === 'SELECT' && attr.options ? (
                                                <select
                                                    value={formData[attr.key] || ''}
                                                    onChange={(e) => handleAttributeChange(attr.key, e.target.value)}
                                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
                                                    required={attr.is_required}
                                                >
                                                    <option value="">Select Option</option>
                                                    {(Array.isArray(attr.options) 
                                                        ? attr.options 
                                                        : (typeof attr.options === 'string' 
                                                            ? (attr.options.startsWith('[') ? JSON.parse(attr.options) : attr.options.split(',').map((s: string) => s.trim())) 
                                                            : [])
                                                    ).map((opt: string) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type={attr.type === 'NUMBER' ? 'number' : 'text'}
                                                    value={formData[attr.key] || ''}
                                                    onChange={(e) => handleAttributeChange(attr.key, e.target.value)}
                                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
                                                    required={attr.is_required}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>



                    </div>


                    {/* RIGHT COLUMN: Route & Map (Span 7) */}
                    <div className="xl:col-span-7 space-y-6">

                        {/* Card: Route Planning */}
                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full min-h-0 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                        <MapPin size={15} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800">Route Planning</h3>
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pickup, Stops & Destination</p>
                                    </div>
                                </div>
                                {formData.distance && (
                                    <span className="text-xs bg-slate-900 text-white px-3 py-1 rounded-full font-bold shadow-sm">
                                        Total Distance: {formData.distance} km
                                    </span>
                                )}
                            </div>

                            {/* Location Inputs Stack */}
                            <div className="space-y-3 bg-slate-50/80 p-5 rounded-xl border border-slate-100 backdrop-blur-sm relative z-10 mb-4">
                                {/* Pickup */}
                                <div className="flex items-start gap-3 group">
                                    <div className="mt-2.5">
                                        <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100/50"></div>
                                        {/* Connector Line */}
                                        <div className="w-0.5 h-full bg-slate-200 mx-auto mt-1 min-h-[20px]"></div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Start Location</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                <GoogleAddressAutocomplete
                                                    value={formData.pickup_location}
                                                    onChange={(val) => setFormData((prev: any) => ({ ...prev, pickup_location: val }))}
                                                    onSelect={(coords) => {
                                                        setPickupCoords({ lat: coords.lat, lng: coords.lng, address: coords.address });
                                                        setFormData((prev: any) => ({ ...prev, pickup_location: coords.address }));
                                                    }}
                                                    placeholder="Search pickup location..."
                                                    required
                                                    className="w-full text-sm bg-white border border-slate-200 pl-4 pr-10 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleCurrentLocation(); }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 transition-colors"
                                                    title="Use My Location"
                                                >
                                                    <Navigation size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stops */}
                                <AnimatePresence>
                                    {formData.stops?.map((stop: string, index: number) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex items-start gap-3 pl-[3px]"
                                        >
                                            <div className="mt-0 flex flex-col items-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                <div className="w-0.5 h-full bg-slate-200 mx-auto min-h-[40px]"></div>
                                            </div>
                                            <div className="flex-1 pb-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Stop {index + 1}</label>
                                                <div className="flex gap-2">
                                                    <GoogleAddressAutocomplete
                                                        value={stop}
                                                        onChange={(val) => handleStopChange(index, val)}
                                                        onSelect={(coords) => handleStopSelect(index, coords)}
                                                        placeholder="Stop location..."
                                                        className="w-full text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none transition-all"
                                                    />
                                                    <button onClick={() => handleRemoveStop(index)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {/* Drop */}
                                <div className="flex items-start gap-3">
                                    <div className="mt-2.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100/50"></div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Destination</label>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <div className="flex-1 relative">
                                                <GoogleAddressAutocomplete
                                                    value={formData.drop_location}
                                                    onChange={(val) => setFormData((prev: any) => ({ ...prev, drop_location: val }))}
                                                    onSelect={(coords) => {
                                                        setDropCoords({ lat: coords.lat, lng: coords.lng, address: coords.address });
                                                        setFormData((prev: any) => ({ ...prev, drop_location: coords.address }));
                                                    }}
                                                    placeholder="Search drop location..."
                                                    required
                                                    className="w-full text-sm bg-white border border-slate-200 pl-4 pr-10 py-2.5 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-sm"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddStop}
                                                className="text-sm font-bold text-slate-600 hover:text-blue-600 flex items-center justify-center gap-1 bg-white px-4 py-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all whitespace-nowrap w-full sm:w-auto"
                                            >
                                                <Plus size={14} /> Add Stop
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Map */}
                            <div className="h-[300px] sm:h-[380px] lg:h-[520px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 relative">
                                <GoogleRoutePlanner
                                    height="100%"
                                    className="w-full h-full"
                                    onRouteUpdate={handleRouteUpdate}
                                    pickup={pickupCoords}
                                    drop={dropCoords}
                                    stops={stopsCoords.filter((s): s is Coordinate => s !== null)}
                                    hideControls={true}
                                    selectionMode={selectionMode}
                                    onSelectionModeChange={setSelectionMode}
                                />

                                {/* Map Controls Overlay */}
                                <div className="absolute top-4 right-4 flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectionMode(prev => prev === 'pickup' ? null : 'pickup');
                                        }}
                                        className={`flex h-11 w-11 items-center justify-center rounded-lg shadow-lg border transition-all ${selectionMode === 'pickup' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        title="Pick Start on Map"
                                    >
                                        <MapPin size={20} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectionMode(prev => prev === 'drop' ? null : 'drop');
                                        }}
                                        className={`flex h-11 w-11 items-center justify-center rounded-lg shadow-lg border transition-all ${selectionMode === 'drop' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        title="Pick End on Map"
                                    >
                                        <MapPin size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Passenger Info & Extras Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <Users size={15} className="text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Passengers & Extras</h3>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Contact, Count & Preferences</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                        <Fingerprint size={12} className="text-blue-500" />
                                        EPF No <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="epf_no"
                                        required
                                        placeholder="e.g. 12345"
                                        value={formData.epf_no || ''}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Requestor Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="contact_person_name"
                                        required
                                        value={formData.contact_person_name}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mobile Number <span className="text-red-500">*</span></label>
                                    <input
                                        type="tel"
                                        name="contact_no"
                                        required
                                        value={formData.contact_no}
                                        onChange={handleChange}
                                        maxLength={10}
                                        placeholder="07XXXXXXXX"
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Users <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        min="1"
                                        name="no_of_passengers"
                                        required
                                        value={formData.no_of_passengers}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                                    />
                                </div>
                            </div>

                            {/* Additional Passengers */}
                            {formData.passenger_list && formData.passenger_list.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-slate-100 mt-6 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Additional Passenger Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {formData.passenger_list.map((p: any, idx: number) => (
                                            <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Name #{idx + 2} <span className="text-red-500">*</span></label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={p.name}
                                                        onChange={(e) => handlePassengerListChange(idx, 'name', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                                                        placeholder="Full Name"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">EPF No #{idx + 2} <span className="text-red-500">*</span></label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={p.epf_no}
                                                        onChange={(e) => handlePassengerListChange(idx, 'epf_no', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                                                        placeholder="EPF No"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}


                            <div className="border-t border-slate-100 pt-6 flex flex-wrap gap-4 justify-between items-center">
                                <div className="flex gap-4">
                                    <label className="flex min-h-11 items-center gap-3 cursor-pointer group select-none pr-1">
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all border shadow-sm ${formData.return_trip ? 'border-blue-600 bg-blue-600 text-white' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
                                            {formData.return_trip && <Check size={13} strokeWidth={3} className="shrink-0" />}
                                        </div>
                                        <input type="checkbox" name="return_trip" checked={formData.return_trip} onChange={handleChange} className="hidden" />
                                        <span className="text-sm font-medium text-slate-700">Book Return Trip</span>
                                    </label>
                                    <label className="flex min-h-11 items-center gap-3 cursor-pointer group select-none pr-1">
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all border shadow-sm ${formData.share_vehicle ? 'border-emerald-600 bg-emerald-600 text-white' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
                                            {formData.share_vehicle && <Check size={13} strokeWidth={3} className="shrink-0" />}
                                        </div>
                                        <input type="checkbox" name="share_vehicle" checked={formData.share_vehicle} onChange={handleChange} className="hidden" />
                                        <span className="text-sm font-medium text-slate-700">Willing to Share</span>
                                    </label>
                                </div>
                            </div>

                            {formData.return_trip && (
                                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 flex flex-col gap-4 sm:flex-row sm:gap-6 animate-in slide-in-from-top-2">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Return Date</label>
                                        <input
                                            type="date"
                                            name="return_date"
                                            value={formData.return_date || ''}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                                            required={formData.return_trip}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Return Time</label>
                                        <TimeInput
                                            value={formData.return_time || ''}
                                            onChange={(value) => setFormData((prev: any) => ({ ...prev, return_time: value }))}
                                            disabled={!formData.return_trip}
                                            label="return time"
                                            ariaLabel="Select return time"
                                            inputClassName="bg-white text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {renderSharedSuggestions()}

                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Floating Action Bar */}
            {(() => {
                const _user = JSON.parse(localStorage.getItem('user') || '{}');
                const _role = (_user?.role || '').toUpperCase();
                const _isStaff = _role === 'STAFF';
                const leftClass = _isStaff ? 'left-0' : 'left-0 lg:left-72';

                // Determine contextual status message
                let statusText = 'Mission Integrity Verified — Ready for Deployment';
                let isWarning = false;
                let isError = false;

                if (loading) {
                    statusText = 'Processing Mission Data...';
                } else if (isProjectBlocked) {
                    statusText = `Protocol Inhibited — Project is ${statusConfig.label.toLowerCase()}`;
                    isError = true;
                } else if (isBudgetInsufficient) {
                    statusText = 'Protocol Inhibited — Budget Insufficient';
                    isError = true;
                } else if (isTakeOffStartDatePending) {
                    statusText = 'Deployment Delayed — Start Date Not Reached';
                    isWarning = true;
                } else if (isLowBudget) {
                    statusText = 'Caution — Operational Budget Low';
                    isWarning = true;
                } else if (isInvalidTime) {
                    statusText = `Schedule Conflict — Must be before ${windowEndLabel}`;
                    isError = true;
                } else if (!isNonJobCategory && !formData.budget_confirmed) {
                    statusText = 'Reference Required — Enter WBS Element';
                    isWarning = true;
                }

                return (
                    <div className={`fixed bottom-0 ${leftClass} right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-[0_-12px_40px_-15px_rgba(0,0,0,0.12)] z-40`}>
                        <div className="max-w-7xl mx-auto px-6 py-4 xl:py-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-col gap-1.5 order-2 sm:order-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-0.5">Fleet Protocol</span>
                                    <div className="flex items-center gap-2.5">
                                        <div className={`h-2.5 w-2.5 rounded-full animate-pulse transition-colors ${isError ? 'bg-red-500' : (isWarning ? 'bg-amber-400' : (loading ? 'bg-slate-300' : 'bg-[#FF5F1F]'))}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-black uppercase tracking-tight ${isError ? 'text-red-500' : (isWarning ? 'text-amber-600' : (loading ? 'text-slate-400' : 'text-[#FF5F1F]'))}`}>
                                                {statusText}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="order-1 sm:order-2 flex items-center gap-4">
                                    <button
                                        type="submit"
                                        disabled={loading || isSubmitBlocked}
                                        className="h-[52px] w-full sm:w-auto sm:min-w-[220px] bg-gradient-to-r from-[#FF5F1F] to-[#FF8C00] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                            <>
                                                {isEditMode ? 'Update Request' : 'Submit'}
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </form>
    );
};

export default PassengerForm;
