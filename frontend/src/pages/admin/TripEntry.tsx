import React, { useMemo, useState, useEffect } from 'react';
import { 
    Save, 
    RefreshCcw, 
    Calculator,
    Car,
    User as UserIcon,
    Package,
    MapPin,
    Clock,
    Moon,
    CalendarDays
} from 'lucide-react';
import { getAllDrivers, getAllVehicles } from '../../services/vehicleService';
import { getTransportPackages } from '../../services/packageService';
import { createTripEntry } from '../../services/tripEntryService';
import { VehicleAvailabilityStatus } from '../../types';
import type { Driver, TransportPackage, Vehicle } from '../../types';

const TripEntry: React.FC = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [packages, setPackages] = useState<TransportPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        driverId: '',
        vehicleId: '',
        packageId: '',
        totalKm: '',
        totalTripDays: '1',
        otHours: '0',
        nightOutCount: '0'
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const [driverData, vehicleData, packageData] = await Promise.all([
                    getAllDrivers(),
                    getAllVehicles(),
                    getTransportPackages({ status: 'ACTIVE' })
                ]);
                
                // Assuming all return active for now if there are no status columns on drivers,
                // otherwise we filter. Let's filter vehicles if there's a status.
                setDrivers(driverData);
                const activeVehicles = vehicleData.filter(
                    (v: Vehicle) => v.availability_status === VehicleAvailabilityStatus.AVAILABLE || v.availability_status === 'AVAILABLE'
                );
                setVehicles(activeVehicles);
                setPackages(Array.isArray(packageData) ? packageData : []);
            } catch (err: any) {
                setError(err.message || 'Failed to load initial data');
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    const getAutoPackageId = (vehicleId: string) => {
        const vehicle = vehicles.find(v => String(v.id) === String(vehicleId));
        if (!vehicle) return '';

        if (vehicle.activePackage?.id) return String(vehicle.activePackage.id);
        if (vehicle.active_package_id) return String(vehicle.active_package_id);

        const match = packages.find(p => p.vehicle_type_id === vehicle.vehicle_type_id);
        return match ? String(match.id) : '';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setFormData(prev => {
            if (name === 'vehicleId') {
                return {
                    ...prev,
                    vehicleId: value,
                    packageId: getAutoPackageId(value)
                };
            }

            return {
                ...prev,
                [name]: value
            };
        });

        if (formErrors[name] || (name === 'vehicleId' && formErrors.packageId)) {
            setFormErrors(prev => ({
                ...prev,
                [name]: '',
                ...(name === 'vehicleId' ? { packageId: '' } : {})
            }));
        }
    };

    const selectedVehicle = useMemo(() => {
        return vehicles.find(v => String(v.id) === String(formData.vehicleId)) || null;
    }, [vehicles, formData.vehicleId]);

    const availablePackages = useMemo(() => {
        if (!selectedVehicle) return packages;
        return packages.filter(p => p.vehicle_type_id === selectedVehicle.vehicle_type_id);
    }, [packages, selectedVehicle]);

    const drivenKm = useMemo(() => {
        const totalKm = parseFloat(formData.totalKm);
        if (isNaN(totalKm) || totalKm < 0) return null;
        return totalKm;
    }, [formData.totalKm]);

    const selectedPackage = useMemo(() => {
        return packages.find(p => String(p.id) === String(formData.packageId)) || null;
    }, [packages, formData.packageId]);

    const calculationSummary = useMemo(() => {
        if (!selectedPackage) return null;

        const totalKm = drivenKm ?? 0;
        const totalTripDays = Math.max(1, parseInt(formData.totalTripDays) || 1);
        const otHours = Math.max(0, parseFloat(formData.otHours) || 0);
        const nightOutCount = Math.max(0, parseInt(formData.nightOutCount) || 0);

        const additionalDays = Math.max(0, totalTripDays - 1);
        const baseAmount = selectedPackage.base_amount ?? 0;
        const extraKmRate = selectedPackage.extra_km_rate ?? 0;
        const otRate = selectedPackage.ot_rate ?? 0;
        const nightOutRate = selectedPackage.night_out_rate ?? 0;
        const additionalDayRate = selectedPackage.additional_day_rate ?? 0;

        const effectiveKmLimit = selectedPackage.km_limit === null
            ? null
            : (selectedPackage.km_limit ?? 0) + additionalDays * (selectedPackage.additional_day_km_limit ?? 0);

        const extraKm = effectiveKmLimit === null
            ? 0
            : Math.max(0, totalKm - effectiveKmLimit);

        const baseCharge = selectedPackage.package_category === 'PER_KM'
            ? totalKm * extraKmRate
            : baseAmount;

        const extraKmCharge = selectedPackage.package_category === 'PER_KM'
            ? 0
            : extraKm * extraKmRate;

        const additionalDayCharge = additionalDays * additionalDayRate;
        const otAmount = otHours * otRate;
        const nightOutAmount = nightOutCount * nightOutRate;
        const finalAmount = baseCharge + extraKmCharge + additionalDayCharge + otAmount + nightOutAmount;

        return {
            totalKm,
            extraKm,
            baseCharge,
            extraKmCharge,
            additionalDayCharge,
            otAmount,
            nightOutAmount,
            finalAmount,
            currency: 'LKR'
        };
    }, [selectedPackage, drivenKm, formData.totalTripDays, formData.otHours, formData.nightOutCount]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        
        if (!formData.driverId) errors.driverId = 'Driver is required';
        if (!formData.vehicleId) errors.vehicleId = 'Vehicle is required';
        if (!formData.packageId) errors.packageId = 'Transport package is required';
        
        const totalKm = parseFloat(formData.totalKm);
        const tripDays = parseInt(formData.totalTripDays);
        const otHours = parseFloat(formData.otHours);
        const nights = parseInt(formData.nightOutCount);

        if (!formData.totalKm || isNaN(totalKm) || totalKm < 0) {
            errors.totalKm = 'Valid total KM is required';
        }

        if (isNaN(tripDays) || tripDays < 1) errors.totalTripDays = 'Must be at least 1 day';
        if (isNaN(otHours) || otHours < 0) errors.otHours = 'Cannot be negative';
        if (isNaN(nights) || nights < 0) errors.nightOutCount = 'Cannot be negative';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!validateForm()) {
            return;
        }

        try {
            const response = await createTripEntry(formData);
            setSuccessMessage(response?.message || 'Trip entry saved successfully.');
        } catch (err: any) {
            const message = err?.response?.data?.message || err.message || 'Failed to save trip entry';
            setError(message);
        }
    };

    const handleReset = () => {
        setFormData({
            driverId: '',
            vehicleId: '',
            packageId: '',
            totalKm: '',
            totalTripDays: '1',
            otHours: '0',
            nightOutCount: '0',
            hodSignatureFile: null
        });
        setFormErrors({});
        setError(null);
        setSuccessMessage(null);
    };

    if (loading) {
        return <div className="p-6">Loading form data...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Trip Entry (KM & Package)</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Enter the completed trip details for driver calculations.
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">
                    {error}
                </div>
            )}
            
            {successMessage && (
                <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                    {successMessage}
                </div>
            )}

            <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 md:p-8 space-y-8">
                    
                    {/* Selectors Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">
                            Assignment Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-medium text-slate-700">
                                    <UserIcon size={16} className="mr-2 text-slate-400" />
                                    Select Driver
                                </label>
                                <select
                                    name="driverId"
                                    value={formData.driverId}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.driverId ? 'border-red-300' : 'border-slate-300'}`}
                                >
                                    <option value="">-- Choose a driver --</option>
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.name || d.user?.name || `Driver ID: ${d.id}`} {d.nic_no ? `(${d.nic_no})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.driverId && <p className="text-red-500 text-xs mt-1">{formErrors.driverId}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-medium text-slate-700">
                                    <Car size={16} className="mr-2 text-slate-400" />
                                    Select Vehicle
                                </label>
                                <select
                                    name="vehicleId"
                                    value={formData.vehicleId}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.vehicleId ? 'border-red-300' : 'border-slate-300'}`}
                                >
                                    <option value="">-- Choose a vehicle --</option>
                                    {vehicles.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.vehicle_number} - {v.vehicleType?.name || v.vehicle_type || 'Unknown'}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.vehicleId && <p className="text-red-500 text-xs mt-1">{formErrors.vehicleId}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-medium text-slate-700">
                                    <Package size={16} className="mr-2 text-slate-400" />
                                    Transport Package
                                </label>
                                <select
                                    name="packageId"
                                    value={formData.packageId}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.packageId ? 'border-red-300' : 'border-slate-300'}`}
                                >
                                    <option value="">-- Choose a package --</option>
                                    {availablePackages.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.package_name}
                                        </option>
                                    ))}
                                </select>
                                {selectedVehicle && availablePackages.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1">No active packages for this vehicle type.</p>
                                )}
                                {formErrors.packageId && <p className="text-red-500 text-xs mt-1">{formErrors.packageId}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Meter Readings Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">
                            Distance Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                            
                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-medium text-slate-700">
                                    <MapPin size={16} className="mr-2 text-slate-400" />
                                    Total KM
                                </label>
                                <input
                                    type="number"
                                    name="totalKm"
                                    placeholder="e.g. 150"
                                    value={formData.totalKm}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.totalKm ? 'border-red-300' : 'border-slate-300'}`}
                                />
                                {formErrors.totalKm && <p className="text-red-500 text-xs mt-1">{formErrors.totalKm}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Allowances Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">
                            Time & Allowances
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-medium text-slate-700">
                                    <CalendarDays size={16} className="mr-2 text-slate-400" />
                                    Total Trip Days
                                </label>
                                <input
                                    type="number"
                                    name="totalTripDays"
                                    min="1"
                                    value={formData.totalTripDays}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.totalTripDays ? 'border-red-300' : 'border-slate-300'}`}
                                />
                                {formErrors.totalTripDays && <p className="text-red-500 text-xs mt-1">{formErrors.totalTripDays}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-medium text-slate-700">
                                    <Clock size={16} className="mr-2 text-slate-400" />
                                    OT Hours
                                </label>
                                <input
                                    type="number"
                                    name="otHours"
                                    min="0"
                                    step="0.5"
                                    value={formData.otHours}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.otHours ? 'border-red-300' : 'border-slate-300'}`}
                                />
                                {formErrors.otHours && <p className="text-red-500 text-xs mt-1">{formErrors.otHours}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-medium text-slate-700">
                                    <Moon size={16} className="mr-2 text-slate-400" />
                                    Night Out Count
                                </label>
                                <input
                                    type="number"
                                    name="nightOutCount"
                                    min="0"
                                    value={formData.nightOutCount}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.nightOutCount ? 'border-red-300' : 'border-slate-300'}`}
                                />
                                {formErrors.nightOutCount && <p className="text-red-500 text-xs mt-1">{formErrors.nightOutCount}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Calculation Summary Section */}
                    <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                        <div className="flex items-start">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mr-4 mt-1">
                                <Calculator size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-slate-800">Calculation Summary</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    Live breakdown based on the selected transport package and trip inputs.
                                </p>
                                {!selectedPackage ? (
                                    <div className="mt-4 text-sm text-slate-400">
                                        Select a transport package to see the calculation summary.
                                    </div>
                                ) : (
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center justify-between border border-slate-200 bg-white rounded-lg px-4 py-3">
                                            <span className="text-slate-600">Total KM</span>
                                            <span className="font-semibold text-slate-800">{calculationSummary ? calculationSummary.totalKm.toFixed(1) : '--'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border border-slate-200 bg-white rounded-lg px-4 py-3">
                                            <span className="text-slate-600">Extra KM</span>
                                            <span className="font-semibold text-slate-800">{calculationSummary ? calculationSummary.extraKm.toFixed(1) : '--'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border border-slate-200 bg-white rounded-lg px-4 py-3">
                                            <span className="text-slate-600">Base Amount</span>
                                            <span className="font-semibold text-slate-800">{calculationSummary ? formatCurrency(calculationSummary.baseCharge) : '--'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border border-slate-200 bg-white rounded-lg px-4 py-3">
                                            <span className="text-slate-600">Extra KM Amount</span>
                                            <span className="font-semibold text-slate-800">{calculationSummary ? formatCurrency(calculationSummary.extraKmCharge) : '--'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border border-slate-200 bg-white rounded-lg px-4 py-3">
                                            <span className="text-slate-600">OT Amount</span>
                                            <span className="font-semibold text-slate-800">{calculationSummary ? formatCurrency(calculationSummary.otAmount) : '--'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border border-slate-200 bg-white rounded-lg px-4 py-3">
                                            <span className="text-slate-600">Night Out Amount</span>
                                            <span className="font-semibold text-slate-800">{calculationSummary ? formatCurrency(calculationSummary.nightOutAmount) : '--'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border border-slate-200 bg-white rounded-lg px-4 py-3">
                                            <span className="text-slate-600">Additional Day Amount</span>
                                            <span className="font-semibold text-slate-800">{calculationSummary ? formatCurrency(calculationSummary.additionalDayCharge) : '--'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 rounded-lg px-4 py-3">
                                            <span className="text-emerald-700">Final Amount</span>
                                            <span className="font-bold text-emerald-700">{calculationSummary ? formatCurrency(calculationSummary.finalAmount) : '--'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-6 py-2.5 flex items-center bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCcw size={18} className="mr-2" />
                        Reset Data
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2.5 flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                    >
                        <Save size={18} className="mr-2" />
                        Save Entry
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TripEntry;