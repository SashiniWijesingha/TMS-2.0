import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, Briefcase, Phone, FileText,
    CheckCircle, Plus, Trash2, MapPin, Truck, User, Info, Navigation, ChevronUp, ChevronDown,
    Loader2, ArrowRight, Fingerprint
} from 'lucide-react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import GoogleRoutePlanner from '../../components/common/GoogleRoutePlanner';
import GoogleAddressAutocomplete from '../../components/common/GoogleAddressAutocomplete';
import Combobox from '../../components/common/Combobox';
import TimeInput from '../../components/common/TimeInput';
import { getDivisions } from '../../services/userService';
import { getVehicleTypes } from '../../services/vehicleService';
import type { RequestFormProps } from '../../types';
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

const FormSection = ({ title, icon: Icon, children, className = "", delay = 0 }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 ${className}`}
    >
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 rounded-t-2xl">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Icon size={18} />
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
        </div>
        <div className="p-6">
            {children}
        </div>
    </motion.div>
);

const MaterialForm = ({ initialData, isEditMode, onSubmit, subType }: RequestFormProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [divisions, setDivisions] = useState<any[]>([]);
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
    const [submissionRules, setSubmissionRules] = useState<SubmissionRule[]>([]);

    const [pickupCoords, setPickupCoords] = useState<Coordinate | null>(null);
    const [dropCoords, setDropCoords] = useState<Coordinate | null>(null);
    const [stopsCoords, setStopsCoords] = useState<(Coordinate | null)[]>([]);
    const [potentialMatches, setPotentialMatches] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [divisionsData, typesData] = await Promise.all([
                    getDivisions(),
                    getVehicleTypes()
                ]);
                setDivisions(divisionsData);
                setVehicleTypes(typesData.filter((t: any) => t.category === 'MATERIAL'));
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

    // State for Unified Interface
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);
    const [selectionMode, setSelectionMode] = useState<'pickup' | 'drop' | 'stop' | null>(null);

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        const address = results[0].formatted_address;
                        setPickupCoords({ lat: latitude, lng: longitude, address });
                        setFormData((prev: any) => ({ ...prev, pickup_location_1: address }));
                    }
                });
            });
        }
    };

    const [formData, setFormData] = useState(initialData || {
        date: '',
        time: '',
        main_division: '',
        sub_division: '',
        job_number: '',
        project_name: '',
        contact_person_name: '',
        epf_no: '',
        contact_no: '',
        vehicle_type: '',
        // Dynamic Fields
        lorry_type: '',
        lorry_size: '',
        boom_truck_size: '',
        arm_capacity: '',
        crane_weight: '',
        bucket_remarks: '',
        bucket_weight: '',
        pickup_location_1: '',
        drop_location_1: '',
        has_stops: false,
        stops: [],
        no_of_labours: 'No',
        return_materials: false,
        return_date: '',
        return_time: '',
        share_vehicle: false,
        sharing_remarks: '',
        reason: '',
        special_justification: ''
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

    const handleRouteUpdate = (data: {
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
                pickup_location_1: data.pickup?.address || prev.pickup_location_1,
                drop_location_1: data.drop?.address || prev.drop_location_1,
                stops: newStops,
                has_stops: newStops.length > 0,
                distance: data.distanceKm ? data.distanceKm.toString() : prev.distance
            }
        });

        // Only update coords if we aren't losing any (preserving null placeholders)
        // Check against current state available via closure or just use the same logic as above
        // We can't access 'prev' state of stopsCoords here easily without setter callback, 
        // but we can trust that if data.stops.length < stopsCoords.length, we shouldn't update.
        if (data.stops?.length >= stopsCoords.length) {
            setStopsCoords(data.stops);
        }

        if (data.pickup) setPickupCoords(data.pickup);
        if (data.drop) setDropCoords(data.drop);
    };

    const handleAddStop = () => {
        setFormData((prev: any) => ({
            ...prev,
            stops: [...(prev.stops || []), ''],
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

    useEffect(() => {
        const checkOverlaps = async () => {
            if (pickupCoords && dropCoords && !isEditMode) {
                try {
                    const res = await api.post('/requests/suggest-matches', {
                        pickup_coordinates: pickupCoords,
                        drop_coordinates: dropCoords
                    });
                    setPotentialMatches(res.data.matches || []);
                } catch (err) {
                    console.error("Failed to check overlaps", err);
                }
            }
        };
        const timer = setTimeout(checkOverlaps, 1000);
        return () => clearTimeout(timer);
    }, [pickupCoords, dropCoords, isEditMode]);

    // --- Draft Logic ---
    useEffect(() => {
        if (!isEditMode && !initialData) {
            const savedDraft = localStorage.getItem('material_request_draft');
            if (savedDraft) {
                try {
                    const draft = JSON.parse(savedDraft);
                    // Minimal check to see if it's usable
                    if (draft.project_name || draft.reason) {
                        if (confirm('Find a saved draft. Would you like to restore it?')) {
                            setFormData(draft);
                        } else {
                            localStorage.removeItem('material_request_draft');
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse draft", e);
                }
            }
        }
    }, []);

    useEffect(() => {
        if (!isEditMode && formData && (formData.project_name || formData.reason || formData.job_number)) {
            const timer = setTimeout(() => {
                localStorage.setItem('material_request_draft', JSON.stringify(formData));
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [formData, isEditMode]);
    // -------------------

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (isEditMode && onSubmit) {
            await onSubmit(formData);
            setLoading(false);
            return;
        }

        try {
            const payload = { ...formData };
            if (formData.vehicle_type === 'Boom Truck' && formData.boom_truck_size) {
                payload.lorry_size = formData.boom_truck_size;
            }
            if (formData.bucket_remarks) {
                payload.man_bucket_height = formData.bucket_remarks;
            }
            if (formData.bucket_weight) {
                payload.man_bucket_weight = formData.bucket_weight;
            }

            const response = await api.post('/requests', {
                requestType: 'MATERIAL',
                subType: subType,
                jobNo: formData.job_number,
                projectName: formData.project_name,
                isSpecial: subType === 'SPECIAL',
                specialJustification: formData.special_justification || null,
                materialDetails: {
                    ...payload,
                    pickup_coordinates: pickupCoords,
                    drop_coordinates: dropCoords,
                    stops_coordinates: stopsCoords
                }
            });

            // Clear draft on success
            localStorage.removeItem('material_request_draft');

            navigate(`/requests/${response.data.requestId}`);
        } catch (error: any) {
            console.error('Error submitting request:', error);
            const errorMsg = error.response?.data?.message || 'Failed to submit request.';
            alert(`Error: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const renderVehicleOptions = () => {
        const selectedType = vehicleTypes.find(t => t.name === formData.vehicle_type);
        if (!selectedType || !selectedType.attributes) return null;

        return (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="col-span-1 md:col-span-2 bg-indigo-50/50 rounded-xl p-6 space-y-4 border border-indigo-100"
            >
                <h4 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider mb-2">Specific Requirements for {formData.vehicle_type}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedType.attributes.map((attr: any) => (
                        <div key={attr.id} className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700">
                                {attr.label} {attr.unit && <span className="text-xs text-slate-400">({attr.unit})</span>}
                            </label>
                            {attr.type === 'SELECT' && attr.options ? (
                                <select
                                    name={attr.key}
                                    value={formData[attr.key] || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    required={attr.is_required}
                                >
                                    <option value="">Select {attr.label}</option>
                                    {attr.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            ) : (
                                <input
                                    type={attr.type === 'NUMBER' ? 'number' : 'text'}
                                    name={attr.key}
                                    value={formData[attr.key] || ''}
                                    onChange={handleChange}
                                    placeholder={`Enter ${attr.label.toLowerCase()}...`}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    required={attr.is_required}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>
        );
    };

    const renderMatches = () => {
        if (potentialMatches.length === 0) return null;
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6"
            >
                <h4 className="flex items-center text-emerald-800 font-semibold mb-3">
                    <CheckCircle className="mr-2" size={18} />
                    Suggested Green Options (Trip Matches)
                </h4>
                <div className="space-y-2">
                    {potentialMatches.map((match: any, idx: number) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-emerald-100 text-sm shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-slate-800">Request #{match.requestId}</p>
                                    <p className="text-slate-500 text-xs">by {match.requester?.name || 'User'}</p>
                                </div>
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-medium">High Match</span>
                            </div>
                            <p className="text-slate-600 mt-2 text-xs">{match.overlapDetail}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        );
    };

    const InputField = ({ label, icon: Icon, error, ...props }: any) => (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    {...props}
                    className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 border ${error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500 bg-red-50/30' : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/30'} rounded-lg outline-none focus:ring-2 transition-all focus:bg-white`}
                />
            </div>
        </div>
    );

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

    return (
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-20">

            {/* 1. Job & Contact Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormSection title="Job Details" icon={Briefcase} delay={0.1}>
                    <div className="space-y-5">
                        <Combobox
                            label="Main Division"
                            name="main_division"
                            value={formData.main_division}
                            options={divisions.map(d => d.name)}
                            onChange={handleChange}
                            required
                            icon={Briefcase}
                            className="bg-slate-50/30"
                        />
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Sub Division</label>
                            <select
                                name="sub_division"
                                value={formData.sub_division}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 bg-slate-50/30 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium ${(!formData.main_division || (divisions.find(d => d.name === formData.main_division)?.subDivisions || []).length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField
                                label="WBS (Job No)"
                                name="job_number"
                                value={formData.job_number}
                                onChange={handleChange}
                                icon={FileText}
                                required
                            />
                            <InputField
                                label="Project Name"
                                name="project_name"
                                value={formData.project_name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Schedule & Contact" icon={Clock} delay={0.2}>
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField
                                type="date"
                                label="Date"
                                name="date"
                                min={minDate}
                                value={formData.date}
                                onChange={handleChange}
                                icon={Calendar}
                                required
                            />
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700">Time</label>
                                <TimeInput
                                    value={formData.time}
                                    onChange={(value) => setFormData((prev: any) => ({ ...prev, time: value }))}
                                    error={isInvalidTime}
                                    label="time"
                                    ariaLabel="Select trip time"
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
                        <div className="pt-4 border-t border-slate-100">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField
                                        label="EPF No"
                                        name="epf_no"
                                        value={formData.epf_no || ''}
                                        onChange={handleChange}
                                        icon={Fingerprint}
                                        placeholder="e.g. 12345"
                                        required
                                    />
                                    <InputField
                                        label="Contact Person"
                                        name="contact_person_name"
                                        value={formData.contact_person_name}
                                        onChange={handleChange}
                                        icon={User}
                                        required
                                    />
                                </div>
                                <InputField
                                    type="tel"
                                    label="Contact Number"
                                    name="contact_no"
                                    value={formData.contact_no}
                                    onChange={handleChange}
                                    maxLength={10}
                                    placeholder="07XXXXXXXX"
                                    icon={Phone}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </FormSection>
            </div>

            {/* 2. Route & Location (Unified Interface) */}
            <FormSection title="Route Planning & Location" icon={MapPin} delay={0.3}>
                <div className="space-y-4">
                    {/* Controls Bar */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative z-10">
                        <div className="flex flex-col gap-4">
                            {/* Top Row: Main Inputs */}
                            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                                {/* Pickup Input Group */}
                                <div className="flex-1 w-full relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <MapPin size={16} className="text-blue-500" />
                                    </div>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleCurrentLocation(); }}
                                            className="flex h-11 w-11 items-center justify-center hover:bg-slate-100 rounded-md text-slate-500 hover:text-blue-600 transition-colors"
                                            title="Use GPS"
                                        >
                                            <Navigation size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectionMode(prev => prev === 'pickup' ? null : 'pickup');
                                            }}
                                            className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors ${selectionMode === 'pickup' ? 'bg-orange-100 text-orange-600' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                                            title="Pick on Map"
                                        >
                                            <MapPin size={14} />
                                        </button>
                                    </div>
                                    <GoogleAddressAutocomplete
                                        value={formData.pickup_location_1}
                                        onChange={(val) => setFormData((prev: any) => ({ ...prev, pickup_location_1: val }))}
                                        onSelect={(coords) => {
                                            setPickupCoords({ lat: coords.lat, lng: coords.lng, address: coords.address });
                                            setFormData((prev: any) => ({ ...prev, pickup_location_1: coords.address }));
                                        }}
                                        placeholder="Pickup Location"
                                        className="pl-9 pr-20 py-2 w-full text-sm bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 transition-all rounded-lg outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>

                                {/* Arrow Indicator */}
                                <div className="hidden md:block text-slate-300">
                                    <ChevronUp className="rotate-90" size={20} />
                                </div>

                                {/* Drop Input Group */}
                                <div className="flex-1 w-full relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <MapPin size={16} className="text-red-500" />
                                    </div>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectionMode(prev => prev === 'drop' ? null : 'drop');
                                            }}
                                            className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors ${selectionMode === 'drop' ? 'bg-orange-100 text-orange-600' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                                            title="Pick on Map"
                                        >
                                            <MapPin size={14} />
                                        </button>
                                    </div>
                                    <GoogleAddressAutocomplete
                                        value={formData.drop_location_1}
                                        onChange={(val) => setFormData((prev: any) => ({ ...prev, drop_location_1: val }))}
                                        onSelect={(coords) => {
                                            setDropCoords({ lat: coords.lat, lng: coords.lng, address: coords.address });
                                            setFormData((prev: any) => ({ ...prev, drop_location_1: coords.address }));
                                        }}
                                        placeholder="Drop Location"
                                        className="pl-9 pr-12 py-2 w-full text-sm bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 transition-all rounded-lg outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            {/* Bottom Row: Stops & Distance & Matches */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-100 pt-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleAddStop}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 py-2 px-3 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Plus size={14} /> Add Stop
                                    </button>
                                    {formData.has_stops && (
                                        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-md">
                                            {formData.stops?.length} Stop(s) Added
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Est. Dist:</span>
                                        <span className="font-semibold text-slate-800">{formData.distance || '0'} km</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                                        className="text-slate-400 hover:text-slate-600 px-3 py-2 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1 text-sm font-medium"
                                    >
                                        {isPanelExpanded ? 'Hide Details' : 'Show Details'}
                                        {isPanelExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Expandable Section: Stops & Matches */}
                            <AnimatePresence>
                                {isPanelExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden space-y-3"
                                    >
                                        {/* Stops List */}
                                        {formData.has_stops && formData.stops?.map((stop: string, index: number) => (
                                            <div key={index} className="flex gap-2 items-center pl-4 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                                <span className="text-xs font-bold text-slate-400 w-4 text-center">{index + 1}</span>
                                                <div className="flex-1">
                                                    <GoogleAddressAutocomplete
                                                        value={stop}
                                                        onChange={(val) => handleStopChange(index, val)}
                                                        onSelect={(coords) => handleStopSelect(index, coords)}
                                                        placeholder={`Stop #${index + 1}`}
                                                        className="w-full text-xs bg-transparent border-none p-0 focus:ring-0"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveStop(index)}
                                                    className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Matches Section */}
                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            {renderMatches()}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Map */}
                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 relative h-[300px] sm:h-[380px] lg:h-[500px]">
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
                    </div>
                </div>

            </FormSection >

            {/* 3. Vehicle & Logistics */}
            < FormSection title="Vehicle & Logistics" icon={Truck} delay={0.4} >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle Type</label>
                            <select
                                name="vehicle_type"
                                value={formData.vehicle_type}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                            >
                                <option value="">-- Select Vehicle Type --</option>
                                {vehicleTypes.map(type => <option key={type.id} value={type.name}>{type.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Labourers Required</label>
                            <select
                                name="no_of_labours"
                                value={formData.no_of_labours}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            >
                                <option value="No">None</option>
                                <option value="1 Person">1 Person</option>
                                <option value="2 Person">2 Persons</option>
                            </select>
                        </div>
                    </div>

                    <AnimatePresence>
                        {formData.vehicle_type && renderVehicleOptions()}
                    </AnimatePresence>

                    <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors flex-1 min-w-[200px]">
                            <input
                                type="checkbox"
                                id="return_materials"
                                name="return_materials"
                                checked={formData.return_materials}
                                onChange={handleChange}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                            />
                            <span className="text-sm font-medium text-slate-700">Round Trip / Return</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors flex-1 min-w-[200px]">
                            <input
                                type="checkbox"
                                id="share_vehicle"
                                name="share_vehicle"
                                checked={formData.share_vehicle}
                                onChange={handleChange}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-700">Willing to Share Vehicle</span>
                                <span className="text-xs text-slate-500">Enable optimization & eco-friendly matching</span>
                            </div>
                        </label>
                    </div>
                </div>
            </FormSection >

            {/* 4. Purpose */}
            < FormSection title="Purpose" icon={Info} delay={0.5} >
                <div className="relative">
                    <FileText className="absolute left-4 top-4 text-slate-400" size={20} />
                    <textarea
                        name="reason"
                        required
                        value={formData.reason}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Please describe the purpose of this transport request..."
                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                    />
                </div>

                {subType === 'SPECIAL' && (
                    <div className="mt-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200/50">
                        <label className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-2 mb-1.5">
                            Justification for Special Request
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-200 text-amber-900 leading-none">REQUIRED</span>
                        </label>
                        <p className="text-[10px] text-amber-700 font-medium mb-2">Provide a detailed reason why this request requires special CEO approval, completely bypassing standard routing workflows.</p>
                        <div className="relative">
                            <textarea
                                name="special_justification"
                                required={subType === 'SPECIAL'}
                                value={formData.special_justification || ''}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-4 py-3 bg-white border border-amber-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm text-amber-950 placeholder:text-amber-500/50 focus:outline-none resize-none"
                                placeholder="e.g. Critical materials required for urgent stakeholder project..."
                            />
                        </div>
                    </div>
                )}
            </FormSection >

            {/* Action Bar */}
            <div className={`fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-[0_-12px_40px_-15px_rgba(0,0,0,0.12)] p-6 flex flex-col sm:flex-row items-center justify-between`}>
                <div className="flex flex-col gap-1.5 order-2 sm:order-1 mt-4 sm:mt-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-0.5">Freight Operations</span>
                    <div className="flex items-center gap-2.5">
                        <div className={`h-2.5 w-2.5 rounded-full animate-pulse transition-colors ${loading || isInvalidTime ? 'bg-slate-300' : 'bg-[#005C2E]'}`} />
                        <p className={`text-xs font-black uppercase tracking-tight ${loading || isInvalidTime ? 'text-slate-400' : 'text-[#005C2E]'}`}>
                            {loading ? 'Processing Freight Data...' : (isInvalidTime ? 'Operational conflict identified' : 'Freight protocol verified — ready to dispatch')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 order-1 sm:order-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex-1 sm:flex-none px-8 py-3.5 border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                    >
                        ABORT
                    </button>
                    <button
                        type="submit"
                        disabled={loading || isInvalidTime}
                        className="flex-[2] sm:flex-none px-12 py-3.5 bg-gradient-to-r from-[#005C2E] to-[#007F41] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-green-900/20 hover:shadow-green-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-3"
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

        </form >
    );
};

export default MaterialForm;
